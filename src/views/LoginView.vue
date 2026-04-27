<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Basketball Analytics</h1>

      <div class="tabs">
        <button @click="mode = 'login'" :class="{ active: mode === 'login' }">Login</button>
        <button @click="mode = 'signup'" :class="{ active: mode === 'signup' }">Sign Up</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <input
          v-if="mode === 'signup'"
          v-model="name"
          type="text"
          placeholder="Name"
        />
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" required />
        <button type="submit">
          {{ mode === "login" ? "Login" : "Create Account" }}
        </button>
      </form>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();

const mode = ref<"login" | "signup">("login");
const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");

async function handleSubmit() {
  error.value = "";

  try {
    if (mode.value === "login") {
      await authStore.login(email.value, password.value);
    } else {
      await authStore.signup(name.value, email.value, password.value);
    }

    router.push("/dashboard");
  } catch (err: any) {
    error.value = err.message || "Authentication failed.";
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f5f7fb;
}
.auth-card {
  width: 340px;
  background: white;
  padding: 24px;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0,0,0,.08);
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.tabs button {
  flex: 1;
}
.active {
  font-weight: bold;
}
input, button {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  box-sizing: border-box;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>