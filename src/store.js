/* ═══════════════════════════════════════════════════════════════
   Store — State Management
   Gateway: http://localhost:8084
   ═══════════════════════════════════════════════════════════════ */

const SESSION_KEY = "admin-console-session";
const THEME_KEY = "admin-console-theme";

export const state = {
  authMode: "login",
  section: "users",
  status: null,
  searchQuery: "",
  theme: readTheme(),
  session: readSession(),
  pagination: {},
  data: {
    users: [],
    roles: [],
    permissions: [],
    groups: [],
    organizations: []
  },
  editor: null
};

export function setStatus(type, message) {
  state.status = message ? { type, message } : null;
}

export function setSearchQuery(query) {
  state.searchQuery = query || "";
}

export function toggleTheme() {
  const newTheme = state.theme === "dark" ? "light" : "dark";
  state.theme = newTheme;
  localStorage.setItem(THEME_KEY, newTheme);
  document.documentElement.setAttribute("data-theme", newTheme);
}

export function initTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
}

export function saveSession(session) {
  state.session = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
}

export function updateData(partial) {
  state.data = { ...state.data, ...partial };
}

export function updatePagination(partial) {
  state.pagination = { ...state.pagination, ...partial };
}

function readTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  // Check system preference
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}
