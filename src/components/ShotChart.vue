<template>
  <div class="court-wrapper">
    <div class="court" :class="{ readonly: props.readonly }" @click="handleCourtClick">
      <img src="../assets/court.jpg" class="court-img" draggable="false" />

      <!-- Individual shot markers -->
      <div
        v-for="shot in individualShots"
        :key="shot.id"
        class="shot-marker"
        :class="{ made: shot.made_boolean, missed: !shot.made_boolean }"
        :style="{ left: shot.x_coordinate + '%', top: shot.y_coordinate + '%' }"
        title="Click to remove"
        @click.stop="$emit('remove-shot', shot.id)"
      ></div>

      <!-- Spot markers -->
      <div
        v-for="spot in spotShots"
        :key="spot.id"
        class="spot-marker"
        :style="{ left: spot.x_coordinate + '%', top: spot.y_coordinate + '%', background: spotColor(spot) }"
        title="Click for details"
        @click.stop="$emit('spot-detail', spot)"
      >
        <span class="spot-label">{{ spot.made }}/{{ spot.attempted }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  shots: any[];
  mode: 'individual' | 'spot';
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'court-click', coords: { x: number; y: number }): void;
  (e: 'remove-shot', id: string): void;
  (e: 'spot-detail', spot: any): void;
}>();

const individualShots = computed(() => props.shots.filter(s => s.type !== 'spot'));
const spotShots = computed(() => props.shots.filter(s => s.type === 'spot'));

function spotColor(spot: any) {
  const pct = spot.attempted ? spot.made / spot.attempted : 0;
  if (pct >= 0.5) return '#4caf50';
  if (pct >= 0.35) return '#ff9800';
  return '#f44336';
}

function handleCourtClick(event: MouseEvent) {
  if (props.readonly) return;
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  emit('court-click', { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
}
</script>

<style scoped>
.court-wrapper {
  display: flex;
  justify-content: center;
}

.court {
  position: relative;
  width: 500px;
  height: 440px;
  cursor: crosshair;
  border-radius: 4px;
  overflow: hidden;
}
.court.readonly {
  cursor: default;
}

.court-img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

.shot-marker {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.5);
  cursor: pointer;
  transition: transform 0.1s;
}

.shot-marker:hover {
  transform: translate(-50%, -50%) scale(1.4);
}

.made { background: #4caf50; }
.missed { background: #f44336; }

.spot-marker {
  position: absolute;
  min-width: 36px;
  height: 24px;
  border-radius: 12px;
  transform: translate(-50%, -50%);
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
  padding: 0 6px;
}

.spot-marker:hover {
  transform: translate(-50%, -50%) scale(1.15);
}

.spot-label {
  font-size: 10px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
}
</style>
