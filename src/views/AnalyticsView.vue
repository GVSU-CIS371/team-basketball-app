<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-chart-line</v-icon>
            Analytics Dashboard
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="loading" class="mt-4">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <template v-else>
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Shooting Percentage Trend</v-card-title>
          <v-card-text>
            <canvas ref="trendChart"></canvas>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Shot Distribution</v-card-title>
          <v-card-text>
            <canvas ref="distributionChart"></canvas>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Overall Stats</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <v-list-item-title>Total Games</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ stats.totalGames }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Total Shots</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ stats.totalShots }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Overall FG%</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ stats.overallPercentage }}%</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Hot Zones</v-card-title>
          <v-card-text>
            <div class="hot-zones-court">
              <img src="../assets/court.jpg" class="court-bg-img" draggable="false" />
              <canvas ref="heatmapCanvas" class="heatmap-canvas" width="500" height="440" />
            </div>
            <div class="heatmap-legend">
              <span class="legend-swatch hot"></span> Hot (&ge;50%)
              <span class="legend-swatch neutral"></span> Neutral (35–49%)
              <span class="legend-swatch cold"></span> Cold (&lt;35%)
              <span class="legend-swatch nodata"></span> No Data
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/auth';

Chart.register(...registerables);

const authStore = useAuthStore();
const trendChart = ref<HTMLCanvasElement>();
const distributionChart = ref<HTMLCanvasElement>();
const heatmapCanvas = ref<HTMLCanvasElement>();

let trendChartInstance: Chart | null = null;
let distributionChartInstance: Chart | null = null;

const loading = ref(false);
const stats = ref({ totalGames: 0, totalShots: 0, overallPercentage: 0 });

// ── Zone map ──────────────────────────────────────────────────────────────────

type ZoneKey = 'paint' | 'leftCorner3' | 'rightCorner3' | 'leftBase' | 'rightBase' | 'leftMid' | 'rightMid' | 'left3' | 'right3' | 'top3';

const ZONE_LABELS: Record<ZoneKey, [number, number]> = {
  paint:        [250, 105],
  leftCorner3:  [ 72,  55],
  rightCorner3: [428,  55],
  leftBase:     [125,  55],
  rightBase:    [375,  55],
  leftMid:      [128, 158],
  rightMid:     [372, 158],
  left3:        [ 88, 290],
  right3:       [412, 290],
  top3:         [250, 350],
};

function isInCourt(px: number, py: number) {
  return px >= 0 && px < 500 && py >= 5 && py < 440;
}

function isInPaint(px: number, py: number) {
  return px >= 200 && px <= 300 && py >= 10 && py <= 190;
}

function isInside3pt(px: number, py: number) {
  if (py < 100) return px >= 50 && px <= 450;
  const dx = px - 250, dy = py - (-29);
  return dx * dx + dy * dy < 238 * 238;
}

function getZone(px: number, py: number): ZoneKey | null {
  if (!isInCourt(px, py)) return null;
  if (isInPaint(px, py)) return 'paint';

  // Corner zones — checked first so extreme-edge shots aren't dropped
  if (py < 115) {
    if (px < 155) return 'leftCorner3';
    if (px > 345) return 'rightCorner3';
  }

  if (isInside3pt(px, py)) {
    const angle = Math.atan2(px - 250, py - 50) * 180 / Math.PI;
    if (angle < -50) return 'leftBase';
    if (angle >  50) return 'rightBase';
    return angle < 0 ? 'leftMid' : 'rightMid';
  }
  if (px < 170) return 'left3';
  if (px > 330) return 'right3';
  return 'top3';
}

function zoneRGBA(attempts: number, made: number): [number, number, number, number] {
  if (attempts === 0) return [160, 160, 160, 55];
  const pct = made / attempts;
  if (pct >= 0.5)  return [210, 45,  45,  175]; // hot red
  if (pct >= 0.35) return [130, 130, 140, 140]; // neutral gray
  return [45, 85, 210, 175];                     // cold blue
}

function drawZoneMap(shots: { x: number; y: number; made: boolean }[]) {
  const canvas = heatmapCanvas.value;
  if (!canvas) return;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d')!;

  // Tally shots per zone
  const zones: Record<ZoneKey, { attempts: number; made: number }> = {
    paint:        { attempts: 0, made: 0 },
    leftCorner3:  { attempts: 0, made: 0 },
    rightCorner3: { attempts: 0, made: 0 },
    leftBase:     { attempts: 0, made: 0 },
    rightBase:    { attempts: 0, made: 0 },
    leftMid:      { attempts: 0, made: 0 },
    rightMid:     { attempts: 0, made: 0 },
    left3:        { attempts: 0, made: 0 },
    right3:       { attempts: 0, made: 0 },
    top3:         { attempts: 0, made: 0 },
  };

  for (const s of shots) {
    const zone = getZone((s.x / 100) * W, (s.y / 100) * H);
    if (zone) {
      zones[zone].attempts++;
      if (s.made) zones[zone].made++;
    }
  }

  // Fill every pixel with its zone color
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const zone = getZone(px, py);
      if (!zone) continue;
      const [r, g, b, a] = zoneRGBA(zones[zone].attempts, zones[zone].made);
      const i = (py * W + px) * 4;
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Draw zone borders
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;

  // Paint rectangle
  ctx.strokeRect(200, 10, 100, 180);

  // 3pt arc
  ctx.beginPath();
  ctx.moveTo(50, 100);
  ctx.arc(250, -29, 238, Math.atan2(100 - (-29), 50 - 250), Math.atan2(100 - (-29), 450 - 250));
  ctx.stroke();

  // Corner 3pt straight lines
  ctx.beginPath(); ctx.moveTo(50, 10); ctx.lineTo(50, 100); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(450, 10); ctx.lineTo(450, 100); ctx.stroke();

  // Vertical zone dividers inside 3pt arc
  ctx.setLineDash([4, 4]);
  // baseline divider left
  ctx.beginPath(); ctx.moveTo(200, 10); ctx.lineTo(200, 100); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(300, 10); ctx.lineTo(300, 100); ctx.stroke();
  ctx.setLineDash([]);

  // Zone labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [key, [lx, ly]] of Object.entries(ZONE_LABELS) as [ZoneKey, [number, number]][]) {
    const { attempts, made } = zones[key];
    if (attempts === 0) continue;
    const pct = Math.round((made / attempts) * 100);

    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 5;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText(`${pct}%`, lx, ly);
    ctx.font = '11px sans-serif';
    ctx.fillText(`${made}/${attempts}`, lx, ly + 17);
    ctx.shadowBlur = 0;
  }
}

// ── Date helper ───────────────────────────────────────────────────────────────

function formatDateLabel(ts: any): string {
  if (!ts) return '';
  let d: Date;
  if (ts.toDate) d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else if (typeof ts === 'string') {
    const [y, m, day] = ts.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

// ── Percentage label plugin for doughnut ─────────────────────────────────────

const percentageLabelPlugin = {
  id: 'percentageLabels',
  afterDatasetDraw(chart: any) {
    const { ctx, data } = chart;
    const total: number = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
    if (!total) return;
    chart.getDatasetMeta(0).data.forEach((arc: any, i: number) => {
      const val: number = data.datasets[0].data[i];
      const pct = Math.round((val / total) * 100);
      if (!pct) return;
      const pos = arc.tooltipPosition();
      ctx.save();
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pct}%`, pos.x, pos.y);
      ctx.restore();
    });
  }
};

// ── Load ──────────────────────────────────────────────────────────────────────

const loadAnalytics = async () => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const snap = await getDocs(query(collection(db, 'games'), where('user_id', '==', authStore.user.uid)));
    const games = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.date > b.date ? 1 : -1);

    stats.value.totalGames = games.length;

    const trendData: number[] = [], labels: string[] = [];
    const allShots: { x: number; y: number; made: boolean }[] = [];
    let grandAttempts = 0, grandMade = 0;

    for (const game of games) {
      const shotSnap = await getDocs(query(collection(db, 'shots'), where('game_id', '==', (game as any).id)));
      let ga = 0, gm = 0;
      shotSnap.docs.forEach(d => {
        const s = d.data();
        if (s.type === 'spot') {
          const att = s.attempted || 0, made = s.made || 0;
          ga += att; gm += made;
          for (let i = 0; i < made; i++) allShots.push({ x: s.x_coordinate, y: s.y_coordinate, made: true });
          for (let i = 0; i < att - made; i++) allShots.push({ x: s.x_coordinate, y: s.y_coordinate, made: false });
        } else {
          ga++; gm += s.made_boolean ? 1 : 0;
          allShots.push({ x: s.x_coordinate, y: s.y_coordinate, made: !!s.made_boolean });
        }
      });
      grandAttempts += ga; grandMade += gm;
      trendData.push(ga ? Math.round((gm / ga) * 100) : 0);
      labels.push(formatDateLabel((game as any).date));
    }

    stats.value.totalShots = grandAttempts;
    stats.value.overallPercentage = grandAttempts ? Math.round((grandMade / grandAttempts) * 100) : 0;

    loading.value = false;
    await nextTick();

    drawZoneMap(allShots);

    if (trendChart.value) {
      trendChartInstance?.destroy();
      trendChartInstance = new Chart(trendChart.value, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Shooting %',
            data: trendData,
            borderColor: '#FF6B35',
            backgroundColor: 'rgba(255,107,53,0.1)',
            tension: 0.4,
            pointRadius: 7, pointHoverRadius: 9,
            pointBackgroundColor: '#FF6B35',
            pointBorderColor: '#1a1a1a',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => v + '%' } } }
        }
      });
    }

    if (distributionChart.value) {
      distributionChartInstance?.destroy();
      distributionChartInstance = new Chart(distributionChart.value, {
        type: 'doughnut',
        plugins: [percentageLabelPlugin],
        data: {
          labels: ['Made', 'Missed'],
          datasets: [{ data: [grandMade, grandAttempts - grandMade], backgroundColor: ['#4CAF50', '#F44336'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }
  } catch (err) {
    console.error('Error loading analytics:', err);
    loading.value = false;
  }
};

onMounted(() => { loadAnalytics(); });
</script>

<style scoped>
.hot-zones-court {
  position: relative;
  width: 500px;
  height: 440px;
  border-radius: 4px;
  overflow: hidden;
}
.court-bg-img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
  display: block;
}
.heatmap-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 10px;
  font-size: 13px;
  color: #555;
}
.legend-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  margin-right: 4px;
  vertical-align: middle;
}
.legend-swatch.hot     { background: rgba(210, 45,  45,  0.85); }
.legend-swatch.neutral { background: rgba(130, 130, 140, 0.75); }
.legend-swatch.cold    { background: rgba(45,  85,  210, 0.85); }
.legend-swatch.nodata  { background: rgba(160, 160, 160, 0.4); border: 1px solid #ccc; }
</style>
