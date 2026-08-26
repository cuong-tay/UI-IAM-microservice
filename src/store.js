/* ═══════════════════════════════════════════════════════════════
   Store — State Management
   Gateway: http://localhost:8084
   ═══════════════════════════════════════════════════════════════ */

const SESSION_KEY = "admin-console-session";
const THEME_KEY = "admin-console-theme";
const ACCESS_CTX_KEY = "admin-console-access-context";

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
  editor: null,
  /* ── Access Context (permission-based rendering) ─────────── */
  accessContext: readAccessContext()
};

/* ── Access Context Management ─────────────────────────────── */

/**
 * Lưu access context sau khi nạp permission từ backend.
 * @param {{ user: object, isSystemAdmin: boolean, permissions: Array<{code:string, effect:string}> }} ctx
 */
export function setAccessContext(ctx) {
  state.accessContext = ctx;
  try {
    localStorage.setItem(ACCESS_CTX_KEY, JSON.stringify(ctx));
  } catch { /* ignore */ }
}

/** Xóa access context khi logout hoặc trước khi login mới */
export function clearAccessContext() {
  state.accessContext = { user: null, isSystemAdmin: false, permissions: [] };
  localStorage.removeItem(ACCESS_CTX_KEY);
}

/**
 * Kiểm tra quyền hiệu lực theo permission code.
 *
 * Quy tắc (theo FRONTEND_ROLE_PERMISSION_DATA_FLOW.md):
 *  1. isSystemAdmin → luôn true
 *  2. Tìm permission khớp exact hoặc wildcard (resource:*)
 *  3. Nếu có bất kỳ DENY → false (DENY ưu tiên)
 *  4. Nếu có ALLOW mà không DENY → true
 *  5. Không tìm thấy → false
 *
 * @param {string} permissionCode  Ví dụ: "users:create", "roles:approve"
 * @returns {boolean}
 */
export function can(permissionCode) {
  const ctx = state.accessContext;
  if (!ctx) return false;

  // System admin bypass
  if (ctx.isSystemAdmin) return true;

  const perms = ctx.permissions || [];
  if (!perms.length) return false;

  const code = (permissionCode || "").trim().toLowerCase();
  const parts = code.split(":");
  if (parts.length < 2) return false;

  const resource = parts[0];
  const action = parts[1];
  const exactCode = `${resource}:${action}`;
  const wildcardCode = `${resource}:*`;

  // Tìm tất cả permission khớp (exact hoặc wildcard)
  const matched = perms.filter(p => {
    const c = (p.code || "").trim().toLowerCase();
    return c === exactCode || c === wildcardCode;
  });

  if (!matched.length) return false;

  // DENY ưu tiên: nếu bất kỳ match nào là DENY → false
  if (matched.some(p => p.effect === "DENY")) return false;

  // Có ALLOW → true
  return matched.some(p => p.effect === "ALLOW");
}

/* ── Status ────────────────────────────────────────────────── */

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
  state.data = { users: [], roles: [], permissions: [], groups: [], organizations: [] };
  state.pagination = {};
  state.editor = null;
  localStorage.removeItem(SESSION_KEY);
  clearAccessContext();
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

function readAccessContext() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCESS_CTX_KEY) || "null");
    if (saved && saved.permissions) return saved;
  } catch { /* ignore */ }
  return { user: null, isSystemAdmin: false, permissions: [] };
}
