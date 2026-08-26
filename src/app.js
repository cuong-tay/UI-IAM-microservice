/* ═══════════════════════════════════════════════════════════════
   Admin Console — Microservice API (Gateway port 8084)
   ═══════════════════════════════════════════════════════════════ */

const BASE_URL = "http://localhost:8084";
const API_PREFIX = "/api/core/auth-service/api/v1";
const SESSION_KEY = "admin-console-session";

/* ── State ─────────────────────────────────────────────────── */

const state = {
  authMode: "login",
  section: "users",
  status: null,
  session: readSession(),
  pagination: {},          // { users: { page, totalPages, totalElements }, ... }
  data: { users: [], roles: [], permissions: [], groups: [], organizations: [] },
  editor: null
};

/* ── Bootstrap ─────────────────────────────────────────────── */

const app = document.querySelector("#app");

render();
bootstrap();

app.addEventListener("click", handleClick);
app.addEventListener("submit", handleSubmit);

async function bootstrap() {
  if (!state.session?.accessToken) return;
  await loadAdminData();
}

/* ── Event Handlers ────────────────────────────────────────── */

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  try {
    if (action === "switch-auth")    { state.authMode = target.dataset.mode; setStatus(null); return render(); }
    if (action === "logout")         { await logoutUser(); return; }
    if (action === "switch-section") { state.section = target.dataset.section; state.editor = null; return render(); }
    if (action === "refresh-all")    return loadAdminData("Đã làm mới dữ liệu.");
    if (action === "close-editor")   { state.editor = null; return render(); }

    // Create actions
    if (action === "create-user")         { state.editor = { kind: "createUser", item: {} }; return render(); }
    if (action === "create-role")         { state.editor = { kind: "role", item: {} }; return render(); }
    if (action === "create-group")        { state.editor = { kind: "group", item: {} }; return render(); }
    if (action === "create-organization") { state.editor = { kind: "organization", item: {} }; return render(); }

    // Edit actions
    if (action.startsWith("edit-")) return openEditor(action, target.dataset.id);

    // Delete actions
    if (action.startsWith("delete-")) return destroyItem(action, target.dataset.id);

    // User actions
    if (action === "lock-user")   return lockUserAction(target.dataset.id);
    if (action === "unlock-user") return unlockUserAction(target.dataset.id);

    // Assignment actions
    if (action === "group-users")        return openGroupUsers(target.dataset.id);
    if (action === "group-roles")        return openGroupRoles(target.dataset.id);
    if (action === "role-permissions")    return openRolePermissions(target.dataset.id);
    if (action === "user-groups")        return openUserGroups(target.dataset.id);

    // Permission toggle
    if (action === "toggle-permission-effect") return togglePermEffect(target.dataset.id);

    // Pagination
    if (action === "prev-page") return changePage(-1);
    if (action === "next-page") return changePage(1);

  } catch (error) {
    fail(error);
  }
}

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

/* ── Auth Actions ──────────────────────────────────────────── */

async function loginUser(form) {
  clearAuthCache();
  const formData = readForm(form);
  const body = {
    usernameOrEmail: formData.usernameOrEmail || formData.email,
    password: formData.password
  };
  const data = await apiLogin(body);
  if (data.mfaRequired) {
    throw new Error("Tài khoản yêu cầu xác thực 2 bước (MFA). Chức năng này chưa được hỗ trợ trên giao diện.");
  }
  if (data.mustChangePassword) {
    setStatus("warning", "Tài khoản cần đổi mật khẩu. Vui lòng đổi mật khẩu sau khi đăng nhập.");
  }
  saveSession(data);
  await loadAdminData("Đăng nhập thành công.");
}

async function logoutUser() {
  try {
    if (state.session?.refreshToken) {
      await request("/api/auth/logout", {
        method: "POST",
        body: { refreshToken: state.session.refreshToken },
        headers: { Authorization: `Bearer ${state.session.accessToken}` }
      });
    }
  } catch { /* ignore logout errors */ }
  clearAuthCache();
  state.editor = null;
  setStatus("success", "Đã đăng xuất.");
  render();
}

/* ── Data Loading ──────────────────────────────────────────── */

async function loadAdminData(message) {
  try {
    const [usersRes, rolesRes, permissionsRes, groupsRes, orgsRes] = await Promise.all([
      safeRequest(() => listUsers()),
      safeRequest(() => listRoles()),
      safeRequest(() => listPermissions()),
      safeRequest(() => listGroups()),
      safeRequest(() => listOrganizations())
    ]);

    const usersPage  = extractPage(usersRes);
    const rolesPage  = extractPage(rolesRes);
    const permsPage  = extractPage(permissionsRes);
    const groupsPage = extractPage(groupsRes);
    const orgsPage   = extractPage(orgsRes);

    state.data = {
      users:         usersPage.items.map(normalizeUser),
      roles:         rolesPage.items,
      permissions:   permsPage.items,
      groups:        groupsPage.items,
      organizations: orgsPage.items
    };

    state.pagination = {
      users:         usersPage,
      roles:         rolesPage,
      permissions:   permsPage,
      groups:        groupsPage,
      organizations: orgsPage
    };

    setStatus(message ? "success" : null, message || "");
  } catch (error) {
    if (error.status === 401) {
      clearAuthCache();
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
    if (section === "users")         res = await listUsers(newPage);
    if (section === "roles")         res = await listRoles(newPage);
    if (section === "permissions")   res = await listPermissions(newPage);
    if (section === "groups")        res = await listGroups(newPage);
    if (section === "organizations") res = await listOrganizations(newPage);

    const page = extractPage(res);
    state.data[section] = section === "users" ? page.items.map(normalizeUser) : page.items;
    state.pagination[section] = page;
    render();
  } catch (error) {
    fail(error);
  }
}

/* ── Editor Actions ────────────────────────────────────────── */

async function openEditor(action, id) {
  try {
    if (action === "edit-user")         state.editor = { kind: "user", item: await getUser(id) };
    if (action === "edit-role")         state.editor = { kind: "role", item: await getRole(id) };
    if (action === "edit-group")        state.editor = { kind: "group", item: await getGroup(id) };
    if (action === "edit-organization") state.editor = { kind: "organization", item: await getOrganization(id) };
    if (action === "edit-permission")   state.editor = { kind: "permissionDetail", item: await getPermission(id) };
    render();
  } catch (error) {
    fail(error);
  }
}

async function openRolePermissions(id) {
  try {
    const role = state.data.roles.find(r => String(r.id) === String(id));
    const rolePermsRes = await listRolePermissions(id);
    const rolePerms = extractPage(rolePermsRes).items;
    const assignedIds = rolePerms.map(rp => rp.permissionId || rp.id);
    state.editor = { kind: "rolePermissions", item: role, permissions: state.data.permissions, assignedIds };
    render();
  } catch (error) {
    fail(error);
  }
}

async function openGroupUsers(id) {
  try {
    const group = state.data.groups.find(g => String(g.id) === String(id));
    const members = await listGroupUsers(id);
    const memberIds = (Array.isArray(members) ? members : []).map(m => m.userId || m.id);
    state.editor = { kind: "groupUsers", item: group, allUsers: state.data.users, memberIds };
    render();
  } catch (error) {
    fail(error);
  }
}

async function openGroupRoles(id) {
  try {
    const group = state.data.groups.find(g => String(g.id) === String(id));
    const groupRolesRes = await listGroupRoles(id);
    const groupRoles = extractPage(groupRolesRes).items;
    const assignedIds = groupRoles.map(gr => gr.roleId || gr.id);
    state.editor = { kind: "groupRoles", item: group, allRoles: state.data.roles, assignedIds };
    render();
  } catch (error) {
    fail(error);
  }
}

async function openUserGroups(id) {
  try {
    const user = state.data.users.find(u => String(u.id) === String(id));
    const userGroups = await listUserGroups(id);
    state.editor = { kind: "userGroups", item: user, groups: Array.isArray(userGroups) ? userGroups : [] };
    render();
  } catch (error) {
    fail(error);
  }
}

/* ── CRUD Actions ──────────────────────────────────────────── */

async function saveNewUser(form) {
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  await createUser(payload);
  state.editor = null;
  await loadAdminData("Đã thêm người dùng mới.");
}

async function saveUser(form) {
  const id = form.dataset.id;
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  // Remove empty password
  if (!payload.password) delete payload.password;
  await updateUser(id, payload);
  state.editor = null;
  await loadAdminData("Đã cập nhật người dùng.");
}

async function saveRole(form) {
  const payload = readForm(form);
  const id = form.dataset.id;
  id ? await updateRole(id, payload) : await createRole(payload);
  state.editor = null;
  await loadAdminData(id ? "Đã cập nhật vai trò." : "Đã tạo vai trò mới.");
}

async function saveGroup(form) {
  const payload = readForm(form);
  if (payload.organizationId) payload.organizationId = Number(payload.organizationId);
  const id = form.dataset.id;
  id ? await updateGroup(id, payload) : await createGroup(payload);
  state.editor = null;
  await loadAdminData(id ? "Đã cập nhật nhóm." : "Đã tạo nhóm mới.");
}

async function saveOrganization(form) {
  const payload = readForm(form);
  if (payload.parentId) payload.parentId = Number(payload.parentId);
  else delete payload.parentId;
  const id = form.dataset.id;
  id ? await updateOrganization(id, payload) : await createOrganization(payload);
  state.editor = null;
  await loadAdminData(id ? "Đã cập nhật tổ chức." : "Đã tạo tổ chức mới.");
}

async function saveRolePermissions(form) {
  const permissionIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  const roleId = form.dataset.id;
  await assignRolePermissions(roleId, permissionIds);
  state.editor = null;
  await loadAdminData("Đã cập nhật quyền cho vai trò.");
}

async function saveGroupUsers(form) {
  const userIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  const groupId = form.dataset.id;
  await assignGroupUsers(groupId, userIds);
  state.editor = null;
  await loadAdminData("Đã cập nhật thành viên nhóm.");
}

async function saveGroupRoles(form) {
  const roleIds = [...form.querySelectorAll('input[name="items"]:checked')].map(i => Number(i.value));
  const groupId = form.dataset.id;
  await assignGroupRoles(groupId, roleIds);
  state.editor = null;
  await loadAdminData("Đã cập nhật vai trò cho nhóm.");
}

async function destroyItem(action, id) {
  if (!confirm("Xác nhận xóa bản ghi này?")) return;
  if (action === "delete-user")         await deleteUser(id);
  if (action === "delete-role")         await deleteRole(id);
  if (action === "delete-group")        await deleteGroup(id);
  if (action === "delete-organization") await deleteOrganization(id);
  state.editor = null;
  await loadAdminData("Đã xóa bản ghi.");
}

async function lockUserAction(id) {
  const reason = prompt("Lý do khóa tài khoản:", "Vi phạm chính sách bảo mật");
  if (reason === null) return;
  await lockUser(id, reason);
  await loadAdminData("Đã khóa tài khoản.");
}

async function unlockUserAction(id) {
  if (!confirm("Xác nhận mở khóa tài khoản?")) return;
  await unlockUser(id);
  await loadAdminData("Đã mở khóa tài khoản.");
}

async function togglePermEffect(id) {
  await togglePermissionEffect(id);
  await loadAdminData("Đã chuyển đổi hiệu lực quyền.");
}

/* ═══════════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════════ */

function render() {
  app.innerHTML = hasAccess() ? renderAdminView() : renderAuthView();
}

/* ── Auth View ─────────────────────────────────────────────── */

function renderAuthView() {
  return `
    <section class="auth-layout">
      <section class="auth-card">
        <div class="auth-brand">
          <span class="brand-mark">Q</span>
          <div><strong>Quản trị hệ thống</strong><span>Người dùng và phân quyền</span></div>
        </div>
        <p class="eyebrow">Bắt đầu</p>
        <h2>Đăng nhập</h2>
        <p>Nhập thông tin tài khoản để tiếp tục vào khu vực quản lý.</p>
        ${renderStatus()}
        <form id="login-form" data-form="login">
          <div class="form-grid">
            ${field("Tên đăng nhập hoặc Email", "usernameOrEmail", "text", "admin")}
            ${field("Mật khẩu", "password", "password", "Password@123")}
          </div>
          <button class="primary-btn" type="submit">Đăng nhập</button>
        </form>
        <div class="hint login-hint">
          <strong>Tài khoản đăng nhập mẫu:</strong><br>
          Username: <strong>admin</strong> <em>(hoặc admin@example.com)</em><br>
          Password: <strong>Password@123</strong>
        </div>
      </section>
      <article class="hero-panel">
        <div>
          <div class="eyebrow">Tác vụ thường dùng</div>
          <h1>Kiểm soát quyền truy cập nhanh hơn.</h1>
        </div>
        <div class="feature-list">
          <div><span>01</span><strong>Quản lý người dùng</strong><p>Xem, tạo, sửa, khóa/mở khóa tài khoản người dùng.</p></div>
          <div><span>02</span><strong>Phân nhóm & vai trò</strong><p>Gán người dùng vào nhóm, gán vai trò cho nhóm để phân quyền linh hoạt.</p></div>
          <div><span>03</span><strong>Cơ cấu tổ chức</strong><p>Quản lý đơn vị tổ chức dạng cây cha-con với nhiều cấp.</p></div>
        </div>
      </article>
    </section>
  `;
}

/* ── Admin View ────────────────────────────────────────────── */

const sectionMeta = {
  users:         { title: "Người dùng",    detail: "Xem thông tin, cập nhật hồ sơ, khóa/mở khóa tài khoản." },
  roles:         { title: "Vai trò",       detail: "Tạo vai trò, chỉnh mô tả và gán quyền cho vai trò." },
  permissions:   { title: "Quyền truy cập", detail: "Xem danh sách quyền hệ thống, chuyển đổi hiệu lực ALLOW / DENY." },
  groups:        { title: "Nhóm",          detail: "Quản lý nhóm người dùng, gán thành viên và vai trò." },
  organizations: { title: "Tổ chức",       detail: "Quản lý cơ cấu đơn vị tổ chức." }
};

function renderAdminView() {
  const current = state.section;
  const meta = sectionMeta[current] || { title: current, detail: "" };
  const sessionLabel = state.session?.username || state.session?.email || "Admin";

  return `
    <section class="admin-layout">
      <header class="topbar">
        <div class="topbar-brand">
          <span class="brand-mark">Q</span>
          <div><strong>Trang quản trị</strong><span>${escapeHtml(sessionLabel)}</span></div>
        </div>
        <div class="toolbar">
          <button class="ghost-btn" data-action="refresh-all">Làm mới</button>
          <button class="danger-btn" data-action="logout">Đăng xuất</button>
        </div>
      </header>
      <div class="admin-main">
        <aside class="sidebar">
          <div class="eyebrow">Danh mục</div>
          <nav class="nav-stack">
            ${navButton("users", "Người dùng", current)}
            ${navButton("roles", "Vai trò", current)}
            ${navButton("permissions", "Quyền truy cập", current)}
            ${navButton("groups", "Nhóm", current)}
            ${navButton("organizations", "Tổ chức", current)}
          </nav>
          <div class="sidebar-stats">
            ${stat("Người dùng", state.data.users.length)}
            ${stat("Vai trò", state.data.roles.length)}
            ${stat("Nhóm", state.data.groups.length)}
          </div>
        </aside>
        <section class="content-panel">
          <div class="section-header">
            <div>
              <div class="eyebrow">${meta.title}</div>
              <h2>${meta.title}</h2>
              <p class="muted">${meta.detail}</p>
            </div>
            ${renderCreateButton(current)}
          </div>
          ${renderStatus()}
          ${renderTable(current)}
          ${renderPagination(current)}
        </section>
        <aside class="editor-panel">
          ${renderEditor()}
        </aside>
      </div>
    </section>
  `;
}

function renderCreateButton(section) {
  const map = {
    users: `<button class="primary-btn" data-action="create-user">Thêm người dùng</button>`,
    roles: `<button class="primary-btn" data-action="create-role">Tạo vai trò</button>`,
    groups: `<button class="primary-btn" data-action="create-group">Tạo nhóm</button>`,
    organizations: `<button class="primary-btn" data-action="create-organization">Tạo đơn vị</button>`
  };
  return map[section] || "";
}

/* ── Tables ────────────────────────────────────────────────── */

function renderTable(section) {
  const rows = state.data[section] || [];
  if (!rows.length) return `<div class="table-wrap"><div class="empty-state">Chưa có dữ liệu.</div></div>`;

  const heads = {
    users:         ["Thông tin", "Liên hệ", "Trạng thái & Đơn vị", "Thao tác"],
    roles:         ["Vai trò", "Mô tả", "Trạng thái", "Thao tác"],
    permissions:   ["Quyền", "Tài nguyên / Hành động", "Hiệu lực", "Thao tác"],
    groups:        ["Nhóm", "Mô tả", "Trạng thái", "Thao tác"],
    organizations: ["Đơn vị", "Mã", "Trạng thái", "Thao tác"]
  };
  const head = heads[section] || ["Tên", "Mô tả", "Chi tiết", "Thao tác"];

  return `
    <div class="table-wrap">
      <div class="table-head">${head.map(h => `<span>${h}</span>`).join("")}</div>
      ${rows.map(item => renderRow(section, item)).join("")}
    </div>
  `;
}

function renderRow(section, item) {
  if (section === "users") return renderUserRow(item);
  if (section === "roles") return renderRoleRow(item);
  if (section === "permissions") return renderPermissionRow(item);
  if (section === "groups") return renderGroupRow(item);
  if (section === "organizations") return renderOrgRow(item);
  return "";
}

function renderUserRow(item) {
  const lockBtn = item.status === "LOCKED"
    ? `<button class="ghost-btn" data-action="unlock-user" data-id="${item.id}">Mở khóa</button>`
    : `<button class="ghost-btn" data-action="lock-user" data-id="${item.id}">Khóa</button>`;

  return `
    <div class="table-row">
      <div>
        <strong>${escapeHtml(item.fullName || item.username || "—")}</strong>
        <div class="meta">@${escapeHtml(item.username || "")} • Mã ${item.id}</div>
      </div>
      <div>
        <strong>${escapeHtml(item.email || "—")}</strong>
        <div class="meta">${escapeHtml(item.phone || "—")}</div>
      </div>
      <div>
        ${statusBadge(item.status)}
        ${item.organizationName ? `<div class="meta">${escapeHtml(item.organizationName)}</div>` : ""}
      </div>
      <div class="table-actions">
        <button class="ghost-btn" data-action="edit-user" data-id="${item.id}">Sửa</button>
        <button class="ghost-btn" data-action="user-groups" data-id="${item.id}">Nhóm</button>
        ${lockBtn}
        <button class="danger-btn" data-action="delete-user" data-id="${item.id}">Xóa</button>
      </div>
    </div>
  `;
}

function renderRoleRow(item) {
  return `
    <div class="table-row">
      <div>
        <strong>${escapeHtml(item.name || "—")}</strong>
        <div class="meta">${escapeHtml(item.code || "")}${item.system ? " • Hệ thống" : ""}</div>
      </div>
      <div>${escapeHtml(item.description || "")}<span class="meta">${!item.description ? "Chưa có mô tả" : ""}</span></div>
      <div>${statusBadge(item.status)}</div>
      <div class="table-actions">
        <button class="ghost-btn" data-action="edit-role" data-id="${item.id}">Sửa</button>
        <button class="ghost-btn" data-action="role-permissions" data-id="${item.id}">Gán quyền</button>
        ${item.system ? "" : `<button class="danger-btn" data-action="delete-role" data-id="${item.id}">Xóa</button>`}
      </div>
    </div>
  `;
}

function renderPermissionRow(item) {
  const effectCls = item.effect === "ALLOW" ? "pill-allow" : "pill-deny";
  return `
    <div class="table-row">
      <div>
        <strong>${escapeHtml(item.name || "—")}</strong>
        <div class="meta">${escapeHtml(item.code || "")}</div>
      </div>
      <div>
        <span class="pill">${escapeHtml(item.resource || "—")}</span>
        <span class="meta">${escapeHtml(item.action || "")}</span>
      </div>
      <div><span class="pill ${effectCls}">${item.effect || "—"}</span></div>
      <div class="table-actions">
        <button class="ghost-btn" data-action="edit-permission" data-id="${item.id}">Chi tiết</button>
        <button class="ghost-btn" data-action="toggle-permission-effect" data-id="${item.id}">${item.effect === "ALLOW" ? "→ DENY" : "→ ALLOW"}</button>
      </div>
    </div>
  `;
}

function renderGroupRow(item) {
  return `
    <div class="table-row">
      <div>
        <strong>${escapeHtml(item.name || "—")}</strong>
        <div class="meta">${escapeHtml(item.code || "")}</div>
      </div>
      <div>${escapeHtml(item.description || "")}<span class="meta">${!item.description ? "Chưa có mô tả" : ""}</span></div>
      <div>
        ${statusBadge(item.status)}
        ${item.organizationName ? `<div class="meta">${escapeHtml(item.organizationName)}</div>` : ""}
      </div>
      <div class="table-actions">
        <button class="ghost-btn" data-action="edit-group" data-id="${item.id}">Sửa</button>
        <button class="ghost-btn" data-action="group-users" data-id="${item.id}">Thành viên</button>
        <button class="ghost-btn" data-action="group-roles" data-id="${item.id}">Vai trò</button>
        <button class="danger-btn" data-action="delete-group" data-id="${item.id}">Xóa</button>
      </div>
    </div>
  `;
}

function renderOrgRow(item) {
  const indent = item.level ? `${"─".repeat(item.level - 1)} ` : "";
  return `
    <div class="table-row">
      <div>
        <strong>${indent}${escapeHtml(item.name || "—")}</strong>
        <div class="meta">${escapeHtml(item.description || "")}</div>
      </div>
      <div><code>${escapeHtml(item.code || "—")}</code><div class="meta">Cấp ${item.level || 1} • Path: ${escapeHtml(item.path || "—")}</div></div>
      <div>${statusBadge(item.status)}</div>
      <div class="table-actions">
        <button class="ghost-btn" data-action="edit-organization" data-id="${item.id}">Sửa</button>
        <button class="danger-btn" data-action="delete-organization" data-id="${item.id}">Xóa</button>
      </div>
    </div>
  `;
}

/* ── Pagination ────────────────────────────────────────────── */

function renderPagination(section) {
  const p = state.pagination[section];
  if (!p || (p.totalPages || 1) <= 1) return "";
  const page = p.page || 0;
  const total = p.totalPages || 1;
  return `
    <div class="pagination-bar">
      <button class="ghost-btn" data-action="prev-page" ${page <= 0 ? "disabled" : ""}>← Trước</button>
      <span class="meta">Trang ${page + 1} / ${total} (${p.totalElements || 0} bản ghi)</span>
      <button class="ghost-btn" data-action="next-page" ${page >= total - 1 ? "disabled" : ""}>Sau →</button>
    </div>
  `;
}

/* ── Editor Panel ──────────────────────────────────────────── */

function renderEditor() {
  if (!state.editor) {
    return `<div class="empty-state"><div class="eyebrow">Chi tiết</div><h2>Chọn một mục</h2><p class="muted">Chọn bản ghi trong bảng để chỉnh sửa hoặc phân quyền.</p></div>`;
  }
  const { kind, item } = state.editor;
  const titleMap = {
    createUser: "Thêm người dùng",
    user: "Sửa người dùng",
    role: item?.id ? "Sửa vai trò" : "Tạo vai trò",
    group: item?.id ? "Sửa nhóm" : "Tạo nhóm",
    organization: item?.id ? "Sửa đơn vị" : "Tạo đơn vị",
    rolePermissions: "Gán quyền cho vai trò",
    groupUsers: "Thành viên nhóm",
    groupRoles: "Vai trò của nhóm",
    userGroups: "Nhóm của người dùng",
    permissionDetail: "Chi tiết quyền"
  };
  return `
    <div class="editor-head">
      <div><div class="eyebrow">Chi tiết</div><h2>${titleMap[kind] || "Chi tiết"}</h2></div>
      <button class="ghost-btn" data-action="close-editor">Đóng</button>
    </div>
    ${renderEditorBody()}
  `;
}

function renderEditorBody() {
  const { kind, item } = state.editor;
  if (kind === "createUser")      return createUserForm();
  if (kind === "user")            return userForm(item);
  if (kind === "role")            return roleForm(item);
  if (kind === "group")           return groupForm(item);
  if (kind === "organization")    return organizationForm(item);
  if (kind === "rolePermissions") return rolePermissionsChecklist();
  if (kind === "groupUsers")      return groupUsersChecklist();
  if (kind === "groupRoles")      return groupRolesChecklist();
  if (kind === "userGroups")      return userGroupsReadonly();
  if (kind === "permissionDetail") return permissionDetailView(item);
  return "";
}

/* ── Forms ─────────────────────────────────────────────────── */

function createUserForm() {
  return formWrap("create-user-form", "", `
    ${input("username", "Tên đăng nhập", "")}
    ${input("fullName", "Họ và tên", "")}
    ${input("email", "Email", "", "email")}
    ${input("password", "Mật khẩu", "", "password")}
    ${input("phone", "Số điện thoại", "", "tel", false)}
    ${input("organizationId", "Mã đơn vị (ID)", "", "number", false)}
  `, "Thêm người dùng");
}

function userForm(item) {
  return formWrap("user-form", item.id, `
    ${input("email", "Email", item.email || "", "email")}
    ${input("fullName", "Họ và tên", item.fullName || "")}
    ${input("phone", "Số điện thoại", item.phone || "", "tel", false)}
    ${input("organizationId", "Mã đơn vị (ID)", item.organizationId || "", "number", false)}
    ${input("password", "Mật khẩu mới", "", "password", false)}
  `, "Lưu thay đổi");
}

function roleForm(item) {
  return formWrap("role-form", item.id || "", `
    ${input("code", "Mã vai trò", item.code || "")}
    ${input("name", "Tên vai trò", item.name || "")}
    ${textarea("description", "Mô tả", item.description || "")}
    ${selectField("status", "Trạng thái", item.status || "ACTIVE", [
      { value: "ACTIVE", label: "Hoạt động" },
      { value: "INACTIVE", label: "Ngừng hoạt động" }
    ])}
  `, item.id ? "Lưu vai trò" : "Tạo vai trò");
}

function groupForm(item) {
  return formWrap("group-form", item.id || "", `
    ${input("code", "Mã nhóm", item.code || "")}
    ${input("name", "Tên nhóm", item.name || "")}
    ${textarea("description", "Mô tả", item.description || "")}
    ${input("organizationId", "Mã đơn vị (ID)", item.organizationId || "", "number", false)}
    ${item.id ? selectField("status", "Trạng thái", item.status || "ACTIVE", [
      { value: "ACTIVE", label: "Hoạt động" },
      { value: "DISABLED", label: "Vô hiệu hóa" }
    ]) : ""}
  `, item.id ? "Lưu nhóm" : "Tạo nhóm");
}

function organizationForm(item) {
  return formWrap("organization-form", item.id || "", `
    ${input("code", "Mã đơn vị", item.code || "")}
    ${input("name", "Tên đơn vị", item.name || "")}
    ${textarea("description", "Mô tả", item.description || "")}
    ${input("parentId", "ID đơn vị cha", item.parentId || "", "number", false)}
    ${item.id ? selectField("status", "Trạng thái", item.status || "ACTIVE", [
      { value: "ACTIVE", label: "Hoạt động" },
      { value: "DISABLED", label: "Vô hiệu hóa" }
    ]) : ""}
  `, item.id ? "Lưu đơn vị" : "Tạo đơn vị");
}

function permissionDetailView(item) {
  return `
    <div class="detail-grid">
      <div class="detail-row"><span class="meta">ID</span><strong>${item.id}</strong></div>
      <div class="detail-row"><span class="meta">Mã quyền</span><strong>${escapeHtml(item.code || "—")}</strong></div>
      <div class="detail-row"><span class="meta">Tên</span><strong>${escapeHtml(item.name || "—")}</strong></div>
      <div class="detail-row"><span class="meta">Tài nguyên</span><span class="pill">${escapeHtml(item.resource || "—")}</span></div>
      <div class="detail-row"><span class="meta">Hành động</span><strong>${escapeHtml(item.action || "—")}</strong></div>
      <div class="detail-row"><span class="meta">Hiệu lực</span><span class="pill ${item.effect === "ALLOW" ? "pill-allow" : "pill-deny"}">${item.effect || "—"}</span></div>
      <div class="detail-row"><span class="meta">Ngày tạo</span><strong>${formatDate(item.createdAt)}</strong></div>
      <div class="detail-row"><span class="meta">Cập nhật</span><strong>${formatDate(item.updatedAt)}</strong></div>
    </div>
    <div class="editor-actions">
      <button class="primary-btn" data-action="toggle-permission-effect" data-id="${item.id}">${item.effect === "ALLOW" ? "Chuyển sang DENY" : "Chuyển sang ALLOW"}</button>
    </div>
  `;
}

/* ── Checklist Forms ───────────────────────────────────────── */

function rolePermissionsChecklist() {
  const { item, permissions, assignedIds } = state.editor;
  return `
    <p class="meta">Vai trò: <strong>${escapeHtml(item?.name || "")}</strong> (${escapeHtml(item?.code || "")})</p>
    <form id="role-permissions-form" data-id="${item?.id}">
      <fieldset class="checkbox-list">
        <legend>Danh sách quyền</legend>
        ${(permissions || []).map(p => `
          <label class="check-item">
            <input type="checkbox" name="items" value="${p.id}" ${assignedIds.includes(p.id) ? "checked" : ""}>
            <span><strong>${escapeHtml(p.name || p.code)}</strong><br><span class="meta">${escapeHtml(p.code || "")} • ${p.effect || ""}</span></span>
          </label>
        `).join("")}
      </fieldset>
      <div class="editor-actions"><button class="primary-btn" type="submit">Lưu quyền</button></div>
    </form>
  `;
}

function groupUsersChecklist() {
  const { item, allUsers, memberIds } = state.editor;
  return `
    <p class="meta">Nhóm: <strong>${escapeHtml(item?.name || "")}</strong></p>
    <form id="group-users-form" data-id="${item?.id}">
      <fieldset class="checkbox-list">
        <legend>Danh sách người dùng</legend>
        ${(allUsers || []).map(u => `
          <label class="check-item">
            <input type="checkbox" name="items" value="${u.id}" ${memberIds.includes(u.id) ? "checked" : ""}>
            <span><strong>${escapeHtml(u.fullName || u.username)}</strong><br><span class="meta">${escapeHtml(u.email || "")}</span></span>
          </label>
        `).join("")}
      </fieldset>
      <div class="editor-actions"><button class="primary-btn" type="submit">Lưu thành viên</button></div>
    </form>
  `;
}

function groupRolesChecklist() {
  const { item, allRoles, assignedIds } = state.editor;
  return `
    <p class="meta">Nhóm: <strong>${escapeHtml(item?.name || "")}</strong></p>
    <form id="group-roles-form" data-id="${item?.id}">
      <fieldset class="checkbox-list">
        <legend>Danh sách vai trò</legend>
        ${(allRoles || []).map(r => `
          <label class="check-item">
            <input type="checkbox" name="items" value="${r.id}" ${assignedIds.includes(r.id) ? "checked" : ""}>
            <span><strong>${escapeHtml(r.name)}</strong><br><span class="meta">${escapeHtml(r.code || "")} • ${r.status || ""}</span></span>
          </label>
        `).join("")}
      </fieldset>
      <div class="editor-actions"><button class="primary-btn" type="submit">Lưu vai trò</button></div>
    </form>
  `;
}

function userGroupsReadonly() {
  const { item, groups } = state.editor;
  if (!groups.length) {
    return `<p class="meta">Người dùng <strong>${escapeHtml(item?.fullName || item?.username || "")}</strong> chưa thuộc nhóm nào.</p>`;
  }
  return `
    <p class="meta">Người dùng: <strong>${escapeHtml(item?.fullName || item?.username || "")}</strong></p>
    <div class="detail-grid">
      ${groups.map(g => `
        <div class="detail-row">
          <span class="pill">${escapeHtml(g.groupName || g.name || "Nhóm #" + (g.groupId || g.id))}</span>
          <span class="meta">${formatDate(g.joinedAt || g.assignedAt || g.createdAt)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/* ── Form Helpers ──────────────────────────────────────────── */

function formWrap(id, itemId, body, cta) {
  return `<form id="${id}" data-id="${itemId}"><div class="form-grid">${body}</div><div class="editor-actions"><button class="primary-btn" type="submit">${cta}</button></div></form>`;
}

function input(name, label, value, type = "text", required = true) {
  return `<div class="input-group"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""}></div>`;
}

function textarea(name, label, value) {
  return `<div class="input-group"><label for="${name}">${label}</label><textarea id="${name}" name="${name}">${escapeHtml(value)}</textarea></div>`;
}

function selectField(name, label, value, options) {
  const opts = options.map(o => `<option value="${o.value}" ${o.value === value ? "selected" : ""}>${o.label}</option>`).join("");
  return `<div class="input-group"><label for="${name}">${label}</label><select id="${name}" name="${name}">${opts}</select></div>`;
}

function field(label, name, type, placeholder) {
  return `<div class="input-group"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}" required></div>`;
}

function navButton(section, label, current) {
  return `<button class="nav-btn ${section === current ? "active" : ""}" data-action="switch-section" data-section="${section}">${label}</button>`;
}

function stat(label, value) {
  return `<div class="stat-card"><span class="kicker">${label}</span><strong>${value}</strong></div>`;
}

function statusBadge(status) {
  const map = {
    ACTIVE:   { label: "Hoạt động",     cls: "pill-success" },
    LOCKED:   { label: "Bị khóa",       cls: "pill-danger" },
    DISABLED: { label: "Vô hiệu",       cls: "pill-muted" },
    PENDING:  { label: "Chờ kích hoạt",  cls: "pill-warning" },
    INACTIVE: { label: "Ngừng hoạt động", cls: "pill-muted" }
  };
  const s = map[status] || { label: status || "—", cls: "pill-muted" };
  return `<span class="pill ${s.cls}">${s.label}</span>`;
}

function renderStatus() {
  if (!state.status) return "";
  return `<div class="status-banner ${state.status.type}">${state.status.message}</div>`;
}

/* ═══════════════════════════════════════════════════════════════
   API CLIENT — Microservice Gateway (port 8084)
   ═══════════════════════════════════════════════════════════════ */

// Auth
function apiLogin(body)  { return request("/api/auth/login", { method: "POST", body }); }

// Users
function listUsers(page = 0, size = 20)    { return authRequest(`${API_PREFIX}/users?page=${page}&size=${size}`); }
function getUser(id)                        { return authRequest(`${API_PREFIX}/users/${id}`); }
function createUser(body)                   { return authRequest(`${API_PREFIX}/users`, { method: "POST", body }); }
function updateUser(id, body)               { return authRequest(`${API_PREFIX}/users/${id}`, { method: "PUT", body }); }
function deleteUser(id)                     { return authRequest(`${API_PREFIX}/users/${id}`, { method: "DELETE" }); }
function lockUser(id, reason)               { return authRequest(`${API_PREFIX}/users/${id}/lock`, { method: "POST", body: { reason } }); }
function unlockUser(id)                     { return authRequest(`${API_PREFIX}/users/${id}/unlock`, { method: "POST" }); }

// Roles
function listRoles(page = 0, size = 50)    { return authRequest(`${API_PREFIX}/roles?page=${page}&size=${size}`); }
function getRole(id)                        { return authRequest(`${API_PREFIX}/roles/${id}`); }
function createRole(body)                   { return authRequest(`${API_PREFIX}/roles`, { method: "POST", body }); }
function updateRole(id, body)               { return authRequest(`${API_PREFIX}/roles/${id}`, { method: "PUT", body }); }
function deleteRole(id)                     { return authRequest(`${API_PREFIX}/roles/${id}`, { method: "DELETE" }); }
function assignRolePermissions(id, permissionIds) { return authRequest(`${API_PREFIX}/roles/${id}/permissions`, { method: "POST", body: { permissionIds } }); }
function removeRolePermission(roleId, permId)     { return authRequest(`${API_PREFIX}/roles/${roleId}/permissions/${permId}`, { method: "DELETE" }); }
function listRolePermissions(roleId, page = 0, size = 100) { return authRequest(`${API_PREFIX}/roles/permissions/${roleId}?page=${page}&size=${size}`); }
function listRoleGroups(roleId, page = 0, size = 50)       { return authRequest(`${API_PREFIX}/roles/groups/${roleId}?page=${page}&size=${size}`); }

// Permissions
function listPermissions(page = 0, size = 50) { return authRequest(`${API_PREFIX}/permissions?page=${page}&size=${size}`); }
function getPermission(id)                     { return authRequest(`${API_PREFIX}/permissions/${id}`); }
function togglePermissionEffect(id)            { return authRequest(`${API_PREFIX}/permissions/${id}/toggle-effect`, { method: "PUT" }); }
function getPermissionTree(page = 0, size = 50) { return authRequest(`${API_PREFIX}/permissions/permission-tree?page=${page}&size=${size}`); }

// Groups
function listGroups(page = 0, size = 50)   { return authRequest(`${API_PREFIX}/groups?page=${page}&size=${size}`); }
function getGroup(id)                       { return authRequest(`${API_PREFIX}/groups/${id}`); }
function createGroup(body)                  { return authRequest(`${API_PREFIX}/groups`, { method: "POST", body }); }
function updateGroup(id, body)              { return authRequest(`${API_PREFIX}/groups/${id}`, { method: "PUT", body }); }
function deleteGroup(id)                    { return authRequest(`${API_PREFIX}/groups/${id}`, { method: "DELETE" }); }
function assignGroupUsers(id, userIds)      { return authRequest(`${API_PREFIX}/groups/${id}/users`, { method: "POST", body: { userIds } }); }
function removeGroupUser(groupId, userId)   { return authRequest(`${API_PREFIX}/groups/${groupId}/users/${userId}`, { method: "DELETE" }); }
function listGroupUsers(id)                 { return authRequest(`${API_PREFIX}/groups/${id}/users`); }
function assignGroupRoles(id, roleIds)      { return authRequest(`${API_PREFIX}/groups/${id}/roles`, { method: "POST", body: { roleIds } }); }
function removeGroupRole(groupId, roleId)   { return authRequest(`${API_PREFIX}/groups/${groupId}/roles/${roleId}`, { method: "DELETE" }); }
function listGroupRoles(groupId, page = 0, size = 50) { return authRequest(`${API_PREFIX}/groups/roles/${groupId}?page=${page}&size=${size}`); }
function listUserGroups(userId)             { return authRequest(`${API_PREFIX}/groups/by-user/${userId}`); }

// Organizations
function listOrganizations(page = 0, size = 50) { return authRequest(`${API_PREFIX}/organizations?page=${page}&size=${size}`); }
function getOrganization(id)                     { return authRequest(`${API_PREFIX}/organizations/${id}`); }
function createOrganization(body)                { return authRequest(`${API_PREFIX}/organizations`, { method: "POST", body }); }
function updateOrganization(id, body)            { return authRequest(`${API_PREFIX}/organizations/${id}`, { method: "PUT", body }); }
function deleteOrganization(id)                  { return authRequest(`${API_PREFIX}/organizations/${id}`, { method: "DELETE" }); }
function getOrganizationTree(id)                 { return authRequest(`${API_PREFIX}/organizations/${id}/tree`); }

/* ── HTTP Layer ────────────────────────────────────────────── */

async function authRequest(path, options = {}, retry = true) {
  const token = state.session?.accessToken;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    return await request(path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  } catch (error) {
    if (retry && error.status === 401 && state.session?.refreshToken) {
      await refreshSession();
      return authRequest(path, options, false);
    }
    if (error.status === 401) clearAuthCache();
    throw error;
  }
}

async function refreshSession() {
  const data = await request("/api/auth/refresh-token", {
    method: "POST",
    body: { refreshToken: state.session.refreshToken }
  });
  // data = { accessToken, refreshToken, ... }
  saveSession({ ...state.session, accessToken: data.accessToken, refreshToken: data.refreshToken });
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  // Don't set Content-Type for GET/DELETE without body
  if ((!options.body) && (options.method === "GET" || options.method === "DELETE" || !options.method)) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) return null;

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const msg = json?.status?.displayMessage
             || json?.status?.message
             || json?.message
             || `Yêu cầu không thành công. Mã lỗi ${response.status}.`;
    const error = new Error(msg);
    error.status = response.status;
    error.traceId = json?.status?.traceId;
    throw error;
  }

  // Unwrap BaseResponseDto: { status, data } → return data
  if (json && json.status && json.data !== undefined) {
    return json.data;
  }
  // Fallback: return raw json if not wrapped
  return json;
}

/* ── Helpers ───────────────────────────────────────────────── */

async function safeRequest(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 401) throw error; // propagate auth errors
    console.warn("API error:", error.message);
    return null;
  }
}

function extractPage(response) {
  if (response && Array.isArray(response.content)) {
    return {
      items: response.content,
      totalElements: response.totalElements || 0,
      totalPages: response.totalPages || 1,
      page: response.number || 0,
      size: response.size || 10
    };
  }
  // If response is already an array
  const items = Array.isArray(response) ? response : [];
  return { items, totalElements: items.length, totalPages: 1, page: 0, size: items.length };
}

function normalizeUser(user) {
  return {
    ...user,
    fullName: user.fullName || user.username || "",
    status: user.status || "ACTIVE"
  };
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setStatus(type, message) {
  state.status = message ? { type, message } : null;
}

function fail(error) {
  setStatus("error", error.message || "Có lỗi xảy ra.");
  render();
}

function hasAccess() {
  return Boolean(state.session?.accessToken);
}

function saveSession(session) {
  state.session = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearAuthCache() {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}
