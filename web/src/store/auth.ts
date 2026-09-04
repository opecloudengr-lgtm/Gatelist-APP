import { create } from "zustand";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setSession: (session: { user: User; accessToken: string; refreshToken: string }) => void;
  updateUser: (user: User) => void;
  clear: () => void;
}

const STORAGE_KEY = "gatelist.session";

function loadStored(): { user: User; accessToken: string; refreshToken: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const stored = loadStored();

export const useAuthStore = create<AuthState>((set) => ({
  user: stored?.user ?? null,
  accessToken: stored?.accessToken ?? null,
  refreshToken: stored?.refreshToken ?? null,
  hydrated: true,
  setSession: (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({ user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken });
  },
  updateUser: (user) => {
    set((state) => {
      if (state.accessToken && state.refreshToken) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, accessToken: state.accessToken, refreshToken: state.refreshToken }));
      }
      return { user };
    });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
