import { defineStore } from "pinia";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface AuthState {
  user: User | null;
  loading: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    loading: true
  }),

  actions: {
    init() {
      onAuthStateChanged(auth, (user) => {
        this.user = user;
        this.loading = false;
      });
    },

    async signup(name: string, email: string, password: string) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", cred.user.uid), {
        user_id: cred.user.uid,
        name,
        email
      });

      this.user = cred.user;
    },

    async login(email: string, password: string) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      this.user = cred.user;
    },

    async logout() {
      await signOut(auth);
      this.user = null;
    }
  }
});