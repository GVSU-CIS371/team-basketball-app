<template>
  <v-container fluid class="pa-4">
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <template v-else>
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-account</v-icon>
            Profile Settings
          </v-card-title>

          <v-card-text>
            <v-form v-model="valid">
              <v-text-field
                v-model="profile.name"
                label="Display Name"
                :rules="[rules.required]"
                outlined
              ></v-text-field>

              <v-text-field
                v-model="profile.email"
                label="Email"
                type="email"
                readonly
                outlined
              ></v-text-field>

              <v-text-field
                v-model="profile.position"
                label="Preferred Position"
                placeholder="Point Guard, Shooting Guard, etc."
                outlined
              ></v-text-field>

              <v-text-field
                v-model="profile.team"
                label="Team/School"
                placeholder="Your team or school name"
                outlined
              ></v-text-field>

              <v-btn
                color="primary"
                @click="saveProfile"
                :disabled="!valid"
                :loading="saving"
              >
                Save Profile
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Career Statistics</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <v-list-item-title>Total Sessions</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ careerStats.totalSessions }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Total Shots Attempted</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ careerStats.totalShots }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Total Shots Made</v-list-item-title>
                <v-list-item-subtitle class="text-h6 text-success">{{ careerStats.totalMade }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Career FG%</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ careerStats.careerPercentage }}%</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Best Session</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ careerStats.bestSession }}%</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Practice Recommendations</v-card-title>
          <v-card-text>
            <v-alert
              v-for="(recommendation, index) in recommendations"
              :key="index"
              :type="recommendation.type"
              outlined
              class="mb-2"
            >
              {{ recommendation.message }}
            </v-alert>

            <div v-if="recommendations.length === 0" class="text-center">
              <v-icon size="64" color="grey">mdi-trophy</v-icon>
              <p class="mt-2 text-grey">Complete more sessions to get personalized recommendations!</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>Recent Activity</v-card-title>
          <v-card-text>
            <v-timeline density="compact">
              <v-timeline-item
                v-for="activity in recentActivity"
                :key="activity.id"
                :dot-color="activity.type === 'good' ? 'success' : 'info'"
                size="small"
              >
                <div>
                  <div class="text-h6">{{ activity.title }}</div>
                  <div class="text-caption">{{ formatDate(activity.date) }}</div>
                  <div>{{ activity.description }}</div>
                </div>
              </v-timeline-item>
            </v-timeline>

            <div v-if="recentActivity.length === 0" class="text-center">
              <p class="text-grey">No recent activity. Start tracking your shots!</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const valid = ref(false);
const saving = ref(false);
const loading = ref(false);

const profile = ref({
  name: '',
  email: '',
  position: '',
  team: ''
});

const careerStats = ref({
  totalSessions: 0,
  totalShots: 0,
  totalMade: 0,
  careerPercentage: 0,
  bestSession: 0
});

const recommendations = ref<Array<{type: string, message: string}>>([]);
const recentActivity = ref<any[]>([]);

const rules = {
  required: (value: string) => !!value || 'Required'
};

const loadProfile = async () => {
  if (!authStore.user) return;

  try {
    const profileDoc = await getDoc(doc(db, 'users', authStore.user.uid));
    if (profileDoc.exists()) {
      const data = profileDoc.data();
      profile.value = {
        name: data.name || '',
        email: data.email || authStore.user.email || '',
        position: data.position || '',
        team: data.team || ''
      };
    } else {
      profile.value.email = authStore.user.email || '';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
};

const saveProfile = async () => {
  if (!authStore.user) return;

  saving.value = true;
  try {
    await setDoc(doc(db, 'users', authStore.user.uid), {
      user_id: authStore.user.uid,
      name: profile.value.name,
      email: profile.value.email,
      position: profile.value.position,
      team: profile.value.team,
      updated_at: new Date()
    });

    alert('Profile saved successfully!');
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('Failed to save profile');
  } finally {
    saving.value = false;
  }
};

const loadCareerStats = async () => {
  if (!authStore.user) return;
  try {
    const q = query(collection(db, 'games'), where('user_id', '==', authStore.user.uid));
    const querySnapshot = await getDocs(q);
    let totalShots = 0, totalMade = 0, bestSession = 0;

    for (const gameDoc of querySnapshot.docs) {
      const shotSnap = await getDocs(query(collection(db, 'shots'), where('game_id', '==', gameDoc.id)));
      let ga = 0, gm = 0;
      shotSnap.docs.forEach(d => {
        const s = d.data();
        if (s.type === 'spot') { ga += s.attempted || 0; gm += s.made || 0; }
        else { ga++; gm += s.made_boolean ? 1 : 0; }
      });
      totalShots += ga;
      totalMade += gm;
      if (ga > 0) bestSession = Math.max(bestSession, Math.round((gm / ga) * 100));
    }

    careerStats.value = {
      totalSessions: querySnapshot.size,
      totalShots,
      totalMade,
      careerPercentage: totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : 0,
      bestSession
    };

    generateRecommendations();
  } catch (error) {
    console.error('Error loading career stats:', error);
  }
};

const loadRecentActivity = async () => {
  if (!authStore.user) return;
  try {
    const q = query(collection(db, 'games'), where('user_id', '==', authStore.user.uid));
    const querySnapshot = await getDocs(q);
    const rawGames = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    rawGames.sort((a, b) => {
      const toSec = (ts: any) => ts?.seconds ?? (typeof ts === 'string' ? new Date(ts).getTime() / 1000 : 0);
      return toSec(b.date) - toSec(a.date);
    });

    recentActivity.value = [];
    for (const game of rawGames.slice(0, 5)) {
      const shotSnap = await getDocs(query(collection(db, 'shots'), where('game_id', '==', game.id)));
      let ga = 0, gm = 0;
      shotSnap.docs.forEach(d => {
        const s = d.data();
        if (s.type === 'spot') { ga += s.attempted || 0; gm += s.made || 0; }
        else { ga++; gm += s.made_boolean ? 1 : 0; }
      });
      const pct = ga ? Math.round((gm / ga) * 100) : 0;
      recentActivity.value.push({
        id: game.id,
        title: game.session_type || 'Practice Session',
        description: `${gm}/${ga} shots (${pct}% FG)`,
        date: game.date,
        type: pct >= 50 ? 'good' : 'neutral'
      });
    }
  } catch (error) {
    console.error('Error loading recent activity:', error);
  }
};

const generateRecommendations = () => {
  recommendations.value = [];

  if (careerStats.value.totalSessions < 5) {
    recommendations.value.push({
      type: 'info',
      message: 'Track at least 5 sessions to unlock detailed analytics and recommendations!'
    });
  }

  if (careerStats.value.careerPercentage < 40) {
    recommendations.value.push({
      type: 'warning',
      message: 'Focus on form and take your time with each shot. Quality over quantity!'
    });
  }

  if (careerStats.value.careerPercentage > 60) {
    recommendations.value.push({
      type: 'success',
      message: 'Excellent shooting! Try challenging yourself with longer range shots.'
    });
  }

  if (careerStats.value.totalShots > 100 && careerStats.value.careerPercentage < 45) {
    recommendations.value.push({
      type: 'info',
      message: 'Consider practicing your shooting form with a coach or watching technique videos.'
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

onMounted(async () => {
  loading.value = true;
  await Promise.all([loadProfile(), loadCareerStats(), loadRecentActivity()]);
  loading.value = false;
});
</script>