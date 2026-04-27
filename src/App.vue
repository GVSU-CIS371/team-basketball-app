<template>
  <v-app>
    <v-navigation-drawer
      v-if="authStore.user"
      v-model="drawer"
      permanent
      width="260"
      color="#0f0f0f"
    >
      <!-- Brand -->
      <div class="brand">
        <div class="brand-icon">
          <v-icon size="28" color="#FF6B35">mdi-basketball</v-icon>
        </div>
        <div class="brand-text">
          <span class="brand-top">Basketball</span>
          <span class="brand-bottom">Training Tracker</span>
        </div>
      </div>

      <v-divider color="#2a2a2a" class="mb-3"></v-divider>

      <!-- User -->
      <div class="user-row">
        <v-avatar color="#FF6B35" size="36">
          <v-icon color="white" size="20">mdi-account</v-icon>
        </v-avatar>
        <div class="user-info">
          <div class="user-email">{{ authStore.user?.email }}</div>
          <div class="user-role">Player</div>
        </div>
      </div>

      <v-divider color="#2a2a2a" class="mt-3 mb-2"></v-divider>

      <!-- Nav -->
      <v-list density="compact" nav class="px-2">
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
          base-color="#888"
          active-color="#FF6B35"
          class="nav-item mb-1"
        ></v-list-item>
      </v-list>

      <template v-slot:append>
        <v-divider color="#2a2a2a"></v-divider>
        <div class="pa-2">
          <v-list-item
            @click="logout"
            prepend-icon="mdi-logout"
            title="Logout"
            rounded="lg"
            base-color="#888"
            class="nav-item"
          ></v-list-item>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar v-if="authStore.user" elevation="0" color="white" border="b" height="60">
      <v-app-bar-title>
        <span class="page-title">{{ currentPageTitle }}</span>
      </v-app-bar-title>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from "./stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const drawer = ref(true);

authStore.init();

const navItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/dashboard' },
  { title: 'Shot Tracker', icon: 'mdi-basketball', to: '/shot-tracker' },
  { title: 'My Games', icon: 'mdi-calendar', to: '/games' },
  { title: 'Analytics', icon: 'mdi-chart-line', to: '/analytics' },
  { title: 'Leaderboard', icon: 'mdi-trophy', to: '/leaderboard' },
  { title: 'Profile', icon: 'mdi-account', to: '/profile' },
];

const currentPageTitle = computed(() => {
  const item = navItems.find(i => i.to === route.path);
  return item?.title ?? 'Basketball Training Tracker';
});

const logout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<style>
* {
  font-family: 'Inter', sans-serif;
}
</style>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 16px;
}

.brand-icon {
  background: rgba(255, 107, 53, 0.15);
  border-radius: 10px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-top {
  font-size: 15px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.3px;
}

.brand-bottom {
  font-size: 13px;
  font-weight: 600;
  color: #FF6B35;
  letter-spacing: -0.2px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
}

.user-info {
  overflow: hidden;
}

.user-email {
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.user-role {
  font-size: 11px;
  color: #666;
  margin-top: 1px;
}

.nav-item {
  font-size: 13px;
  font-weight: 500;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: #111;
}
</style>
