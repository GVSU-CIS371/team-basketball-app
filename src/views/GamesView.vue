<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-calendar</v-icon>
            My Games & Practice Sessions
          </v-card-title>

          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="games"
              :items-per-page="10"
              class="elevation-1"
            >
              <template v-slot:item.date="{ item }">
                {{ formatDate(item.date) }}
              </template>

              <template v-slot:item.shooting_percentage="{ item }">
                <v-chip
                  :color="getPercentageColor(item.shooting_percentage)"
                  dark
                  small
                >
                  {{ item.shooting_percentage }}%
                </v-chip>
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon
                  small
                  @click="viewGame(item)"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  color="error"
                  @click="deleteGame(item)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Game Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="800">
      <v-card v-if="selectedGame">
        <v-card-title>
          {{ selectedGame.session_type }} - {{ formatDate(selectedGame.date) }}
        </v-card-title>

        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-list>
                <v-list-item>
                  <v-list-item-title>Total Shots</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedGame.total_shots }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Made</v-list-item-title>
                  <v-list-item-subtitle class="text-success">{{ selectedGame.made_shots }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Missed</v-list-item-title>
                  <v-list-item-subtitle class="text-error">{{ selectedGame.missed_shots }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>FG%</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedGame.shooting_percentage }}%</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="6">
              <ShotChart :shots="gameShots" mode="individual" :readonly="true" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="detailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/auth';
import ShotChart from '../components/ShotChart.vue';

const authStore = useAuthStore();

const games = ref<any[]>([]);
const loading = ref(false);
const detailsDialog = ref(false);
const selectedGame = ref<any>(null);
const gameShots = ref<any[]>([]);

const headers = [
  { title: 'Date', key: 'date' },
  { title: 'Session Type', key: 'session_type' },
  { title: 'Total Shots', key: 'total_shots' },
  { title: 'Made', key: 'made_shots' },
  { title: 'Missed', key: 'missed_shots' },
  { title: 'FG%', key: 'shooting_percentage' },
  { title: 'Actions', key: 'actions', sortable: false }
];

const loadGames = async () => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const q = query(
      collection(db, 'games'),
      where('user_id', '==', authStore.user.uid),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const raw = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    games.value = await Promise.all(raw.map(async (game: any) => {
      if (game.shooting_percentage !== undefined) return game;
      const shotSnap = await getDocs(query(collection(db, 'shots'), where('game_id', '==', game.id)));
      let attempts = 0, made = 0;
      shotSnap.docs.forEach(d => {
        const s = d.data();
        if (s.type === 'spot') { attempts += s.attempted || 0; made += s.made || 0; }
        else { attempts++; made += s.made_boolean ? 1 : 0; }
      });
      return {
        ...game,
        session_type: game.session_type || 'Practice',
        total_shots: attempts,
        made_shots: made,
        missed_shots: attempts - made,
        shooting_percentage: attempts ? Math.round((made / attempts) * 100) : 0
      };
    }));
  } catch (error) {
    console.error('Error loading games:', error);
  } finally {
    loading.value = false;
  }
};

const viewGame = async (game: any) => {
  selectedGame.value = game;

  // Load shots for this game
  try {
    const q = query(
      collection(db, 'shots'),
      where('game_id', '==', game.id)
    );

    const querySnapshot = await getDocs(q);
    gameShots.value = [];

    querySnapshot.forEach((doc) => {
      gameShots.value.push({
        id: doc.id,
        ...doc.data()
      });
    });

    detailsDialog.value = true;
  } catch (error) {
    console.error('Error loading shots:', error);
  }
};

const deleteGame = async (game: any) => {
  if (!confirm('Are you sure you want to delete this session?')) return;

  try {
    // Delete all shots for this game
    const q = query(
      collection(db, 'shots'),
      where('game_id', '==', game.id)
    );

    const querySnapshot = await getDocs(q);
    const deletePromises: Promise<void>[] = [];

    querySnapshot.forEach((shotDoc) => {
      deletePromises.push(deleteDoc(doc(db, 'shots', shotDoc.id)));
    });

    await Promise.all(deletePromises);

    // Delete the game
    await deleteDoc(doc(db, 'games', game.id));
    await loadGames();
    await updateLeaderboard();
  } catch (error) {
    console.error('Error deleting game:', error);
    alert('Failed to delete game');
  }
};

const updateLeaderboard = async () => {
  if (!authStore.user) return;
  const gamesSnap = await getDocs(query(collection(db, 'games'), where('user_id', '==', authStore.user.uid)));
  let totalAttempts = 0, totalMade = 0;
  for (const gameDoc of gamesSnap.docs) {
    const shotSnap = await getDocs(query(collection(db, 'shots'), where('game_id', '==', gameDoc.id)));
    shotSnap.docs.forEach(d => {
      const s = d.data();
      if (s.type === 'spot') { totalAttempts += s.attempted || 0; totalMade += s.made || 0; }
      else { totalAttempts++; totalMade += s.made_boolean ? 1 : 0; }
    });
  }
  if (totalAttempts === 0) {
    await deleteDoc(doc(db, 'leaderboards', authStore.user.uid));
  } else {
    const userDoc = await getDoc(doc(db, 'users', authStore.user.uid));
    const displayName = userDoc.exists() ? (userDoc.data().name || authStore.user.email) : authStore.user.email;
    await setDoc(doc(db, 'leaderboards', authStore.user.uid), {
      user_id: authStore.user.uid,
      name: displayName,
      percentage: Math.round((totalMade / totalAttempts) * 100),
      total_shots: totalAttempts,
      made_shots: totalMade,
      session_count: gamesSnap.docs.length
    });
  }
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return '';
  let d: Date;
  if (timestamp.toDate) d = timestamp.toDate();
  else if (timestamp.seconds) d = new Date(timestamp.seconds * 1000);
  else if (typeof timestamp === 'string') {
    const [y, m, day] = timestamp.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
};

const getPercentageColor = (percentage: number) => {
  if (percentage >= 50) return 'success';
  if (percentage >= 35) return 'warning';
  return 'error';
};

onMounted(() => {
  loadGames();
});
</script>