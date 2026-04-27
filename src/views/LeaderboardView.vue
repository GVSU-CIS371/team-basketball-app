<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-trophy</v-icon>
            Community Leaderboard
          </v-card-title>
          <v-card-subtitle>
            Top Shooters requires 20+ shots &bull; Most Active requires 3+ sessions
          </v-card-subtitle>
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
            <v-card-title>
              <v-icon left color="#FFD700">mdi-crown</v-icon>
              Top Shooters (Overall FG%)
            </v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="(player, index) in topShooters"
                  :key="player.user_id"
                  class="mb-2"
                >
                  <template v-slot:prepend>
                    <v-avatar :color="getRankColor(index + 1)" size="40">
                      <span class="text-white font-weight-bold">{{ index + 1 }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold">
                    {{ player.name || 'Anonymous Player' }}
                    <v-chip v-if="authStore.user && player.user_id === authStore.user.uid" size="x-small" color="primary" class="ml-1">You</v-chip>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ player.percentage }}% FG &bull; {{ player.made_shots || 0 }}/{{ player.total_shots || 0 }} shots
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-chip v-if="index < 3" :color="getRankColor(index + 1)" size="small">
                      <v-icon start size="small">{{ getRankIcon(index + 1) }}</v-icon>
                      {{ getRankText(index + 1) }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>

              <div v-if="topShooters.length === 0" class="text-center pa-4">
                <v-icon size="64" color="grey">mdi-account-group</v-icon>
                <p class="mt-2 text-grey">No data yet. Log 20+ shots to appear here!</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>
              <v-icon left color="orange">mdi-target</v-icon>
              Most Active Players
            </v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="(player, index) in mostActive"
                  :key="player.user_id"
                  class="mb-2"
                >
                  <template v-slot:prepend>
                    <v-avatar color="primary" size="40">
                      <span class="text-white font-weight-bold">{{ index + 1 }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold">
                    {{ player.name || 'Anonymous Player' }}
                    <v-chip v-if="authStore.user && player.user_id === authStore.user.uid" size="x-small" color="primary" class="ml-1">You</v-chip>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ player.total_shots || 0 }} shots in {{ player.session_count || 0 }} sessions
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-chip color="info" size="small">
                      {{ player.session_count ? Math.round((player.total_shots || 0) / player.session_count) : 0 }} avg/session
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>

              <div v-if="mostActive.length === 0" class="text-center pa-4">
                <v-icon size="64" color="grey">mdi-basketball</v-icon>
                <p class="mt-2 text-grey">Complete 3+ sessions to appear here!</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-chart-bar</v-icon>
              Your Ranking
            </v-card-title>
            <v-card-text v-if="authStore.user">
              <v-row>
                <v-col cols="12" md="4">
                  <v-card variant="outlined">
                    <v-card-text class="text-center">
                      <v-icon size="48" color="primary">mdi-percent</v-icon>
                      <div class="text-h4 mt-2">{{ userStats.rank ?? 'N/A' }}</div>
                      <div class="text-subtitle-2">FG% Rank</div>
                      <div class="text-caption">{{ userStats.percentage ?? 0 }}%</div>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" md="4">
                  <v-card variant="outlined">
                    <v-card-text class="text-center">
                      <v-icon size="48" color="success">mdi-basketball</v-icon>
                      <div class="text-h4 mt-2">{{ userStats.activityRank ?? 'N/A' }}</div>
                      <div class="text-subtitle-2">Activity Rank</div>
                      <div class="text-caption">{{ userStats.total_shots ?? 0 }} total shots</div>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" md="4">
                  <v-card variant="outlined">
                    <v-card-text class="text-center">
                      <v-icon size="48" color="warning">mdi-calendar-check</v-icon>
                      <div class="text-h4 mt-2">{{ userStats.session_count ?? 0 }}</div>
                      <div class="text-subtitle-2">Total Sessions</div>
                      <div class="text-caption">{{ userStats.made_shots ?? 0 }}/{{ userStats.total_shots ?? 0 }} made</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>

            <v-card-text v-else>
              <v-alert type="info" variant="outlined">
                <router-link to="/login">Sign in</router-link> to see your ranking!
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-fire</v-icon>
              Community Challenges
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col v-for="challenge in challenges" :key="challenge.id" cols="12" md="4">
                  <v-card variant="outlined">
                    <v-card-title class="text-h6">{{ challenge.title }}</v-card-title>
                    <v-card-text>
                      <p>{{ challenge.description }}</p>
                      <v-progress-linear
                        :model-value="challenge.progress"
                        height="20"
                        color="primary"
                        class="mt-2"
                        rounded
                      >
                        <template v-slot:default="{ value }">
                          <strong>{{ Math.ceil(value) }}%</strong>
                        </template>
                      </v-progress-linear>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const allPlayers = ref<any[]>([]);

const topShooters = computed(() =>
  allPlayers.value
    .filter(p => (p.total_shots || 0) >= 20)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 10)
);

const mostActive = computed(() =>
  allPlayers.value
    .filter(p => (p.session_count || 0) >= 3)
    .sort((a, b) => (b.total_shots || 0) - (a.total_shots || 0))
    .slice(0, 10)
);

const userStats = computed(() => {
  if (!authStore.user) return {};
  const player = allPlayers.value.find(p => p.user_id === authStore.user!.uid);
  if (!player) return {};
  const rank = topShooters.value.findIndex(p => p.user_id === authStore.user!.uid);
  const activityRank = mostActive.value.findIndex(p => p.user_id === authStore.user!.uid);
  return {
    ...player,
    rank: rank >= 0 ? rank + 1 : null,
    activityRank: activityRank >= 0 ? activityRank + 1 : null,
  };
});

const challenges = ref([
  {
    id: 1,
    title: '100 Shot Challenge',
    description: 'Complete a session with 100+ shot attempts',
    progress: 67,
  },
  {
    id: 2,
    title: 'Consistency King',
    description: 'Complete 5 sessions with 50%+ shooting',
    progress: 34,
  },
  {
    id: 3,
    title: 'Sharpshooter',
    description: 'Achieve 70%+ FG% in any single session',
    progress: 89,
  },
]);

const loadLeaderboards = async () => {
  loading.value = true;
  try {
    const snap = await getDocs(collection(db, 'leaderboards'));
    allPlayers.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error loading leaderboards:', error);
  } finally {
    loading.value = false;
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1: return '#FFD700';
    case 2: return '#C0C0C0';
    case 3: return '#CD7F32';
    default: return '#1976D2';
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return 'mdi-crown';
    case 2: return 'mdi-medal';
    case 3: return 'mdi-medal-outline';
    default: return '';
  }
};

const getRankText = (rank: number) => {
  switch (rank) {
    case 1: return 'GOLD';
    case 2: return 'SILVER';
    case 3: return 'BRONZE';
    default: return '';
  }
};

onMounted(() => {
  loadLeaderboards();
});
</script>
