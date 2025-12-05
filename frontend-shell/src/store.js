import { configureStore, createSlice } from "@reduxjs/toolkit";

// Helpers pour persister l'état d'auth dans les cookies (sans données sensibles)
const AUTH_COOKIE_NAME = "portal_auth_state";

// Helper pour obtenir un cookie par son nom
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Helper pour définir un cookie
function setCookie(name, value, days = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// Helper pour supprimer un cookie
function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

function loadAuthState() {
  try {
    const raw = getCookie(AUTH_COOKIE_NAME);
    if (!raw) return undefined;
    const parsed = JSON.parse(decodeURIComponent(raw));
    // on valide un minimum la structure
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.isAuthenticated === "boolean"
    ) {
      return parsed;
    }
  } catch {
    // ignore erreurs de parsing
  }
  return undefined;
}

function saveAuthState(state) {
  try {
    const toStore = {
      isAuthenticated: state.isAuthenticated,
      role: state.role,
      token: state.token || null,
      user: state.user && {
        email: state.user.email,
        firstName: state.user.firstName,
        lastName: state.user.lastName
      }
    };
    setCookie(AUTH_COOKIE_NAME, encodeURIComponent(JSON.stringify(toStore)), 7);
  } catch {
    // si les cookies sont indisponibles, on ne casse pas l'app
  }
}

const persistedAuth = typeof window !== "undefined" ? loadAuthState() : undefined;

// Slice d'authentification globale (utilisateur connecté + rôle)
const authSlice = createSlice({
  name: "auth",
  initialState:
    persistedAuth ?? {
      user: null,
      role: null, // 'ADMIN' | 'PROF' | 'STUDENT'
      token: null,
      isAuthenticated: false
    },
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.token = action.payload.token || null;
      state.isAuthenticated = true;
    },
    registerSuccess: (state, action) => {
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.token = action.payload.token || null;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      // Nettoyer explicitement le cookie
      try {
        deleteCookie(AUTH_COOKIE_NAME);
      } catch {
        // ignore erreurs d'accès aux cookies
      }
    }
  }
});

export const { loginSuccess, registerSuccess, logout } = authSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer
  }
});

// Persistance: on sauvegarde à chaque changement d'état auth
store.subscribe(() => {
  const state = store.getState().auth;
  if (state.isAuthenticated && state.user) {
    saveAuthState(state);
  } else {
    // Si l'utilisateur est déconnecté, supprimer complètement le cookie
    try {
      deleteCookie(AUTH_COOKIE_NAME);
    } catch {
      // ignore erreurs d'accès aux cookies
    }
  }
});

// Export des helpers de cookies pour utilisation dans d'autres composants
export function getAuthFromCookie() {
  return loadAuthState();
}
