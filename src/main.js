/* ═══════════════════════════════════════════════════════════════
   Main Controller — Event handling & Business logic
   Entry point: loaded by index.html as ES Module
   ═══════════════════════════════════════════════════════════════ */

import * as api from "./api-client.js";
import { renderAdminView } from "./views/admin-view.js";
import { renderAuthView } from "./views/auth-view.js";
import {
  clearSession, saveSession, setStatus, setSearchQuery,
  toggleTheme, initTheme,
  state, updateData, updatePagination
} from "./store.js";

const app = document.querySelector("#app");

initTheme();
render();
bootstrap();

app.addEventListener("click", handleClick);
app.addEventListener("submit", handleSubmit);
app.addEventListener("input", handleInput);
window.addEventListener("keydown", handleKeydown);

/* ── Bootstrap ─────────────────────────────────────────────── */

async function bootstrap() {
  if (!state.session?.accessToken) return;
  await loadAdminData();
}

/* ── Input Handler (Live Search) ───────────────────────────── */

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

/* ── Keydown Handler ───────────────────────────────────────── */

function handleKeydown(event) {
  if (event.key === "Escape" && state.editor) {
    state.editor = null;
    render();
  }
}

/* ── Click Handler ─────────────────────────────────────────── */

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
    if (action === "refresh-all")    return loadAdminData("Đã làm mới dữ liệu.");
    if (action === "close-editor")   { state.editor = null; return render(); }
    if (action === "dismiss-status") { setStatus(null); return render(); }
    if (action === "clear-search")   { setSearchQuery(""); return render(); }

    // Create
    if (action === "create-user")         { state.editor = { kind: "createUser", item: {} }; return render(); }
    if (action === "create-role")         { state.editor = { kind: "role", item: {} }; return render(); }
    if (action === "create-group")        { state.editor = { kind: "group", item: {} }; return render(); }
    if (action === "create-organization") { state.editor = { kind: "organization", item: {} }; return render(); }

    // Edit
    if (action.startsWith("edit-")) return openEditor(action, id);

    // Delete
    if (action.startsWith("delete-")) return destroyItem(action, id);

    // User actions
    if (action === "lock-user")        return lockUserAction(id);
    if (action === "unlock-user")      return unlockUserAction(id);
    if (action === "user-groups")      return openUserGroups(id);
    if (action === "user-permissions") return openUserPermissions(id);

    // Role actions
    if (action === "role-permissions") return openRolePermissions(id);
    if (action === "role-groups")      return openRoleGroups(id);

    // Group actions
    if (action === "group-users") return openGroupUsers(id);
    if (action === "group-roles") return openGroupRoles(id);

    // Permission actions
    if (action === "toggle-permission-effect") return togglePermEffect(id);
    if (action === "permission-roles")         return openPermissionRoles(id);

    // Organization actions
    if (action === "org-tree") return openOrgTree(id);

    // Import/Export
    if (action === "export-users") return exportUsersAction();
    if (action === "import-users") return triggerImportDialog();

    // Pagination
    if (action === "prev-page") return changePage(-1);
    if (action === "next-page") return changePage(1);

  } catch (error) {
    fail(error);
  }
}

/* ── Submit Handler ────────────────────────────────────────── */

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
    fail(error);
  } finally {
    if (button) button.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════════════
   AUTH ACTIONS
   ═══════════════════════════════════════════════════════════════ */

async function loginUser(form) {
  clearSession();
  const formData = readForm(form);
  const data = await api.login(formData);

  if (data.mfaRequired) {
    throw new Error("Tài khoản yêu cầu xác thực 2 bước (MFA). Chức năng này chưa được hỗ trợ trên giao diện.");
  }

  saveSession(data);

  if (data.mustChangePassword) {
    setStatus("warning", "Tài khoản cần đổi mật khẩu lần đầu. Vui lòng đổi mật khẩu.");
  }

  await loadAdminData("Đăng nhập thành công.");
}

async function logoutUser() {
  try {
    if (state.session?.accessToken && state.session?.refreshToken) {
      await api.logout(state.session.accessToken, state.session.refreshToken);
    }
  } catch { /* Ignore logout API errors */ }
  clearSession();
  state.editor = null;
  setStatus("success", "Đã đăng xuất.");
  render();
}

/* ═══════════════════════════════════════════════════════════════
   DATA LOADING
   ═══════════════════════════════════════════════════════════════ */

async function loadAdminData(message) {
  try {
    const [usersRes, rolesRes, permsRes, groupsRes, orgsRes] = await Promise.all([
      safeLoad(() => api.listUsers()),
      safeLoad(() => api.listRoles()),
      safeLoad(() => api.listPermissions()),
      safeLoad(() => api.listGroups()),
      safeLoad(() => api.listOrganizations())
    ]);

    const usersPage  = api.extractPage(usersRes);
    const rolesPage  = api.extractPage(rolesRes);
    const permsPage  = api.extractPage(permsRes);
    const groupsPage = api.extractPage(groupsRes);
    const orgsPage   = api.extractPage(orgsRes);

    updateData({
      users:         usersPage.items.map(normalizeUser),
      roles:         rolesPage.items,
      permissions:   permsPage.items,
      groups:        groupsPage.items,
      organizations: orgsPage.items
    });

    updatePagination({
      users: usersPage, roles: rolesPage, permissions: permsPage,
      groups: groupsPage, organizations: orgsPage
    });

    setStatus(message ? "success" : null, message || "");
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      setStatus("error", "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    } else {
      setStatus("error", error.message || "Không thể tải dữ liệu.");
    }
  }
  render();
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
    fail(error);
  }
}

/* ═══════════════════════════════════════════════════════════════
   EDITOR OPENERS
   ═══════════════════════════════════════════════════════════════ */

async function openEditor(action, id) {
  try {
    if (action === "edit-user")         state.editor = { kind: "user",         item: await api.getUser(id) };
    if (action === "edit-role")         state.editor = { kind: "role",         item: await api.getRole(id) };
    if (action === "edit-group")        state.editor = { kind: "group",        item: await api.getGroup(id) };
    if (action === "edit-organization") state.editor = { kind: "organization", item: await api.getOrganization(id) };
    if (action === "edit-permission")   state.editor = { kind: "permissionDetail", item: await api.getPermission(id) };
    render();
  } catch (error) {
    fail(error);
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
  } catch (error) { fail(error); }
}

async function openRoleGroups(id) {
  try {
    const role = state.data.roles.find(r => String(r.id) === String(id));
    const res = await api.listRoleGroups(id);
    const groups = api.extractPage(res).items;
    state.editor = { kind: "roleGroups", item: role, groups };
    render();
  } catch (error) { fail(error); }
}

async function openGroupUsers(id) {
  try {
    const group = state.data.groups.find(g => String(g.id) === String(id));
    const members = await api.listGroupUsers(id);
    const memberIds = (Array.isArray(members) ? members : []).map(m => m.userId || m.id);
    state.editor = { kind: "groupUsers", item: group, allUsers: state.data.users, memberIds };
    render();
  } catch (error) { fail(error); }
}

async function openGroupRoles(id) {
  try {
    const group = state.data.groups.find(g => String(g.id) === String(id));
    const res = await api.listGroupRoles(id);
    const groupRoles = api.extractPage(res).items;
    const assignedIds = groupRoles.map(gr => gr.roleId || gr.id);
    state.editor = { kind: "groupRoles", item: group, allRoles: state.data.roles, assignedIds };
    render();
  } catch (error) { fail(error); }
}

async function openUserGroups(id) {
  try {
    const user = state.data.users.find(u => String(u.id) === String(id));
    const userGroups = await api.listUserGroups(id);
    state.editor = { kind: "userGroups", item: user, groups: Array.isArray(userGroups) ? userGroups : [] };
    render();
  } catch (error) { fail(error); }
}

async function openUserPermissions(id) {
  try {
    const user = state.data.users.find(u => String(u.id) === String(id));
    const res = await api.getUserEffectivePermissions(id);
    const perms = api.extractPage(res).items;
    state.editor = { kind: "userPermissions", item: user, permissions: perms };
    render();
  } catch (error) { fail(error); }
}

async function openPermissionRoles(id) {
  try {
    const perm = state.data.permissions.find(p => String(p.id) === String(id));
    const res = await api.listPermissionRoles(id);
    const roles = api.extractPage(res).items;
    state.editor = { kind: "permissionRoles", item: perm, roles };
    render();
  } catch (error) { fail(error); }
}

async function openOrgTree(id) {
  try {
    const treeData = await api.getOrganizationTree(id);
    state.editor = { kind: "orgTree", item: { id }, treeData };
    render();
  } catch (error) { fail(error); }
}

/* ═══════════════════════════════════════════════════════════════
   CRUD ACTIONS
   ═══════════════════════════════════════════════════════════════ */

async function saveNewUser(form) {
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  await api.createUser(payload);
  state.editor = null;
  await loadAdminData("Đã thêm người dùng mới.");
}

async function saveUser(form) {
  const id = form.dataset.id;
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  if (!payload.password) delete payload.password;
  await api.updateUser(id, payload);
  state.editor = null;
  await loadAdminData("Đã cập nhật người dùng.");
}

async function saveRole(form) {
  const payload = readForm(form);
  const id = form.dataset.id;
  id ? await api.updateRole(id, payload) : await createRole(payload);
  state.editor = null;
  await loadAdminData(id ? "Đã cập nhật vai trò." : "Đã tạo vai trò mới.");
}

async function saveGroup(form) {
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  const id = form.dataset.id;
  id ? await api.updateGroup(id, payload) : await createGroup(payload);
  state.editor = null;
  await loadAdminData(id ? "Đã cập nhật nhóm." : "Đã tạo nhóm mới.");
}

async function saveOrganization(form) {
  const payload = readForm(form);
  if (payload.parentId) payload.parentId = Number(payload.parentId);
  else delete payload.parentId;
  const id = form.dataset.id;
  id ? await api.updateOrganization(id, payload) : await createOrganization(payload);
  state.editor = null;
  await loadAdminData(id ? "Đã cập nhật tổ chức." : "Đã tạo tổ chức mới.");
}

async function saveRolePermissions(form) {
  const permissionIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  await api.assignRolePermissions(form.dataset.id, permissionIds);
  state.editor = null;
  await loadAdminData("Đã cập nhật quyền cho vai trò.");
}

async function saveGroupUsers(form) {
  const userIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  await api.assignGroupUsers(form.dataset.id, userIds);
  state.editor = null;
  await loadAdminData("Đã cập nhật thành viên nhóm.");
}

async function saveGroupRoles(form) {
  const roleIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  await api.assignGroupRoles(form.dataset.id, roleIds);
  state.editor = null;
  await loadAdminData("Đã cập nhật vai trò cho nhóm.");
}

async function destroyItem(action, id) {
  const labels = {
    "delete-user": "người dùng", "delete-role": "vai trò",
    "delete-group": "nhóm", "delete-organization": "đơn vị tổ chức"
  };
  const label = labels[action] || "bản ghi";
  if (!confirm(`Xác nhận xóa ${label} này?`)) return;

  if (action === "delete-user")         await api.deleteUser(id);
  if (action === "delete-role")         await api.deleteRole(id);
  if (action === "delete-group")        await api.deleteGroup(id);
  if (action === "delete-organization") await api.deleteOrganization(id);

  state.editor = null;
  await loadAdminData(`Đã xóa ${label}.`);
}

/* ── User Lock / Unlock ────────────────────────────────────── */

async function lockUserAction(id) {
  const reason = prompt("Lý do khóa tài khoản:", "Vi phạm chính sách bảo mật");
  if (reason === null) return;
  await api.lockUser(id, reason);
  await loadAdminData("Đã khóa tài khoản.");
}

async function unlockUserAction(id) {
  if (!confirm("Xác nhận mở khóa tài khoản này?")) return;
  await api.unlockUser(id);
  await loadAdminData("Đã mở khóa tài khoản.");
}

/* ── Permission Toggle ─────────────────────────────────────── */

async function togglePermEffect(id) {
  await api.togglePermissionEffect(id);
  await loadAdminData("Đã chuyển đổi hiệu lực quyền.");
}

/* ── Import / Export ───────────────────────────────────────── */

async function exportUsersAction() {
  try {
    setStatus("success", "Đang tạo file Excel...");
    render();
    const { blob, filename } = await api.exportUsers();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("success", `Đã xuất file thành công: ${filename}`);
    render();
  } catch (error) {
    fail(error);
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
      setStatus("success", "Đang tải và xử lý file Excel...");
      render();
      const result = await api.importUsers(file);
      state.editor = { kind: "importResult", item: {}, result };
      setStatus("success", `Import hoàn tất: ${result.successCount || 0} thành công, ${result.failedCount || 0} lỗi.`);
      await loadAdminData();
    } catch (error) {
      fail(error);
    }
  });
  fileInput.click();
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function render() {
  app.innerHTML = hasAccess() ? renderAdminView(state) : renderAuthView(state);
}

function hasAccess() {
  return Boolean(state.session?.accessToken);
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function fail(error) {
  setStatus("error", error.message || "Có lỗi xảy ra.");
  render();
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
