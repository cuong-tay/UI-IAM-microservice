/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Main Controller â€” Event handling & Business logic
   Entry point: loaded by index.html as ES Module
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

import * as api from "./api-client.js";
import { renderAdminView } from "./views/admin-view.js";
import { renderAuthView } from "./views/auth-view.js";
import {
  clearSession, saveSession, setStatus, setSearchQuery,
  toggleTheme, initTheme, can, clearAccessContext,
  state, updateData, updatePagination
} from "./store.js";

const app = document.querySelector("#app");
const pendingActions = new Set();
let accessSyncPromise = null;

initTheme();
render();
bootstrap();

app.addEventListener("click", handleClick);
app.addEventListener("submit", handleSubmit);
app.addEventListener("input", handleInput);
window.addEventListener("keydown", handleKeydown);
window.addEventListener("focus", () => { void synchronizeAccessContext(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void synchronizeAccessContext();
});
window.setInterval(() => { void synchronizeAccessContext(); }, 30_000);

/* â”€â”€ Bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function bootstrap() {
  if (!state.session?.accessToken) return;
  // Náº¡p access context (permission + user profile) trÆ°á»›c khi load data
  await api.loadAccessContext();
  await loadAdminData();
}

/* â”€â”€ Input Handler (Live Search) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function handleInput(event) {
  const target = event.target;
  if (target.dataset.action === "search-input") {
    setSearchQuery(target.value);
    render();
    // Maintain input focus and cursor position after re-render
    const newSearchInput = app.querySelector('[data-action="search-input"]');
    if (newSearchInput) {
      newSearchInput.focus();
      const valLen = newSearchInput.value.length;
      newSearchInput.setSelectionRange(valLen, valLen);
    }
  }
}

/* â”€â”€ Keydown Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function handleKeydown(event) {
  if (event.key === "Escape" && state.editor) {
    state.editor = null;
    render();
  }
}

/* â”€â”€ Click Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  try {
    // Navigation
    if (action === "toggle-theme")   { toggleTheme(); return render(); }
    if (action === "switch-auth")    { state.authMode = target.dataset.mode; setStatus(null); return render(); }
    if (action === "logout")         return logoutUser();
    if (action === "switch-section") { state.section = target.dataset.section; state.editor = null; setSearchQuery(""); return render(); }
    if (action === "refresh-all")    return refreshAll();
    if (action === "close-editor")   { state.editor = null; return render(); }
    if (action === "dismiss-status") { setStatus(null); return render(); }
    if (action === "clear-search")   { setSearchQuery(""); return render(); }

    // Create (with permission check)
    if (action === "create-user")         { if (!can("users:create")) return; state.editor = { kind: "createUser", item: {} }; return render(); }
    if (action === "create-role")         { if (!can("roles:create")) return; state.editor = { kind: "role", item: {} }; return render(); }
    if (action === "create-group")        { if (!can("groups:create")) return; state.editor = { kind: "group", item: {} }; return render(); }
    if (action === "create-organization") { if (!can("organizations:create")) return; state.editor = { kind: "organization", item: {} }; return render(); }

    // Edit (with permission check)
    if (action.startsWith("edit-")) return openEditor(action, id);

    // Delete (with permission check)
    if (action.startsWith("delete-")) return destroyItem(action, id);

    // User actions
    if (action === "lock-user")        { if (!can("users:update")) return; return runExclusiveAction(`${action}:${id}`, target, () => lockUserAction(id)); }
    if (action === "unlock-user")      { if (!can("users:update")) return; return runExclusiveAction(`${action}:${id}`, target, () => unlockUserAction(id)); }
    if (action === "user-groups")      return openUserGroups(id);
    if (action === "user-permissions") return openUserPermissions(id);

    // Role actions
    if (action === "role-permissions") { if (!can("roles:approve")) return; return openRolePermissions(id); }
    if (action === "role-groups")      return openRoleGroups(id);

    // Group actions
    if (action === "group-users") { if (!can("groups:approve")) return; return openGroupUsers(id); }
    if (action === "group-roles") { if (!can("groups:approve")) return; return openGroupRoles(id); }

    // Permission actions
    if (action === "toggle-permission-effect") { if (!can("permissions:update")) return; return runExclusiveAction(`${action}:${id}`, target, () => togglePermEffect(id)); }
    if (action === "permission-roles")         return openPermissionRoles(id);

    // Organization actions
    if (action === "org-tree") return openOrgTree(id);

    // Import/Export
    if (action === "export-users") { if (!can("users:export")) return; return exportUsersAction(); }
    if (action === "import-users") { if (!can("users:import")) return; return triggerImportDialog(); }

    // Pagination
    if (action === "prev-page") return changePage(-1);
    if (action === "next-page") return changePage(1);

  } catch (error) {
    handleError(error);
  }
}

/* â”€â”€ Submit Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;

  try {
    if (form.dataset.form === "login")           return await loginUser(form);
    if (form.id === "create-user-form")           return await saveNewUser(form);
    if (form.id === "user-form")                  return await saveUser(form);
    if (form.id === "role-form")                  return await saveRole(form);
    if (form.id === "group-form")                 return await saveGroup(form);
    if (form.id === "organization-form")          return await saveOrganization(form);
    if (form.id === "role-permissions-form")       return await saveRolePermissions(form);
    if (form.id === "group-users-form")           return await saveGroupUsers(form);
    if (form.id === "group-roles-form")           return await saveGroupRoles(form);
  } catch (error) {
    handleError(error);
  } finally {
    if (button) button.disabled = false;
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AUTH ACTIONS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function loginUser(form) {
  clearSession();
  clearAccessContext();
  const formData = readForm(form);
  const data = await api.login(formData);

  if (data.mfaRequired) {
    throw new Error("TÃ i khoáº£n yÃªu cáº§u xÃ¡c thá»±c 2 bÆ°á»›c (MFA). Chá»©c nÄƒng nÃ y chÆ°a Ä‘Æ°á»£c há»— trá»£ trÃªn giao diá»‡n.");
  }

  saveSession(data);

  if (data.mustChangePassword) {
    setStatus("warning", "TÃ i khoáº£n cáº§n Ä‘á»•i máº­t kháº©u láº§n Ä‘áº§u. Vui lÃ²ng Ä‘á»•i máº­t kháº©u.");
  }

  // Náº¡p access context: decode JWT â†’ load permissions + user profile
  await api.loadAccessContext();

  await loadAdminData("ÄÄƒng nháº­p thÃ nh cÃ´ng.");
}

async function logoutUser() {
  try {
    if (state.session?.accessToken && state.session?.refreshToken) {
      await api.logout(state.session.accessToken, state.session.refreshToken);
    }
  } catch { /* Ignore logout API errors */ }
  clearSession();
  state.editor = null;
  setStatus("success", "ÄÃ£ Ä‘Äƒng xuáº¥t.");
  render();
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DATA LOADING â€” Chá»‰ load module cÃ³ quyá»n
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function loadAdminData(message) {
  try {
    // Chá»‰ gá»i API cho module mÃ  user cÃ³ quyá»n xem (theo tÃ i liá»‡u má»¥c 9 bÆ°á»›c 6)
    const loaders = [];
    const keys = [];

    if (can("users:list"))         { loaders.push(safeLoad(() => api.listUsers()));          keys.push("users"); }
    if (can("roles:list"))         { loaders.push(safeLoad(() => api.listRoles()));          keys.push("roles"); }
    if (can("permissions:list"))   { loaders.push(safeLoad(() => api.listPermissions()));    keys.push("permissions"); }
    if (can("groups:list"))        { loaders.push(safeLoad(() => api.listGroups()));         keys.push("groups"); }
    if (can("organizations:list")) { loaders.push(safeLoad(() => api.listOrganizations())); keys.push("organizations"); }

    const results = await Promise.all(loaders);

    const newData = { ...state.data };
    const newPagination = { ...state.pagination };

    // Do not retain records for modules whose permission was just revoked.
    ["users", "roles", "permissions", "groups", "organizations"].forEach(key => {
      if (!keys.includes(key)) {
        newData[key] = [];
        delete newPagination[key];
      }
    });

    keys.forEach((key, idx) => {
      const page = api.extractPage(results[idx]);
      newData[key] = key === "users" ? page.items.map(normalizeUser) : page.items;
      newPagination[key] = page;
    });

    updateData(newData);
    updatePagination(newPagination);

    // Náº¿u section hiá»‡n táº¡i khÃ´ng cÃ³ quyá»n xem, chuyá»ƒn vá» section Ä‘áº§u tiÃªn cÃ³ quyá»n
    ensureValidSection();

    setStatus(message ? "success" : null, message || "");
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      setStatus("error", "PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.");
    } else {
      setStatus("error", error.message || "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u.");
    }
  }
  render();
}

/** Refresh toÃ n bá»™: reload access context + data */
async function refreshAll() {
  await api.loadAccessContext();
  if (!state.session?.accessToken) {
    setStatus("error", "Phiên đăng nhập đã hết hạn hoặc tài khoản đã bị khóa.");
    render();
    return;
  }
  await loadAdminData("ÄÃ£ lÃ m má»›i dá»¯ liá»‡u vÃ  quyá»n truy cáº­p.");
}

/** Äáº£m báº£o section hiá»‡n táº¡i lÃ  section mÃ  user cÃ³ quyá»n xem */
async function synchronizeAccessContext() {
  if (!state.session?.accessToken || accessSyncPromise) return accessSyncPromise;

  const previous = accessContextSignature();
  accessSyncPromise = (async () => {
    try {
      await api.loadAccessContext();
      if (!state.session?.accessToken) {
        setStatus("error", "Phiên đăng nhập đã hết hạn hoặc tài khoản đã bị khóa.");
        render();
        return;
      }

      if (previous !== accessContextSignature()) {
        ensureValidSection();
        await loadAdminData();
      }
    } catch (error) {
      await handleError(error);
    } finally {
      accessSyncPromise = null;
    }
  })();
  return accessSyncPromise;
}

function accessContextSignature() {
  const context = state.accessContext || {};
  const permissions = (context.permissions || [])
    .map(permission => `${permission.code}:${permission.effect}`)
    .sort()
    .join("|");
  return `${context.user?.id || ""}:${context.user?.status || ""}:${context.isSystemAdmin}:${permissions}`;
}

function ensureValidSection() {
  const sections = ["users", "roles", "permissions", "groups", "organizations"];
  const currentHasAccess = can(`${state.section}:list`);
  if (!currentHasAccess) {
    const first = sections.find(s => can(`${s}:list`));
    state.section = first || state.section;
  }
}

async function changePage(delta) {
  const section = state.section;
  const current = state.pagination[section];
  if (!current) return;

  const newPage = (current.page || 0) + delta;
  if (newPage < 0 || newPage >= (current.totalPages || 1)) return;

  try {
    let res;
    if (section === "users")         res = await api.listUsers(newPage);
    if (section === "roles")         res = await api.listRoles(newPage);
    if (section === "permissions")   res = await api.listPermissions(newPage);
    if (section === "groups")        res = await api.listGroups(newPage);
    if (section === "organizations") res = await api.listOrganizations(newPage);

    const page = api.extractPage(res);
    state.data[section] = section === "users" ? page.items.map(normalizeUser) : page.items;
    state.pagination[section] = page;
    render();
  } catch (error) {
    handleError(error);
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EDITOR OPENERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function openEditor(action, id) {
  try {
    if (action === "edit-user"         && can("users:update"))         state.editor = { kind: "user",         item: await api.getUser(id) };
    if (action === "edit-role"         && can("roles:update"))         state.editor = { kind: "role",         item: await api.getRole(id) };
    if (action === "edit-group"        && can("groups:update"))        state.editor = { kind: "group",        item: await api.getGroup(id) };
    if (action === "edit-organization" && can("organizations:update")) state.editor = { kind: "organization", item: await api.getOrganization(id) };
    if (action === "edit-permission"   && can("permissions:read"))     state.editor = { kind: "permissionDetail", item: await api.getPermission(id) };
    render();
  } catch (error) {
    handleError(error);
  }
}

async function openRolePermissions(id) {
  try {
    const role = state.data.roles.find(r => String(r.id) === String(id));
    const rolePermsRes = await api.listRolePermissions(id);
    const rolePerms = api.extractPage(rolePermsRes).items;
    const assignedIds = rolePerms.map(rp => rp.permissionId || rp.id);
    state.editor = { kind: "rolePermissions", item: role, permissions: state.data.permissions, assignedIds };
    render();
  } catch (error) { handleError(error); }
}

async function openRoleGroups(id) {
  try {
    const role = state.data.roles.find(r => String(r.id) === String(id));
    const res = await api.listRoleGroups(id);
    const groups = api.extractPage(res).items;
    state.editor = { kind: "roleGroups", item: role, groups };
    render();
  } catch (error) { handleError(error); }
}

async function openGroupUsers(id) {
  try {
    const group = state.data.groups.find(g => String(g.id) === String(id));
    const members = await api.listGroupUsers(id);
    const memberIds = (Array.isArray(members) ? members : []).map(m => m.userId || m.id);
    state.editor = { kind: "groupUsers", item: group, allUsers: state.data.users, memberIds };
    render();
  } catch (error) { handleError(error); }
}

async function openGroupRoles(id) {
  try {
    const group = state.data.groups.find(g => String(g.id) === String(id));
    const res = await api.listGroupRoles(id);
    const groupRoles = api.extractPage(res).items;
    const assignedIds = groupRoles.map(gr => gr.roleId || gr.id);
    state.editor = { kind: "groupRoles", item: group, allRoles: state.data.roles, assignedIds };
    render();
  } catch (error) { handleError(error); }
}

async function openUserGroups(id) {
  try {
    const user = state.data.users.find(u => String(u.id) === String(id));
    const userGroups = await api.listUserGroups(id);
    state.editor = { kind: "userGroups", item: user, groups: Array.isArray(userGroups) ? userGroups : [] };
    render();
  } catch (error) { handleError(error); }
}

async function openUserPermissions(id) {
  try {
    const user = state.data.users.find(u => String(u.id) === String(id));
    const res = await api.getUserEffectivePermissions(id);
    const perms = api.extractPage(res).items;
    state.editor = { kind: "userPermissions", item: user, permissions: perms };
    render();
  } catch (error) { handleError(error); }
}

async function openPermissionRoles(id) {
  try {
    const perm = state.data.permissions.find(p => String(p.id) === String(id));
    const res = await api.listPermissionRoles(id);
    const roles = api.extractPage(res).items;
    state.editor = { kind: "permissionRoles", item: perm, roles };
    render();
  } catch (error) { handleError(error); }
}

async function openOrgTree(id) {
  try {
    const treeData = await api.getOrganizationTree(id);
    state.editor = { kind: "orgTree", item: { id }, treeData };
    render();
  } catch (error) { handleError(error); }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CRUD ACTIONS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function saveNewUser(form) {
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  await api.createUser(payload);
  state.editor = null;
  await loadAdminData("ÄÃ£ thÃªm ngÆ°á»i dÃ¹ng má»›i.");
}

async function saveUser(form) {
  const id = form.dataset.id;
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  if (!payload.password) delete payload.password;
  await api.updateUser(id, payload);
  state.editor = null;
  await loadAdminData("ÄÃ£ cáº­p nháº­t ngÆ°á»i dÃ¹ng.");
}

async function saveRole(form) {
  const payload = readForm(form);
  const id = form.dataset.id;
  id ? await api.updateRole(id, payload) : await api.createRole(payload);
  state.editor = null;
  await loadAdminData(id ? "ÄÃ£ cáº­p nháº­t vai trÃ²." : "ÄÃ£ táº¡o vai trÃ² má»›i.");
}

async function saveGroup(form) {
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  const id = form.dataset.id;
  id ? await api.updateGroup(id, payload) : await api.createGroup(payload);
  state.editor = null;
  await loadAdminData(id ? "ÄÃ£ cáº­p nháº­t nhÃ³m." : "ÄÃ£ táº¡o nhÃ³m má»›i.");
}

async function saveOrganization(form) {
  const payload = readForm(form);
  if (payload.parentId) payload.parentId = Number(payload.parentId);
  else delete payload.parentId;
  const id = form.dataset.id;
  id ? await api.updateOrganization(id, payload) : await api.createOrganization(payload);
  state.editor = null;
  await loadAdminData(id ? "ÄÃ£ cáº­p nháº­t tá»• chá»©c." : "ÄÃ£ táº¡o tá»• chá»©c má»›i.");
}

async function saveRolePermissions(form) {
  const permissionIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  await synchronizeAssignments(
    permissionIds,
    state.editor?.assignedIds || [],
    permissionId => api.removeRolePermission(form.dataset.id, permissionId),
    ids => api.assignRolePermissions(form.dataset.id, ids)
  );
  await api.loadAccessContext();
  state.editor = null;
  await loadAdminData("ÄÃ£ cáº­p nháº­t quyá»n cho vai trÃ².");
}

async function saveGroupUsers(form) {
  const userIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  await synchronizeAssignments(
    userIds,
    state.editor?.memberIds || [],
    userId => api.removeGroupUser(form.dataset.id, userId),
    ids => api.assignGroupUsers(form.dataset.id, ids)
  );
  await api.loadAccessContext();
  state.editor = null;
  await loadAdminData("ÄÃ£ cáº­p nháº­t thÃ nh viÃªn nhÃ³m.");
}

async function saveGroupRoles(form) {
  const roleIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  await synchronizeAssignments(
    roleIds,
    state.editor?.assignedIds || [],
    roleId => api.removeGroupRole(form.dataset.id, roleId),
    ids => api.assignGroupRoles(form.dataset.id, ids)
  );
  await api.loadAccessContext();
  state.editor = null;
  await loadAdminData("ÄÃ£ cáº­p nháº­t vai trÃ² cho nhÃ³m.");
}

async function synchronizeAssignments(selectedIds, currentIds, removeAssignment, addAssignments) {
  const selected = new Set(selectedIds.map(Number));
  const current = new Set(currentIds.map(Number));
  const removedIds = [...current].filter(id => !selected.has(id));
  const addedIds = [...selected].filter(id => !current.has(id));

  // Apply removals first and await each operation so the final membership is
  // deterministic even when the browser or network is under load.
  for (const id of removedIds) {
    await removeAssignment(id);
  }
  if (addedIds.length) {
    await addAssignments(addedIds);
  }
}

async function destroyItem(action, id) {
  // Permission check cho tá»«ng loáº¡i delete
  const permMap = {
    "delete-user": "users:delete",
    "delete-role": "roles:delete",
    "delete-group": "groups:delete",
    "delete-organization": "organizations:delete"
  };
  if (permMap[action] && !can(permMap[action])) return;

  const labels = {
    "delete-user": "ngÆ°á»i dÃ¹ng", "delete-role": "vai trÃ²",
    "delete-group": "nhÃ³m", "delete-organization": "Ä‘Æ¡n vá»‹ tá»• chá»©c"
  };
  const label = labels[action] || "báº£n ghi";
  if (!confirm(`XÃ¡c nháº­n xÃ³a ${label} nÃ y?`)) return;

  if (action === "delete-user")         await api.deleteUser(id);
  if (action === "delete-role")         await api.deleteRole(id);
  if (action === "delete-group")        await api.deleteGroup(id);
  if (action === "delete-organization") await api.deleteOrganization(id);

  state.editor = null;
  await loadAdminData(`ÄÃ£ xÃ³a ${label}.`);
}

/* â”€â”€ User Lock / Unlock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function lockUserAction(id) {
  const reason = prompt("LÃ½ do khÃ³a tÃ i khoáº£n:", "Vi pháº¡m chÃ­nh sÃ¡ch báº£o máº­t");
  if (reason === null) return;
  await api.lockUser(id, reason);
  await loadAdminData("ÄÃ£ khÃ³a tÃ i khoáº£n.");
}

async function unlockUserAction(id) {
  if (!confirm("XÃ¡c nháº­n má»Ÿ khÃ³a tÃ i khoáº£n nÃ y?")) return;
  await api.unlockUser(id);
  await loadAdminData("ÄÃ£ má»Ÿ khÃ³a tÃ i khoáº£n.");
}

/* â”€â”€ Permission Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function togglePermEffect(id) {
  await api.togglePermissionEffect(id);
  await api.loadAccessContext();
  await loadAdminData("ÄÃ£ chuyá»ƒn Ä‘á»•i hiá»‡u lá»±c quyá»n.");
}

/* â”€â”€ Import / Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function exportUsersAction() {
  try {
    setStatus("success", "Äang táº¡o file Excel...");
    render();
    const { blob, filename } = await api.exportUsers();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("success", `ÄÃ£ xuáº¥t file thÃ nh cÃ´ng: ${filename}`);
    render();
  } catch (error) {
    handleError(error);
  }
}

function triggerImportDialog() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".xlsx,.xls";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      setStatus("success", "Äang táº£i vÃ  xá»­ lÃ½ file Excel...");
      render();
      const result = await api.importUsers(file);
      state.editor = { kind: "importResult", item: {}, result };
      setStatus("success", `Import hoÃ n táº¥t: ${result.successCount || 0} thÃ nh cÃ´ng, ${result.failedCount || 0} lá»—i.`);
      await loadAdminData();
    } catch (error) {
      handleError(error);
    }
  });
  fileInput.click();
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HELPERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function render() {
  app.innerHTML = hasAccess() ? renderAdminView(state) : renderAuthView(state);
}

function hasAccess() {
  return Boolean(state.session?.accessToken);
}

async function runExclusiveAction(key, button, action) {
  if (pendingActions.has(key)) return;
  pendingActions.add(key);
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
    await action();
  } finally {
    pendingActions.delete(key);
    if (button.isConnected) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

/**
 * Xá»­ lÃ½ lá»—i: phÃ¢n biá»‡t 401, 403 vÃ  lá»—i khÃ¡c.
 * - 401: session háº¿t háº¡n â†’ xÃ³a session, vá» login
 * - 403: khÃ´ng cÃ³ quyá»n â†’ thÃ´ng bÃ¡o + refresh access context
 * - KhÃ¡c: hiá»ƒn thá»‹ message lá»—i
 */
async function handleError(error) {
  if (error.status === 401) {
    clearSession();
    setStatus("error", "PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.");
    render();
  } else if (error.status === 403) {
    setStatus("warning", "Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y. Äang cáº­p nháº­t quyá»n...");
    render();
    // Refresh access context khi gáº·p 403 (quyá»n cÃ³ thá»ƒ Ä‘Ã£ thay Ä‘á»•i)
    await api.loadAccessContext();
    ensureValidSection();
    setStatus("warning", "Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y.");
    render();
  } else {
    setStatus("error", error.message || "CÃ³ lá»—i xáº£y ra.");
    render();
  }
}

function normalizeUser(user) {
  return {
    ...user,
    fullName: user.fullName || user.username || "",
    status: user.status || "ACTIVE"
  };
}

async function safeLoad(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 401) throw error;
    console.warn("API warning:", error.message);
    return null;
  }
}
