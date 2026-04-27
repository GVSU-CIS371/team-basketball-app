<template>
  <div class="page">
    <header class="topbar">
      <h1>Personal Basketball Analytics</h1>
      <button @click="logout">Logout</button>
    </header>

    <section class="panel">
      <h2>Create New Game</h2>
      <form class="game-form" @submit.prevent="createGame">
        <input v-model="gameDate" type="date" required />
        <select v-model="sessionType" class="session-select">
          <option value="Practice">Practice</option>
          <option value="Game">Game</option>
          <option value="Warmup">Warmup</option>
          <option value="Drill">Drill</option>
        </select>
        <button type="submit">Add Game</button>
      </form>
    </section>

    <section class="panel">
      <h2>Your Games</h2>
      <ul v-if="games.length">
        <li v-for="game in games" :key="game.id">
          <button class="game-btn" @click="selectGame(game.id)">{{ formatDate(game.date) }}</button>
          <button class="delete-btn" @click="deleteGame(game.id)">Delete</button>
        </li>
      </ul>
      <p v-else>No games yet.</p>
    </section>

    <section v-if="selectedGameId" class="panel">
      <h2>Log Shots</h2>

      <!-- Mode toggle -->
      <div class="mode-toggle">
        <button :class="{ active: shotMode === 'individual' }" @click="shotMode = 'individual'">Individual Shots</button>
        <button :class="{ active: shotMode === 'spot' }" @click="shotMode = 'spot'">Spot Shooting</button>
      </div>

      <!-- Individual controls -->
      <div v-if="shotMode === 'individual'" class="shot-controls">
        <label><input type="radio" value="true" v-model="madeValue" /> Make</label>
        <label><input type="radio" value="false" v-model="madeValue" /> Miss</label>
        <span class="hint">Click a dot to remove it</span>
      </div>

      <!-- Spot controls -->
      <div v-else class="shot-controls">
        <span class="hint">Click the court to place a spot — enter attempts &amp; makes in the popup</span>
      </div>

      <ShotChart
        :shots="shots"
        :mode="shotMode"
        @court-click="handleCourtClick"
        @remove-shot="removeShot"
        @spot-detail="openSpotDetail"
      />
    </section>

    <section v-if="selectedGameId" class="panel">
      <h2>Game Stats</h2>
      <p>Total Shots: {{ totalAttempts }}</p>
      <p>Makes: {{ makes }}</p>
      <p>Shooting %: {{ shootingPercentage }}%</p>
      <div class="save-row">
        <button class="btn-save" @click="saveSession" :disabled="totalAttempts === 0">
          {{ saveSuccess ? '✓ Saved!' : 'Save Session' }}
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>Performance Trend</h2>
      <TrendChart :games="gamesWithPercentages" />
    </section>

    <section class="panel">
      <h2>Shared Leaderboard</h2>
      <ul v-if="leaderboard.length">
        <li v-for="entry in leaderboard" :key="entry.user_id">
          {{ entry.name }} - {{ entry.percentage }}% Shooter
        </li>
      </ul>
    </section>
  </div>

  <!-- Spot input dialog -->
  <div v-if="showSpotDialog" class="dialog-overlay" @click.self="showSpotDialog = false">
    <div class="dialog">
      <h3>Log Shot Spot</h3>
      <label>
        Shots Attempted
        <input type="number" v-model="spotAttempted" min="1" placeholder="e.g. 10" />
      </label>
      <label>
        Shots Made
        <input type="number" v-model="spotMade" min="0" placeholder="e.g. 7" />
      </label>
      <p v-if="spotError" class="error">{{ spotError }}</p>
      <div class="dialog-actions">
        <button class="btn-primary" @click="saveSpot">Save</button>
        <button @click="showSpotDialog = false">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Spot detail dialog -->
  <div v-if="selectedSpot" class="dialog-overlay" @click.self="selectedSpot = null">
    <div class="dialog">
      <h3>Shot Spot Details</h3>
      <div class="spot-stats">
        <div class="stat">
          <span class="stat-val">{{ selectedSpot.attempted }}</span>
          <span class="stat-lbl">Attempted</span>
        </div>
        <div class="stat">
          <span class="stat-val">{{ selectedSpot.made }}</span>
          <span class="stat-lbl">Made</span>
        </div>
        <div class="stat">
          <span class="stat-val">{{ Math.round((selectedSpot.made / selectedSpot.attempted) * 100) }}%</span>
          <span class="stat-lbl">FG%</span>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn-danger" @click="removeShot(selectedSpot.id); selectedSpot = null">Delete Spot</button>
        <button @click="selectedSpot = null">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  setDoc
} from "firebase/firestore";
import ShotChart from "../components/ShotChart.vue";
import TrendChart from "../components/TrendChart.vue";

const authStore = useAuthStore();
const router = useRouter();

const gameDate = ref("");
const sessionType = ref("Practice");
const selectedGameId = ref("");
const madeValue = ref("true");
const shotMode = ref<'individual' | 'spot'>('individual');
const userName = ref("");

const games = ref<any[]>([]);
const shots = ref<any[]>([]);
const leaderboard = ref<any[]>([]);

const showSpotDialog = ref(false);
const pendingSpotCoords = ref({ x: 0, y: 0 });
const spotAttempted = ref('');
const spotMade = ref('');
const spotError = ref('');
const selectedSpot = ref<any>(null);

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${mm}/${dd}/${y}`;
}

async function logout() {
  await authStore.logout();
  router.push("/login");
}

async function createGame() {
  if (!authStore.user) return;
  try {
    const docRef = await addDoc(collection(db, "games"), {
      user_id: authStore.user.uid,
      date: gameDate.value,
      session_type: sessionType.value,
      created_at: serverTimestamp()
    });
    gameDate.value = "";
    await fetchGames();
    await selectGame(docRef.id);
  } catch (error: any) {
    alert("Failed to create game: " + error.message);
  }
}

async function fetchGames() {
  if (!authStore.user) return;
  const q = query(
    collection(db, "games"),
    where("user_id", "==", authStore.user.uid),
    orderBy("date", "desc")
  );
  const snapshot = await getDocs(q);
  games.value = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function selectGame(gameId: string) {
  selectedGameId.value = gameId;
  await fetchShots(gameId);
}

async function deleteGame(gameId: string) {
  await deleteDoc(doc(db, "games", gameId));
  if (selectedGameId.value === gameId) {
    selectedGameId.value = "";
    shots.value = [];
  }
  await fetchGames();
  await updateLeaderboard();
  await buildTrendData();
}

async function handleCourtClick(coords: { x: number; y: number }) {
  if (!selectedGameId.value) return;

  if (shotMode.value === 'spot') {
    pendingSpotCoords.value = coords;
    spotAttempted.value = '';
    spotMade.value = '';
    spotError.value = '';
    showSpotDialog.value = true;
    return;
  }

  await addDoc(collection(db, "shots"), {
    game_id: selectedGameId.value,
    user_id: authStore.user!.uid,
    x_coordinate: coords.x,
    y_coordinate: coords.y,
    made_boolean: madeValue.value === "true",
    type: 'individual',
    timestamp: serverTimestamp()
  });
  await fetchShots(selectedGameId.value);
  await updateLeaderboard();
}

async function saveSpot() {
  const attempted = parseInt(spotAttempted.value);
  const made = parseInt(spotMade.value);

  if (!attempted || attempted < 1) { spotError.value = "Enter a valid attempt count."; return; }
  if (isNaN(made) || made < 0) { spotError.value = "Enter a valid made count."; return; }
  if (made > attempted) { spotError.value = "Made can't exceed attempted."; return; }

  await addDoc(collection(db, "shots"), {
    game_id: selectedGameId.value,
    user_id: authStore.user!.uid,
    x_coordinate: pendingSpotCoords.value.x,
    y_coordinate: pendingSpotCoords.value.y,
    attempted,
    made,
    type: 'spot',
    timestamp: serverTimestamp()
  });

  showSpotDialog.value = false;
  await fetchShots(selectedGameId.value);
  await updateLeaderboard();
}

async function removeShot(shotId: string) {
  await deleteDoc(doc(db, "shots", shotId));
  await fetchShots(selectedGameId.value);
  await updateLeaderboard();
}

function openSpotDetail(spot: any) {
  selectedSpot.value = spot;
}

async function fetchShots(gameId: string) {
  const q = query(collection(db, "shots"), where("game_id", "==", gameId));
  const snapshot = await getDocs(q);
  shots.value = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

function countStats(shotList: any[]) {
  let attempts = 0, made = 0;
  for (const s of shotList) {
    if (s.type === 'spot') { attempts += s.attempted || 0; made += s.made || 0; }
    else { attempts += 1; made += s.made_boolean ? 1 : 0; }
  }
  return { attempts, made };
}

const saveSuccess = ref(false);

async function saveSession() {
  if (!selectedGameId.value) return;
  await setDoc(doc(db, "games", selectedGameId.value), {
    session_type: sessionType.value,
    total_shots: totalAttempts.value,
    made_shots: makes.value,
    missed_shots: totalAttempts.value - makes.value,
    shooting_percentage: shootingPercentage.value
  }, { merge: true });
  await updateLeaderboard();
  await buildTrendData();
  saveSuccess.value = true;
  setTimeout(() => { saveSuccess.value = false; }, 2000);
}

const makes = computed(() => countStats(shots.value).made);
const totalAttempts = computed(() => countStats(shots.value).attempts);
const shootingPercentage = computed(() => {
  const t = totalAttempts.value;
  return t ? Math.round((makes.value / t) * 100) : 0;
});

const gamesWithPercentages = ref<any[]>([]);

async function buildTrendData() {
  const output: any[] = [];
  for (const game of games.value) {
    const q = query(collection(db, "shots"), where("game_id", "==", game.id));
    const snapshot = await getDocs(q);
    const { attempts, made } = countStats(snapshot.docs.map((d) => d.data()));
    output.push({ date: formatDate(game.date), percentage: attempts ? Math.round((made / attempts) * 100) : 0 });
  }
  gamesWithPercentages.value = output.reverse();
}

async function updateLeaderboard() {
  if (!authStore.user) return;
  const gamesSnap = await getDocs(query(collection(db, "games"), where("user_id", "==", authStore.user.uid)));
  let totalAttempts = 0, totalMade = 0;

  for (const gameDoc of gamesSnap.docs) {
    const shotSnap = await getDocs(query(collection(db, "shots"), where("game_id", "==", gameDoc.id)));
    const { attempts, made } = countStats(shotSnap.docs.map((d) => d.data()));
    totalAttempts += attempts;
    totalMade += made;
  }

  if (totalAttempts === 0) {
    await deleteDoc(doc(db, "leaderboards", authStore.user.uid));
  } else {
    const userDoc = await getDoc(doc(db, "users", authStore.user.uid));
    const displayName = userDoc.exists() ? (userDoc.data().name || authStore.user.email) : authStore.user.email;
    await setDoc(doc(db, "leaderboards", authStore.user.uid), {
      user_id: authStore.user.uid,
      name: displayName,
      percentage: Math.round((totalMade / totalAttempts) * 100),
      total_shots: totalAttempts,
      made_shots: totalMade,
      session_count: gamesSnap.size
    });
  }

  await fetchLeaderboard();
}

async function fetchLeaderboard() {
  const snapshot = await getDocs(collection(db, "leaderboards"));
  leaderboard.value = snapshot.docs.map((d) => d.data()).sort((a: any, b: any) => b.percentage - a.percentage);
}

onMounted(async () => {
  await fetchGames();
  await fetchLeaderboard();
  await buildTrendData();
});
</script>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel {
  background: #fff;
  margin-top: 20px;
  padding: 20px;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,.06);
}
.game-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.session-select {
  padding: 6px 10px;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}
.save-row {
  margin-top: 14px;
}
.btn-save {
  padding: 10px 28px;
  background: #FF6B35;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) {
  background: #e05520;
}
.btn-save:disabled {
  opacity: 0.5;
  cursor: default;
}
.game-btn { margin-right: 10px; }
.delete-btn { background: #d9534f; color: white; }

.mode-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.mode-toggle button {
  padding: 6px 16px;
  border-radius: 20px;
  border: 2px solid #ddd;
  background: white;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s;
}
.mode-toggle button.active {
  background: #FF6B35;
  border-color: #FF6B35;
  color: white;
}

.shot-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}
.hint {
  font-size: 13px;
  color: #888;
}

/* Dialogs */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  background: white;
  border-radius: 16px;
  padding: 28px;
  width: 320px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.dialog h3 {
  margin: 0 0 20px;
  font-size: 18px;
}
.dialog label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 14px;
}
.dialog input[type="number"] {
  padding: 8px 12px;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}
.dialog input[type="number"]:focus {
  border-color: #FF6B35;
}
.dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.dialog-actions button {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1.5px solid #ddd;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary {
  background: #FF6B35;
  color: white;
  border-color: #FF6B35 !important;
}
.btn-danger {
  background: #d9534f;
  color: white;
  border-color: #d9534f !important;
}
.error {
  color: #d9534f;
  font-size: 13px;
  margin: 0;
}

.spot-stats {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 8px;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.stat-val {
  font-size: 24px;
  font-weight: 700;
}
.stat-lbl {
  font-size: 12px;
  color: #888;
}
</style>
