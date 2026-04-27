<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Shot Tracker</v-card-title>
          <v-card-subtitle>Log shots then save the session to your games</v-card-subtitle>

          <v-card-text>
            <v-row>
              <v-col cols="12" md="8">
                <ShotChart
                  :shots="currentShots"
                  :mode="shotMode"
                  @court-click="handleCourtClick"
                  @remove-shot="removeShot"
                  @spot-detail="openSpotDetail"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-card elevation="2" class="mb-4">
                  <v-card-title>Current Session</v-card-title>
                  <v-card-text>
                    <v-text-field
                      v-model="sessionName"
                      label="Session Name"
                      placeholder="Practice Session"
                      variant="outlined"
                      density="compact"
                      class="mb-3"
                    />

                    <div class="mb-3">
                      <div class="text-caption text-medium-emphasis mb-1">Shot Mode</div>
                      <div class="mode-toggle">
                        <button :class="{ active: shotMode === 'individual' }" @click="shotMode = 'individual'">Individual</button>
                        <button :class="{ active: shotMode === 'spot' }" @click="shotMode = 'spot'">Spot Shooting</button>
                      </div>
                    </div>

                    <v-radio-group v-if="shotMode === 'individual'" v-model="shotResult" label="Next Shot:" density="compact" class="mb-2">
                      <v-radio label="Made" value="made" color="success" />
                      <v-radio label="Missed" value="missed" color="error" />
                    </v-radio-group>

                    <div v-else class="text-caption text-medium-emphasis mb-3">
                      Click a spot on the court to enter attempts &amp; makes.
                    </div>

                    <v-divider class="my-3" />

                    <div class="text-subtitle-2 mb-2">Session Stats</div>
                    <div class="d-flex justify-space-between mb-1">
                      <span>Total Shots:</span>
                      <strong>{{ totalAttempts }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-1">
                      <span>Made:</span>
                      <strong class="text-success">{{ totalMade }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-1">
                      <span>Missed:</span>
                      <strong class="text-error">{{ totalAttempts - totalMade }}</strong>
                    </div>
                    <div class="d-flex justify-space-between">
                      <span>FG%:</span>
                      <strong>{{ shootingPct }}%</strong>
                    </div>

                    <v-btn color="primary" block class="mt-4" @click="saveSession" :disabled="currentShots.length === 0">
                      Save Session
                    </v-btn>
                    <v-btn color="secondary" block variant="outlined" class="mt-2" @click="clearSession" :disabled="currentShots.length === 0">
                      Clear
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Spot input dialog -->
  <v-dialog v-model="showSpotDialog" max-width="340" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Log Shot Spot</v-card-title>
      <v-card-text class="px-6">
        <v-text-field v-model="spotAttempted" label="Shots Attempted" type="number" min="1" variant="outlined" density="compact" class="mb-3" />
        <v-text-field v-model="spotMade" label="Shots Made" type="number" min="0" variant="outlined" density="compact" />
        <div v-if="spotError" class="text-error text-caption mt-1">{{ spotError }}</div>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-btn color="primary" variant="flat" @click="saveSpot">Save</v-btn>
        <v-btn @click="showSpotDialog = false">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Spot detail dialog -->
  <v-dialog v-model="showSpotDetail" max-width="340">
    <v-card v-if="selectedSpot" rounded="lg">
      <v-card-title class="pt-5 px-6">Shot Spot Details</v-card-title>
      <v-card-text class="px-6">
        <div class="d-flex justify-space-around my-2">
          <div class="text-center">
            <div class="text-h5 font-weight-bold">{{ selectedSpot.attempted }}</div>
            <div class="text-caption text-medium-emphasis">Attempted</div>
          </div>
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-success">{{ selectedSpot.made }}</div>
            <div class="text-caption text-medium-emphasis">Made</div>
          </div>
          <div class="text-center">
            <div class="text-h5 font-weight-bold">{{ Math.round((selectedSpot.made / selectedSpot.attempted) * 100) }}%</div>
            <div class="text-caption text-medium-emphasis">FG%</div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-btn color="error" variant="flat" @click="removeShot(selectedSpot.id); showSpotDetail = false">Delete</v-btn>
        <v-spacer />
        <v-btn @click="showSpotDetail = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/auth';
import ShotChart from '../components/ShotChart.vue';

const authStore = useAuthStore();

const sessionName = ref('Practice Session');
const shotResult = ref('made');
const shotMode = ref<'individual' | 'spot'>('individual');
const currentShots = ref<any[]>([]);

const showSpotDialog = ref(false);
const pendingSpotCoords = ref({ x: 0, y: 0 });
const spotAttempted = ref('');
const spotMade = ref('');
const spotError = ref('');

const showSpotDetail = ref(false);
const selectedSpot = ref<any>(null);

const totalAttempts = computed(() => currentShots.value.reduce((acc, s) =>
  acc + (s.type === 'spot' ? (s.attempted || 0) : 1), 0));

const totalMade = computed(() => currentShots.value.reduce((acc, s) =>
  acc + (s.type === 'spot' ? (s.made || 0) : (s.made_boolean ? 1 : 0)), 0));

const shootingPct = computed(() =>
  totalAttempts.value ? Math.round((totalMade.value / totalAttempts.value) * 100) : 0);

function handleCourtClick(coords: { x: number; y: number }) {
  if (shotMode.value === 'spot') {
    pendingSpotCoords.value = coords;
    spotAttempted.value = '';
    spotMade.value = '';
    spotError.value = '';
    showSpotDialog.value = true;
    return;
  }

  currentShots.value.push({
    id: Date.now().toString(),
    x_coordinate: coords.x,
    y_coordinate: coords.y,
    made_boolean: shotResult.value === 'made',
    type: 'individual'
  });
}

function saveSpot() {
  const attempted = parseInt(spotAttempted.value);
  const made = parseInt(spotMade.value);
  if (!attempted || attempted < 1) { spotError.value = 'Enter a valid attempt count.'; return; }
  if (isNaN(made) || made < 0) { spotError.value = 'Enter a valid made count.'; return; }
  if (made > attempted) { spotError.value = "Made can't exceed attempted."; return; }

  currentShots.value.push({
    id: Date.now().toString(),
    x_coordinate: pendingSpotCoords.value.x,
    y_coordinate: pendingSpotCoords.value.y,
    attempted,
    made,
    type: 'spot'
  });

  showSpotDialog.value = false;
}

function removeShot(id: string) {
  currentShots.value = currentShots.value.filter(s => s.id !== id);
}

function openSpotDetail(spot: any) {
  selectedSpot.value = spot;
  showSpotDetail.value = true;
}

async function saveSession() {
  if (!authStore.user || currentShots.value.length === 0) return;

  try {
    const gameDoc = await addDoc(collection(db, 'games'), {
      user_id: authStore.user.uid,
      date: new Date().toISOString().split('T')[0],
      session_type: sessionName.value,
      total_shots: totalAttempts.value,
      made_shots: totalMade.value,
      missed_shots: totalAttempts.value - totalMade.value,
      shooting_percentage: shootingPct.value,
      created_at: serverTimestamp()
    });

    for (const shot of currentShots.value) {
      if (shot.type === 'spot') {
        await addDoc(collection(db, 'shots'), {
          game_id: gameDoc.id,
          user_id: authStore.user.uid,
          x_coordinate: shot.x_coordinate,
          y_coordinate: shot.y_coordinate,
          attempted: shot.attempted,
          made: shot.made,
          type: 'spot',
          timestamp: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'shots'), {
          game_id: gameDoc.id,
          user_id: authStore.user.uid,
          x_coordinate: shot.x_coordinate,
          y_coordinate: shot.y_coordinate,
          made_boolean: shot.made_boolean,
          type: 'individual',
          timestamp: serverTimestamp()
        });
      }
    }

    alert('Session saved!');
    clearSession();
  } catch (error: any) {
    alert('Failed to save session: ' + error.message);
  }
}

function clearSession() {
  currentShots.value = [];
  sessionName.value = 'Practice Session';
}
</script>

<style scoped>
.mode-toggle {
  display: flex;
  gap: 6px;
}
.mode-toggle button {
  flex: 1;
  padding: 6px 10px;
  border-radius: 20px;
  border: 2px solid #FF6B35;
  background: white;
  color: #FF6B35;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s;
}
.mode-toggle button.active {
  background: #FF6B35;
  color: white;
}
</style>
