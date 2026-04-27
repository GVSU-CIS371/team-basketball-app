import { createRouter, createWebHistory } from "vue-router";
import LoginView from "./views/LoginView.vue";
import DashboardView from "./views/DashboardView.vue";
import ShotTrackerView from "./views/ShotTrackerView.vue";
import AnalyticsView from "./views/AnalyticsView.vue";
import GamesView from "./views/GamesView.vue";
import ProfileView from "./views/ProfileView.vue";
import LeaderboardView from "./views/LeaderboardView.vue";
import { auth } from "./firebase";

const routes = [
  { path: "/", redirect: "/dashboard" },
  { path: "/login", component: LoginView },
  {
    path: "/dashboard",
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: "/shot-tracker",
    component: ShotTrackerView,
    meta: { requiresAuth: true }
  },
  {
    path: "/analytics",
    component: AnalyticsView,
    meta: { requiresAuth: true }
  },
  {
    path: "/games",
    component: GamesView,
    meta: { requiresAuth: true }
  },
  {
    path: "/profile",
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: "/leaderboard",
    component: LeaderboardView,
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const getCurrentUser = () =>
  new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => { unsub(); resolve(user); });
  });

router.beforeEach(async (to, _from, next) => {
  const user = await getCurrentUser();

  if (to.meta.requiresAuth && !user) {
    next("/login");
  } else if (to.path === "/login" && user) {
    next("/dashboard");
  } else {
    next();
  }
});

export default router;
