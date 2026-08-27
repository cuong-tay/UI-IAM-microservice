/* ═══════════════════════════════════════════════════════════════
   Admin View — Dashboard chính với 5 module:
   Users, Roles, Permissions, Groups, Organizations
   ═══════════════════════════════════════════════════════════════ */

import {
  escapeHtml, formatDate, statusBadge, effectBadge, userAvatar, icons,
  input, textarea, selectField, formWrap, renderStatus
} from "./helpers.js";

/* ── Section metadata ──────────────────────────────────────── */

const sectionMeta = {
  users: {
    title: "Quản lý Người Dùng",
    subtitle: "Tra cứu danh sách tài khoản, phân bổ đơn vị và kiểm soát trạng thái truy cập.",
    icon: icons.users,
    badgeText: "Tài khoản"
  },
  roles: {
    title: "Quản lý Vai Trò",
    subtitle: "Thiết lập các vai trò bảo mật và phân quyền chức năng chi tiết cho hệ thống.",
    icon: icons.roles,
    badgeText: "Vai trò"
  },
  permissions: {
    title: "Danh mục Quyền Truy Cập",
    subtitle: "Xem toàn bộ ma trận quyền hạn API và cấu hình chính sách ALLOW / DENY trực tiếp.",
    icon: icons.permissions,
    badgeText: "Quyền hạn"
  },
  groups: {
    title: "Quản lý Nhóm & Phòng Ban",
    subtitle: "Tập hợp người dùng theo nhóm chuyên trách để phân quyền đồng loạt nhanh chóng.",
    icon: icons.groups,
    badgeText: "Nhóm"
  },
  organizations: {
    title: "Cơ Cấu Tổ Chức & Đơn Vị",
    subtitle: "Sơ đồ cây phân cấp đơn vị, phòng ban và các chi nhánh trong toàn hệ thống.",
    icon: icons.organizations,
    badgeText: "Đơn vị"
  }
};

/* ── Main Layout ───────────────────────────────────────────── */

export function renderAdminView(state) {
  const current = state.section;
  const meta = sectionMeta[current] || { title: current, subtitle: "", icon: "", badgeText: "" };
  const user = state.accessContext?.user || state.session?.user || state.session || {};
  const username = user.username || state.session?.username || "";
  const fullName = user.fullName || state.session?.fullName || "";
  const email = user.email || state.session?.email || "";

  // Tên hiển thị ưu tiên: Họ tên đầy đủ > Username > Email > "Người dùng"
  const displayName = fullName || username || email || "Người dùng";
  const avatarKey = fullName || username || email || "U";

  // Role badge xác định theo vai trò thực tế
  let roleBadge = "Người dùng";
  const unameLower = username.toLowerCase();
  const isSuperAdmin = Boolean(
    state.accessContext?.isSystemAdmin ||
    unameLower === "admin" ||
    (user.roles && user.roles.some(r => {
      const s = String(r.name || r.code || r).toUpperCase();
      return s === "ADMIN" || s === "SUPER_ADMIN" || s === "ROLE_ADMIN" || s === "ROLE_SUPER_ADMIN";
    }))
  );

  if (isSuperAdmin) {
    roleBadge = "Super Admin";
  } else if (user.roles && user.roles.length > 0) {
    const firstRole = user.roles[0];
    roleBadge = typeof firstRole === "string" ? firstRole : (firstRole.name || firstRole.code || "Thành viên");
  } else if (user.roleName) {
    roleBadge = user.roleName;
  } else if (user.organizationName) {
    roleBadge = user.organizationName;
  } else {
    roleBadge = "Thành viên";
  }

  const totalUsers = state.data.users.length;
  const totalRoles = state.data.roles.length;
  const totalPerms = state.data.permissions.length;
  const totalGroups = state.data.groups.length;
  const totalOrgs = state.data.organizations.length;

  return `
    <div class="admin-shell">
      <!-- ═══ LEFT SIDEBAR ═══ -->
      <aside class="app-sidebar">
        <div class="sidebar-brand">
          <div class="brand-badge">
            <span class="brand-logo-text">IAM</span>
          </div>
          <div class="brand-text">
            <strong>Security Console</strong>
            <span class="brand-sub">Microservice Gateway</span>
          </div>
        </div>

        <div class="sidebar-nav-section">
          <span class="nav-section-title">HỆ THỐNG QUẢN TRỊ</span>
          <nav class="nav-stack">
            ${navItem("users", meta.badgeText, "Người dùng", icons.users, totalUsers, current)}
            ${navItem("roles", meta.badgeText, "Vai trò", icons.roles, totalRoles, current)}
            ${navItem("permissions", meta.badgeText, "Quyền truy cập", icons.permissions, totalPerms, current)}
            ${navItem("groups", meta.badgeText, "Nhóm tài khoản", icons.groups, totalGroups, current)}
            ${navItem("organizations", meta.badgeText, "Đơn vị tổ chức", icons.organizations, totalOrgs, current)}
          </nav>
        </div>

        <!-- Sidebar Footer / User profile -->
        <div class="sidebar-footer">
          <div class="user-profile-card is-clickable" data-action="view-self-profile" title="Xem thông tin cá nhân, tổ chức, nhóm & quyền hạn">
            ${userAvatar(avatarKey, username || displayName)}
            <div class="user-profile-info">
              <strong class="user-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</strong>
              <span class="user-role-badge">${escapeHtml(roleBadge)}</span>
            </div>
            <button class="logout-mini-btn" data-action="logout" title="Đăng xuất (${escapeHtml(displayName)})">
              ${icons.logout}
            </button>
          </div>
        </div>
      </aside>

      <!-- ═══ MAIN WORKSPACE ═══ -->
      <main class="app-main">
        <!-- Topbar -->
        <header class="app-topbar">
          <div class="topbar-left">
            <div class="breadcrumb">
              <span class="breadcrumb-root">IAM Portal</span>
              <span class="breadcrumb-sep">/</span>
              <span class="breadcrumb-current">${meta.title}</span>
            </div>
            <h1 class="page-title">${meta.title}</h1>
          </div>

          <div class="topbar-right">
            <!-- Search Input -->
            <div class="search-box">
              <span class="search-icon">${icons.search}</span>
              <input
                type="text"
                class="search-input"
                placeholder="Tìm kiếm ${meta.badgeText.toLowerCase()}..."
                value="${escapeHtml(state.searchQuery || "")}"
                data-action="search-input"
              >
              ${state.searchQuery ? `<button class="search-clear-btn" data-action="clear-search" title="Xóa tìm kiếm">&times;</button>` : ""}
            </div>

            <!-- Toolbar buttons -->
            <div class="action-toolbar">
              <button class="btn-icon-only theme-toggle-btn" data-action="toggle-theme" title="Chuyển chế độ Sáng / Tối (${state.theme === 'dark' ? 'Đang dùng Dark Mode' : 'Đang dùng Light Mode'})">
                ${state.theme === 'dark' ? icons.sun : icons.moon}
              </button>
              <button class="btn-secondary" data-action="refresh-all" title="Làm mới dữ liệu">
                <span class="btn-icon">${icons.refresh}</span>
                <span class="btn-label">Làm mới</span>
              </button>
              ${current === "users" ? `
                <button class="btn-secondary" data-action="import-users" title="Nhập danh sách từ Excel">
                  <span class="btn-icon">${icons.upload}</span>
                  <span class="btn-label">Import</span>
                </button>
                <button class="btn-secondary" data-action="export-users" title="Xuất dữ liệu Excel">
                  <span class="btn-icon">${icons.download}</span>
                  <span class="btn-label">Export</span>
                </button>
              ` : ""}
              ${renderCreateButton(current)}
            </div>
          </div>
        </header>

        <!-- Main Content Body -->
        <div class="app-content-body">
          ${renderStatus(state.status)}

          <!-- Stats Overview Bar -->
          ${renderStatsCards(current, state)}

          <!-- Data Table Card -->
          <div class="data-card">
            <div class="data-card-header">
              <div class="data-card-title">
                <h2>Danh sách ${meta.title}</h2>
                <span class="record-counter">${getFilteredRows(state, current).length} bản ghi</span>
              </div>
            </div>

            ${renderTable(current, state)}
            ${renderPagination(current, state.pagination)}
          </div>
        </div>
      </main>

      <!-- ═══ SLIDE-OVER DRAWER (EDITOR PANEL) ═══ -->
      ${renderDrawer(state)}
    </div>
  `;
}

/* ── Navigation Item Helper ────────────────────────────────── */

function navItem(section, badgeText, label, iconSvg, count, currentSection) {
  const isActive = section === currentSection;
  return `
    <button class="nav-item ${isActive ? "active" : ""}" data-action="switch-section" data-section="${section}">
      <span class="nav-item-icon">${iconSvg}</span>
      <span class="nav-item-label">${label}</span>
      <span class="nav-item-count">${count}</span>
    </button>
  `;
}

/* ── Create buttons per section ────────────────────────────── */

function renderCreateButton(section) {
  const map = {
    users:         `<button class="btn-primary" data-action="create-user"><span class="btn-icon">${icons.plus}</span><span>Thêm người dùng</span></button>`,
    roles:         `<button class="btn-primary" data-action="create-role"><span class="btn-icon">${icons.plus}</span><span>Tạo vai trò</span></button>`,
    groups:        `<button class="btn-primary" data-action="create-group"><span class="btn-icon">${icons.plus}</span><span>Tạo nhóm</span></button>`,
    organizations: `<button class="btn-primary" data-action="create-organization"><span class="btn-icon">${icons.plus}</span><span>Tạo đơn vị</span></button>`
  };
  return map[section] || "";
}

/* ── Stats Overview Cards ──────────────────────────────────── */

function renderStatsCards(section, state) {
  const users = state.data.users || [];
  const roles = state.data.roles || [];
  const groups = state.data.groups || [];
  const orgs = state.data.organizations || [];

  if (section === "users") {
    const activeCount = users.filter(u => u.status === "ACTIVE").length;
    const lockedCount = users.filter(u => u.status === "LOCKED").length;
    return `
      <div class="stats-overview-grid">
        ${statCard("Tổng người dùng", users.length, icons.users, "Tài khoản trong hệ thống")}
        ${statCard("Đang hoạt động", activeCount, icons.checkCircle, "Sẵn sàng truy cập", "stat-success")}
        ${statCard("Tài khoản bị khóa", lockedCount, icons.lock, "Cần kiểm tra lý do", lockedCount > 0 ? "stat-danger" : "")}
        ${statCard("Đơn vị trực thuộc", orgs.length, icons.building, "Các chi nhánh & phòng ban")}
      </div>
    `;
  }

  if (section === "roles") {
    const sysRoles = roles.filter(r => r.system).length;
    return `
      <div class="stats-overview-grid">
        ${statCard("Tổng số vai trò", roles.length, icons.roles, "Vai trò bảo mật")}
        ${statCard("Vai trò hệ thống", sysRoles, icons.gear, "Cố định bởi nền tảng")}
        ${statCard("Vai trò tùy chỉnh", roles.length - sysRoles, icons.star, "Do quản trị viên tạo")}
        ${statCard("Nhóm đang phân quyền", groups.length, icons.groups, "Nhóm được gán vai trò")}
      </div>
    `;
  }

  if (section === "permissions") {
    const perms = state.data.permissions || [];
    const allowCount = perms.filter(p => p.effect === "ALLOW").length;
    const denyCount = perms.filter(p => p.effect === "DENY").length;
    return `
      <div class="stats-overview-grid">
        ${statCard("Tổng quyền API", perms.length, icons.key, "Định nghĩa trong hệ thống")}
        ${statCard("Quyền hiệu lực (ALLOW)", allowCount, icons.checkCircle, "Được phép thực thi", "stat-success")}
        ${statCard("Quyền bị cấm (DENY)", denyCount, icons.xCircle, "Chặn truy cập trực tiếp", denyCount > 0 ? "stat-danger" : "")}
        ${statCard("Tài nguyên (Resources)", new Set(perms.map(p => p.resource)).size, icons.folder, "Mô đun bảo vệ")}
      </div>
    `;
  }

  if (section === "groups") {
    return `
      <div class="stats-overview-grid">
        ${statCard("Tổng số nhóm", groups.length, icons.groups, "Nhóm người dùng")}
        ${statCard("Đơn vị liên kết", orgs.length, icons.building, "Cơ cấu tổ chức")}
        ${statCard("Người dùng đã phân bổ", users.length, icons.users, "Thành viên hệ thống")}
        ${statCard("Vai trò sẵn sàng", roles.length, icons.roles, "Có thể gán cho nhóm")}
      </div>
    `;
  }

  if (section === "organizations") {
    return `
      <div class="stats-overview-grid">
        ${statCard("Tổng đơn vị", orgs.length, icons.building, "Chi nhánh & phòng ban")}
        ${statCard("Nhóm trực thuộc", groups.length, icons.groups, "Tổ chức chuyên môn")}
        ${statCard("Nhân sự toàn hệ thống", users.length, icons.users, "Tổng số tài khoản")}
        ${statCard("Cấp quản trị cao nhất", "Trụ sở chính", icons.landmark, "Root Organization")}
      </div>
    `;
  }

  return "";
}

function statCard(title, value, iconEmoji, desc, extraClass = "") {
  return `
    <div class="stat-card ${extraClass}">
      <div class="stat-card-top">
        <span class="stat-card-title">${title}</span>
        <span class="stat-card-icon">${iconEmoji}</span>
      </div>
      <div class="stat-card-value">${value}</div>
      <div class="stat-card-desc">${desc}</div>
    </div>
  `;
}

/* ── Filter / Search Logic ─────────────────────────────────── */

function getFilteredRows(state, section) {
  const rows = state.data[section] || [];
  const q = (state.searchQuery || "").trim().toLowerCase();
  if (!q) return rows;

  return rows.filter(item => {
    if (section === "users") {
      return (item.fullName && item.fullName.toLowerCase().includes(q)) ||
             (item.username && item.username.toLowerCase().includes(q)) ||
             (item.email && item.email.toLowerCase().includes(q)) ||
             (item.organizationName && item.organizationName.toLowerCase().includes(q)) ||
             String(item.id).includes(q);
    }
    if (section === "roles") {
      return (item.name && item.name.toLowerCase().includes(q)) ||
             (item.code && item.code.toLowerCase().includes(q)) ||
             (item.description && item.description.toLowerCase().includes(q));
    }
    if (section === "permissions") {
      return (item.name && item.name.toLowerCase().includes(q)) ||
             (item.code && item.code.toLowerCase().includes(q)) ||
             (item.resource && item.resource.toLowerCase().includes(q)) ||
             (item.action && item.action.toLowerCase().includes(q));
    }
    if (section === "groups") {
      return (item.name && item.name.toLowerCase().includes(q)) ||
             (item.code && item.code.toLowerCase().includes(q)) ||
             (item.organizationName && item.organizationName.toLowerCase().includes(q));
    }
    if (section === "organizations") {
      return (item.name && item.name.toLowerCase().includes(q)) ||
             (item.code && item.code.toLowerCase().includes(q)) ||
             (item.description && item.description.toLowerCase().includes(q));
    }
    return true;
  });
}

/* ═══════════════════════════════════════════════════════════════
   TABLES
   ═══════════════════════════════════════════════════════════════ */

function renderTable(section, state) {
  const rows = getFilteredRows(state, section);
  if (!rows.length) {
    return `
      <div class="empty-state-card">
        <div class="empty-state-icon">${icons.search}</div>
        <h3>Không tìm thấy dữ liệu</h3>
        <p class="muted">Không có kết quả nào phù hợp với bộ lọc hiện tại. Thử xóa từ khóa tìm kiếm hoặc bấm <strong>Làm mới</strong>.</p>
        ${state.searchQuery ? `<button class="btn-secondary" data-action="clear-search">Xóa tìm kiếm</button>` : ""}
      </div>
    `;
  }

  const heads = {
    users:         ["Người dùng", "Thông tin liên hệ", "Đơn vị & Trạng thái", "Thao tác"],
    roles:         ["Tên vai trò", "Mô tả vai trò", "Trạng thái", "Thao tác"],
    permissions:   ["Tên quyền hạn", "Tài nguyên / Hành động", "Hiệu lực", "Thao tác"],
    groups:        ["Nhóm tài khoản", "Mô tả nhóm", "Đơn vị & Trạng thái", "Thao tác"],
    organizations: ["Tên đơn vị", "Mã & Đường dẫn cấp", "Trạng thái", "Thao tác"]
  };
  const head = heads[section] || ["Tên", "Mô tả", "Chi tiết", "Thao tác"];

  return `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            ${head.map((h, i) => `<th class="${i === head.length - 1 ? 'th-actions' : ''}">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(item => renderRow(section, item)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRow(section, item) {
  if (section === "users")         return renderUserRow(item);
  if (section === "roles")         return renderRoleRow(item);
  if (section === "permissions")   return renderPermissionRow(item);
  if (section === "groups")        return renderGroupRow(item);
  if (section === "organizations") return renderOrgRow(item);
  return "";
}

/* ── User rows ─────────────────────────────────────────────── */

function renderUserRow(item) {
  const isLocked = item.status === "LOCKED";
  return `
    <tr class="table-data-row ${isLocked ? 'row-locked' : ''}">
      <td>
        <div class="user-cell">
          ${userAvatar(item.fullName, item.username)}
          <div class="user-cell-meta">
            <strong class="user-cell-name">${escapeHtml(item.fullName || item.username || "—")}</strong>
            <span class="user-cell-sub">@${escapeHtml(item.username || "")} • ID #${item.id}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="contact-cell">
          <span class="contact-email">${escapeHtml(item.email || "—")}</span>
          <span class="contact-phone">${escapeHtml(item.phone || "Chưa có SĐT")}</span>
        </div>
      </td>
      <td>
        <div class="status-org-cell">
          ${statusBadge(item.status)}
          ${item.organizationName ? `<span class="org-cell-tag" title="Đơn vị: ${escapeHtml(item.organizationName)}">${icons.building} ${escapeHtml(item.organizationName)}</span>` : ""}
        </div>
      </td>
      <td class="td-actions">
        <div class="row-action-group">
          <button class="action-btn" data-action="edit-user" data-id="${item.id}" title="Chỉnh sửa thông tin">
            ${icons.edit} <span>Sửa</span>
          </button>
          <button class="action-btn" data-action="user-groups" data-id="${item.id}" title="Quản lý nhóm của user">
            ${icons.groups} <span>Nhóm</span>
          </button>
          <button class="action-btn" data-action="user-permissions" data-id="${item.id}" title="Xem quyền hiệu lực">
            ${icons.key} <span>Quyền</span>
          </button>
          ${isLocked ? `
            <button class="action-btn btn-unlock" data-action="unlock-user" data-id="${item.id}" title="Mở khóa tài khoản">
              ${icons.unlock} <span>Mở</span>
            </button>
          ` : `
            <button class="action-btn btn-lock" data-action="lock-user" data-id="${item.id}" title="Khóa tài khoản">
              ${icons.lock} <span>Khóa</span>
            </button>
          `}
          <button class="action-btn btn-delete" data-action="delete-user" data-id="${item.id}" title="Xóa người dùng">
            ${icons.trash}
          </button>
        </div>
      </td>
    </tr>
  `;
}

/* ── Role rows ─────────────────────────────────────────────── */

function renderRoleRow(item) {
  return `
    <tr class="table-data-row">
      <td>
        <div class="role-cell">
          <strong class="role-name">${escapeHtml(item.name || "—")}</strong>
          <code class="role-code">${escapeHtml(item.code || "")}</code>
          ${item.system ? `<span class="badge-system">Hệ thống</span>` : ""}
        </div>
      </td>
      <td>
        <div class="desc-cell">${item.description ? escapeHtml(item.description) : `<span class="muted-italic">Chưa có mô tả</span>`}</div>
      </td>
      <td>
        ${statusBadge(item.status)}
      </td>
      <td class="td-actions">
        <div class="row-action-group">
          <button class="action-btn" data-action="edit-role" data-id="${item.id}" title="Sửa vai trò">
            ${icons.edit} <span>Sửa</span>
          </button>
          <button class="action-btn" data-action="role-permissions" data-id="${item.id}" title="Gán quyền cho vai trò">
            ${icons.permissions} <span>Gán quyền</span>
          </button>
          <button class="action-btn" data-action="role-groups" data-id="${item.id}" title="Xem nhóm được gán">
            ${icons.groups} <span>Nhóm</span>
          </button>
          ${item.system ? "" : `
            <button class="action-btn btn-delete" data-action="delete-role" data-id="${item.id}" title="Xóa vai trò">
              ${icons.trash}
            </button>
          `}
        </div>
      </td>
    </tr>
  `;
}

/* ── Permission rows ───────────────────────────────────────── */

function renderPermissionRow(item) {
  return `
    <tr class="table-data-row">
      <td>
        <div class="perm-cell">
          <strong class="perm-name">${escapeHtml(item.name || "—")}</strong>
          <code class="perm-code">${escapeHtml(item.code || "")}</code>
        </div>
      </td>
      <td>
        <div class="resource-action-cell">
          <span class="resource-badge">${icons.folder} ${escapeHtml(item.resource || "—")}</span>
          <span class="action-badge">${icons.zap} ${escapeHtml(item.action || "")}</span>
        </div>
      </td>
      <td>
        ${effectBadge(item.effect)}
      </td>
      <td class="td-actions">
        <div class="row-action-group">
          <button class="action-btn" data-action="edit-permission" data-id="${item.id}" title="Xem chi tiết quyền">
            ${icons.edit} <span>Chi tiết</span>
          </button>
          <button class="action-btn ${item.effect === 'ALLOW' ? 'btn-toggle-deny' : 'btn-toggle-allow'}" data-action="toggle-permission-effect" data-id="${item.id}" title="Chuyển đổi ALLOW / DENY">
            ${icons.zap} <span>${item.effect === "ALLOW" ? "Chuyển DENY" : "Chuyển ALLOW"}</span>
          </button>
          <button class="action-btn" data-action="permission-roles" data-id="${item.id}" title="Xem vai trò có quyền này">
            ${icons.roles} <span>Vai trò</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/* ── Group rows ────────────────────────────────────────────── */

function renderGroupRow(item) {
  return `
    <tr class="table-data-row">
      <td>
        <div class="group-cell">
          <strong class="group-name">${escapeHtml(item.name || "—")}</strong>
          <code class="group-code">${escapeHtml(item.code || "")}</code>
        </div>
      </td>
      <td>
        <div class="desc-cell">${item.description ? escapeHtml(item.description) : `<span class="muted-italic">Chưa có mô tả</span>`}</div>
      </td>
      <td>
        <div class="status-org-cell">
          ${statusBadge(item.status)}
          ${item.organizationName ? `<span class="org-cell-tag">${icons.building} ${escapeHtml(item.organizationName)}</span>` : ""}
        </div>
      </td>
      <td class="td-actions">
        <div class="row-action-group">
          <button class="action-btn" data-action="edit-group" data-id="${item.id}" title="Chỉnh sửa nhóm">
            ${icons.edit} <span>Sửa</span>
          </button>
          <button class="action-btn" data-action="group-users" data-id="${item.id}" title="Gán thành viên vào nhóm">
            ${icons.users} <span>Thành viên</span>
          </button>
          <button class="action-btn" data-action="group-roles" data-id="${item.id}" title="Gán vai trò cho nhóm">
            ${icons.roles} <span>Vai trò</span>
          </button>
          <button class="action-btn btn-delete" data-action="delete-group" data-id="${item.id}" title="Xóa nhóm">
            ${icons.trash}
          </button>
        </div>
      </td>
    </tr>
  `;
}

/* ── Organization rows ─────────────────────────────────────── */

function renderOrgRow(item) {
  const level = item.level || 1;
  const indentPx = (level - 1) * 20;

  return `
    <tr class="table-data-row">
      <td>
        <div class="org-name-cell" style="padding-left: ${indentPx}px">
          <span class="org-level-indicator">${level > 1 ? icons.cornerDownRight : icons.landmark}</span>
          <strong class="org-name">${escapeHtml(item.name || "—")}</strong>
        </div>
      </td>
      <td>
        <div class="org-meta-cell">
          <code class="org-code">${escapeHtml(item.code || "—")}</code>
          <span class="org-path-sub">Cấp ${level} • Path: ${escapeHtml(item.path || "/")}</span>
        </div>
      </td>
      <td>
        ${statusBadge(item.status)}
      </td>
      <td class="td-actions">
        <div class="row-action-group">
          <button class="action-btn" data-action="edit-organization" data-id="${item.id}" title="Chỉnh sửa đơn vị">
            ${icons.edit} <span>Sửa</span>
          </button>
          <button class="action-btn" data-action="org-tree" data-id="${item.id}" title="Xem sơ đồ cây tổ chức">
            ${icons.tree} <span>Cây con</span>
          </button>
          <button class="action-btn btn-delete" data-action="delete-organization" data-id="${item.id}" title="Xóa đơn vị">
            ${icons.trash}
          </button>
        </div>
      </td>
    </tr>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGINATION
   ═══════════════════════════════════════════════════════════════ */

function renderPagination(section, pagination) {
  const p = pagination?.[section];
  if (!p) return "";
  const page = p.page || 0;
  const total = p.totalPages || 1;
  const totalItems = p.totalElements || 0;
  const size = p.size || 20;

  const start = totalItems === 0 ? 0 : page * size + 1;
  const end = Math.min((page + 1) * size, totalItems);

  return `
    <div class="table-footer-pagination">
      <div class="pagination-info">
        Hiển thị <strong>${start} - ${end}</strong> trong tổng số <strong>${totalItems}</strong> bản ghi
      </div>
      <div class="pagination-controls">
        <button class="pagination-nav-btn" data-action="prev-page" ${page <= 0 ? "disabled" : ""}>
          ← Trước
        </button>
        <span class="pagination-page-indicator">Trang ${page + 1} / ${total}</span>
        <button class="pagination-nav-btn" data-action="next-page" ${page >= total - 1 ? "disabled" : ""}>
          Sau →
        </button>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   SLIDE-OVER DRAWER (MODAL FOR EDITING / DETAILS)
   ═══════════════════════════════════════════════════════════════ */

function renderDrawer(state) {
  if (!state.editor) return "";

  const { kind, item } = state.editor;
  const titleMap = {
    selfProfile:      "Thông Tin Cá Nhân & Phân Quyền",
    createUser:       "Thêm Người Dùng Mới",
    user:             "Cập Nhật Hồ Sơ Người Dùng",
    role:             item?.id ? "Cập Nhật Vai Trò" : "Tạo Vai Trò Mới",
    group:            item?.id ? "Cập Nhật Nhóm" : "Tạo Nhóm Tài Khoản Mới",
    organization:     item?.id ? "Cập Nhật Đơn Vị" : "Tạo Đơn Vị Tổ Chức Mới",
    rolePermissions:  "Phân Quyền Cho Vai Trò",
    roleGroups:       "Danh Sách Nhóm Được Gán Vai Trò",
    groupUsers:       "Quản Lý Thành Viên Nhóm",
    groupRoles:       "Gán Vai Trò Cho Nhóm",
    userGroups:       "Các Nhóm Của Người Dùng",
    userPermissions:  "Danh Sách Quyền Hiệu Lực",
    permissionDetail: "Chi Tiết Quyền Hạn API",
    permissionRoles:  "Các Vai Trò Có Quyền Này",
    orgTree:          "Sơ Đồ Cây Tổ Chức",
    importResult:     "Kết Quả Nhập Dữ Liệu Excel",
    exportUsers:      "Xuất Danh Sách Người Dùng"
  };

  const kickerText = kind === "selfProfile" ? "TÀI KHOẢN CỦA TÔI" : "CỬA SỔ BIÊN TẬP";

  return `
    <div class="drawer-backdrop" data-action="close-editor"></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true">
      <div class="drawer-header">
        <div class="drawer-title-box">
          <span class="drawer-kicker">${kickerText}</span>
          <h2>${titleMap[kind] || "Chi tiết"}</h2>
        </div>
        <button class="drawer-close-btn" data-action="close-editor" title="Đóng cửa sổ">
          ${icons.close}
        </button>
      </div>

      <div class="drawer-body">
        ${renderDrawerBody(state)}
      </div>
    </aside>
  `;
}

function renderDrawerBody(state) {
  const { kind, item } = state.editor;
  switch (kind) {
    case "selfProfile":      return selfProfileView(state.editor);
    case "createUser":       return createUserForm();
    case "user":             return userForm(item);
    case "role":             return roleForm(item);
    case "group":            return groupForm(item);
    case "organization":     return organizationForm(item);
    case "rolePermissions":  return rolePermissionsChecklist(state.editor);
    case "roleGroups":       return readonlyList(state.editor, "groups", "Nhóm");
    case "groupUsers":       return groupUsersChecklist(state.editor);
    case "groupRoles":       return groupRolesChecklist(state.editor);
    case "userGroups":       return userGroupsView(state.editor);
    case "userPermissions":  return userPermissionsView(state.editor);
    case "permissionDetail": return permissionDetailView(item);
    case "permissionRoles":  return readonlyList(state.editor, "roles", "Vai trò");
    case "orgTree":          return orgTreeView(state.editor);
    case "importResult":     return importResultView(state.editor);
    case "exportUsers":      return exportUsersForm(state.data.organizations || []);
    default:                 return "";
  }
}

function exportUsersForm(organizations) {
  const organizationOptions = organizations
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"))
    .map(org => `
      <option value="${escapeHtml(org.id)}">
        ${escapeHtml(org.name || `Tổ chức #${org.id}`)}${org.code ? ` (${escapeHtml(org.code)})` : ""}
      </option>
    `).join("");

  return `
    <div class="export-intro-card">
      <span class="export-intro-icon">${icons.download}</span>
      <div>
        <strong>Chọn phạm vi dữ liệu cần xuất</strong>
        <p>Không chọn bộ lọc nào để xuất toàn bộ người dùng. Bạn cũng có thể lọc theo tổ chức, trạng thái hoặc kết hợp cả hai.</p>
      </div>
    </div>

    <form id="export-users-form">
      <div class="form-grid">
        <div class="input-group">
          <label for="export-organization-id">Đơn vị / Tổ chức</label>
          <select id="export-organization-id" name="organizationId">
            <option value="">Tất cả tổ chức</option>
            ${organizationOptions}
          </select>
          <span class="field-hint">Chỉ xuất người dùng thuộc tổ chức được chọn.</span>
        </div>

        <div class="input-group">
          <label for="export-status">Trạng thái người dùng</label>
          <select id="export-status" name="status">
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE — Đang hoạt động</option>
            <option value="PENDING">PENDING — Chờ kích hoạt</option>
            <option value="LOCKED">LOCKED — Đã khóa</option>
            <option value="DISABLED">DISABLED — Đã vô hiệu hóa</option>
          </select>
          <span class="field-hint">File Excel chỉ chứa tài khoản có trạng thái tương ứng.</span>
        </div>
      </div>

      <div class="export-scope-note">
        ${icons.info}
        <span>Các bộ lọc được kết hợp với nhau khi bạn chọn cả tổ chức và trạng thái.</span>
      </div>

      <div class="drawer-actions-bar">
        <button class="btn-secondary" type="button" data-action="close-editor">Hủy bỏ</button>
        <button class="btn-primary" type="submit">
          <span class="btn-icon">${icons.download}</span>
          <span>Xuất file Excel</span>
        </button>
      </div>
    </form>
  `;
}

/* ── User Forms ────────────────────────────────────────────── */

function createUserForm() {
  return formWrap("create-user-form", "", `
    ${input("username", "Tên đăng nhập (Username)", "", "text", true, "ví dụ: johndoe")}
    ${input("fullName", "Họ và tên đầy đủ", "", "text", true, "Nguyễn Văn An")}
    ${input("email", "Địa chỉ Email", "", "email", true, "johndoe@example.com")}
    ${input("password", "Mật khẩu ban đầu", "", "password", true, "Password@123")}
    ${input("phone", "Số điện thoại liên hệ", "", "tel", false, "0901234567")}
    ${input("organizationId", "Mã đơn vị tổ chức (ID)", "", "number", false, "ví dụ: 1")}
  `, "Tạo Người Dùng Mới");
}

function userForm(item) {
  return `
    <div class="drawer-info-grid">
      <div class="info-row"><span class="info-label">User ID:</span><strong>#${item.id}</strong></div>
      <div class="info-row"><span class="info-label">Username:</span><strong>@${escapeHtml(item.username || "")}</strong></div>
      <div class="info-row"><span class="info-label">Trạng thái:</span>${statusBadge(item.status)}</div>
      <div class="info-row"><span class="info-label">Đăng nhập cuối:</span><span>${formatDate(item.lastLoginAt)}</span></div>
      ${item.lockedAt ? `<div class="info-row"><span class="info-label">Khóa lúc:</span><span class="text-danger">${formatDate(item.lockedAt)}</span></div>` : ""}
      ${item.lockReason ? `<div class="info-row"><span class="info-label">Lý do khóa:</span><span class="text-danger">${escapeHtml(item.lockReason)}</span></div>` : ""}
    </div>

    <div class="form-divider">
      <span>CẬP NHẬT THÔNG TIN</span>
    </div>

    ${formWrap("user-form", item.id, `
      ${input("fullName", "Họ và tên", item.fullName || "")}
      ${input("email", "Email", item.email || "", "email")}
      ${input("phone", "Số điện thoại", item.phone || "", "tel", false)}
      ${input("organizationId", "Mã đơn vị (ID)", item.organizationId || "", "number", false)}
      ${input("password", "Mật khẩu mới (bỏ trống nếu không đổi)", "", "password", false, "••••••••")}
    `, "Lưu Thay Đổi")}
  `;
}

/* ── Role Form ─────────────────────────────────────────────── */

function roleForm(item) {
  return formWrap("role-form", item.id || "", `
    ${input("code", "Mã vai trò (Code)", item.code || "", "text", true, "ROLE_MANAGER")}
    ${input("name", "Tên hiển thị vai trò", item.name || "", "text", true, "Quản lý phòng ban")}
    ${textarea("description", "Mô tả chi tiết quyền hạn", item.description || "", "Mô tả mục đích sử dụng vai trò này...")}
    ${selectField("status", "Trạng thái hoạt động", item.status || "ACTIVE", [
      { value: "ACTIVE", label: "Hoạt động (ACTIVE)" },
      { value: "INACTIVE", label: "Ngừng hoạt động (INACTIVE)" }
    ])}
  `, item.id ? "Lưu Vai Trò" : "Tạo Vai Trò");
}

/* ── Group Form ────────────────────────────────────────────── */

function groupForm(item) {
  return formWrap("group-form", item.id || "", `
    ${input("code", "Mã nhóm", item.code || "", "text", true, "GRP_DEV")}
    ${input("name", "Tên nhóm", item.name || "", "text", true, "Nhóm Lập Trình Viên")}
    ${textarea("description", "Mô tả nhóm", item.description || "", "Mô tả trách nhiệm của nhóm...")}
    ${input("organizationId", "Mã đơn vị trực thuộc (ID)", item.organizationId || "", "number", false, "ví dụ: 1")}
    ${item.id ? selectField("status", "Trạng thái", item.status || "ACTIVE", [
      { value: "ACTIVE", label: "Hoạt động" },
      { value: "DISABLED", label: "Vô hiệu hóa" }
    ]) : ""}
  `, item.id ? "Lưu Nhóm" : "Tạo Nhóm Mới");
}

/* ── Organization Form ─────────────────────────────────────── */

function organizationForm(item) {
  return formWrap("organization-form", item.id || "", `
    ${input("code", "Mã đơn vị", item.code || "", "text", true, "ORG_HCM")}
    ${input("name", "Tên đơn vị / Phòng ban", item.name || "", "text", true, "Chi nhánh TP.HCM")}
    ${textarea("description", "Mô tả đơn vị", item.description || "", "Văn phòng đại diện miền Nam...")}
    ${input("parentId", "ID đơn vị cha (bỏ trống nếu cấp gốc)", item.parentId || "", "number", false, "ví dụ: 1")}
    ${item.id ? selectField("status", "Trạng thái", item.status || "ACTIVE", [
      { value: "ACTIVE", label: "Hoạt động" },
      { value: "DISABLED", label: "Vô hiệu hóa" }
    ]) : ""}
  `, item.id ? "Lưu Đơn Vị" : "Tạo Đơn Vị Mới");
}

/* ── Permission Detail ─────────────────────────────────────── */

function permissionDetailView(item) {
  return `
    <div class="drawer-info-grid">
      <div class="info-row"><span class="info-label">Mã quyền:</span><code>${escapeHtml(item.code || "—")}</code></div>
      <div class="info-row"><span class="info-label">Tên quyền:</span><strong>${escapeHtml(item.name || "—")}</strong></div>
      <div class="info-row"><span class="info-label">Tài nguyên:</span><span class="resource-badge">${escapeHtml(item.resource || "—")}</span></div>
      <div class="info-row"><span class="info-label">Hành động:</span><strong>${escapeHtml(item.action || "—")}</strong></div>
      <div class="info-row"><span class="info-label">Hiệu lực:</span>${effectBadge(item.effect)}</div>
      <div class="info-row"><span class="info-label">Mô tả:</span><span>${item.description ? escapeHtml(item.description) : '<span class="muted-italic">Chưa có mô tả</span>'}</span></div>
      <div class="info-row"><span class="info-label">Cập nhật:</span><span>${formatDate(item.updatedAt)}</span></div>
    </div>
    <div class="drawer-actions-bar">
      <button class="btn-primary" data-action="toggle-permission-effect" data-id="${item.id}">
        ⚡ ${item.effect === "ALLOW" ? "Chuyển sang DENY (Khóa quyền)" : "Chuyển sang ALLOW (Cho phép quyền)"}
      </button>
    </div>
  `;
}

/* ── Checklists ────────────────────────────────────────────── */

function rolePermissionsChecklist(editor) {
  const { item, permissions, assignedIds } = editor;
  return `
    <div class="checklist-target-info">
      Vai trò: <strong>${escapeHtml(item?.name || "")}</strong> (<code>${escapeHtml(item?.code || "")}</code>)
    </div>
    <form id="role-permissions-form" data-id="${item?.id}">
      <div class="checkbox-container">
        ${(permissions || []).map(p => `
          <label class="check-item-card">
            <input type="checkbox" name="items" value="${p.id}" ${(assignedIds || []).includes(p.id) ? "checked" : ""}>
            <div class="check-item-content">
              <strong>${escapeHtml(p.name || p.code)}</strong>
              <div class="check-item-sub">
                <code>${escapeHtml(p.code || "")}</code> • <span>${p.effect || ""}</span>
              </div>
            </div>
          </label>
        `).join("")}
      </div>
      <div class="drawer-actions-bar">
        <button class="btn-secondary" type="button" data-action="close-editor">Hủy bỏ</button>
        <button class="btn-primary" type="submit">Lưu Phân Quyền</button>
      </div>
    </form>
  `;
}

function groupUsersChecklist(editor) {
  const { item, allUsers, memberIds } = editor;
  return `
    <div class="checklist-target-info">
      Nhóm: <strong>${escapeHtml(item?.name || "")}</strong> (<code>${escapeHtml(item?.code || "")}</code>)
    </div>
    <form id="group-users-form" data-id="${item?.id}">
      <div class="checkbox-container">
        ${(allUsers || []).map(u => `
          <label class="check-item-card">
            <input type="checkbox" name="items" value="${u.id}" ${(memberIds || []).includes(u.id) ? "checked" : ""}>
            <div class="check-item-content">
              <strong>${escapeHtml(u.fullName || u.username || "")}</strong>
              <div class="check-item-sub">@${escapeHtml(u.username || "")} • ${escapeHtml(u.email || "")}</div>
            </div>
          </label>
        `).join("")}
      </div>
      <div class="drawer-actions-bar">
        <button class="btn-secondary" type="button" data-action="close-editor">Hủy bỏ</button>
        <button class="btn-primary" type="submit">Lưu Thành Viên</button>
      </div>
    </form>
  `;
}

function groupRolesChecklist(editor) {
  const { item, allRoles, assignedIds } = editor;
  return `
    <div class="checklist-target-info">
      Nhóm: <strong>${escapeHtml(item?.name || "")}</strong>
    </div>
    <form id="group-roles-form" data-id="${item?.id}">
      <div class="checkbox-container">
        ${(allRoles || []).map(r => `
          <label class="check-item-card">
            <input type="checkbox" name="items" value="${r.id}" ${(assignedIds || []).includes(r.id) ? "checked" : ""}>
            <div class="check-item-content">
              <strong>${escapeHtml(r.name || "")}</strong>
              <div class="check-item-sub"><code>${escapeHtml(r.code || "")}</code> • ${r.status || ""}</div>
            </div>
          </label>
        `).join("")}
      </div>
      <div class="drawer-actions-bar">
        <button class="btn-secondary" type="button" data-action="close-editor">Hủy bỏ</button>
        <button class="btn-primary" type="submit">Lưu Vai Trò</button>
      </div>
    </form>
  `;
}

/* ── Read-only lists ───────────────────────────────────────── */

function userGroupsView(editor) {
  const { item, groups } = editor;
  const label = escapeHtml(item?.fullName || item?.username || "");
  if (!groups || !groups.length) {
    return `<div class="empty-state-card"><p>Người dùng <strong>${label}</strong> chưa thuộc nhóm nào.</p></div>`;
  }
  return `
    <div class="checklist-target-info">Người dùng: <strong>${label}</strong></div>
    <div class="item-list-container">
      ${groups.map(g => `
        <div class="item-list-row">
          <div class="item-list-title">👥 <strong>${escapeHtml(g.groupName || g.name || "Nhóm #" + (g.groupId || g.id))}</strong></div>
          <span class="muted">${formatDate(g.joinedAt || g.assignedAt || g.createdAt)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function userPermissionsView(editor) {
  const { item, permissions } = editor;
  const label = escapeHtml(item?.fullName || item?.username || "");
  if (!permissions || !permissions.length) {
    return `<div class="empty-state-card"><p>Người dùng <strong>${label}</strong> chưa có quyền trực tiếp nào.</p></div>`;
  }
  return `
    <div class="checklist-target-info">Quyền hiệu lực của: <strong>${label}</strong></div>
    <div class="item-list-container">
      ${permissions.map(p => `
        <div class="item-list-row">
          <code>${escapeHtml(p.code || "")}</code>
          ${effectBadge(p.effect)}
        </div>
      `).join("")}
    </div>
  `;
}

function readonlyList(editor, key, label) {
  const items = editor[key] || [];
  const itemName = escapeHtml(editor.item?.name || editor.item?.code || "");
  if (!items.length) {
    return `<div class="empty-state-card"><p>Chưa có ${label.toLowerCase()} nào cho <strong>${itemName}</strong>.</p></div>`;
  }
  return `
    <div class="checklist-target-info">${label} của: <strong>${itemName}</strong></div>
    <div class="item-list-container">
      ${items.map(i => `
        <div class="item-list-row">
          <strong>${escapeHtml(i.name || i.groupName || i.roleName || i.code || "—")}</strong>
          <code>${escapeHtml(i.code || i.roleCode || i.groupCode || "")}</code>
        </div>
      `).join("")}
    </div>
  `;
}

function orgTreeView(editor) {
  const { treeData } = editor;
  if (!treeData) return `<div class="empty-state-card"><p>Không có dữ liệu cây tổ chức.</p></div>`;
  return `
    <div class="org-tree-wrapper">
      ${renderOrgNode(treeData, 0)}
    </div>
  `;
}

function renderOrgNode(node, depth) {
  const indent = depth * 24;
  const children = (node.children || []).map(c => renderOrgNode(c, depth + 1)).join("");
  return `
    <div class="org-tree-node" style="margin-left:${indent}px">
      <div class="org-node-card">
        <span class="org-node-icon">${depth === 0 ? '🏛' : '🏢'}</span>
        <div class="org-node-content">
          <strong>${escapeHtml(node.name || "—")}</strong>
          <span class="muted">${escapeHtml(node.code || "")} • Cấp ${node.level || depth + 1}</span>
        </div>
        ${statusBadge(node.status)}
      </div>
    </div>
    ${children}
  `;
}

function importResultView(editor) {
  const { result } = editor;
  if (!result) return `<p class="muted">Không có kết quả.</p>`;
  return `
    <div class="drawer-info-grid">
      <div class="info-row"><span class="info-label">Tổng số dòng:</span><strong>${result.totalRows || 0}</strong></div>
      <div class="info-row"><span class="info-label">Thành công:</span><strong class="text-success">✅ ${result.successCount || 0}</strong></div>
      <div class="info-row"><span class="info-label">Thất bại:</span><strong class="text-danger">❌ ${result.failedCount || 0}</strong></div>
    </div>
    ${(result.errors || []).length ? `
      <div class="form-divider"><span>CHI TIẾT LỖI TỪNG DÒNG</span></div>
      <div class="item-list-container">
        ${result.errors.map(e => `
          <div class="item-list-row error-row">
            <span class="error-line">Dòng ${e.rowNumber} (${escapeHtml(e.field || "")}):</span>
            <span class="error-msg">${escapeHtml(e.message || "")}</span>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;
}

function selfProfileView(editor) {
  const { tab = "info", user = {}, organization, groups = [], permissions = [] } = editor;

  const username = user.username || "—";
  const fullName = user.fullName || user.username || "—";
  const email = user.email || "—";
  const phone = user.phoneNumber || user.phone || "—";
  const status = user.status || "ACTIVE";

  let roleText = "Thành viên";
  if (user.roleName) {
    roleText = user.roleName;
  } else if (user.roles && user.roles.length > 0) {
    const r = user.roles[0];
    roleText = typeof r === "string" ? r : (r.name || r.code || "Thành viên");
  }

  let tabContentHtml = "";

  if (tab === "info") {
    tabContentHtml = `
      <div class="profile-tab-content">
        <div class="drawer-info-grid">
          <div class="info-row">
            <span class="info-label">ID Tài Khoản</span>
            <strong>#${escapeHtml(user.id || "—")}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">Tên Đăng Nhập</span>
            <strong>${escapeHtml(username)}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">Họ và Tên</span>
            <strong>${escapeHtml(fullName)}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">Địa Chỉ Email</span>
            <strong>${escapeHtml(email)}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">Số Điện Thoại</span>
            <strong>${escapeHtml(phone)}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">Đơn Vị / Tổ Chức</span>
            <strong>${escapeHtml(user.organizationName || (organization ? organization.name : "Chưa gán"))}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">Vai Trò Hệ Thống</span>
            <strong>${escapeHtml(roleText)}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">Trạng Thái Tài Khoản</span>
            <span>${statusBadge(status)}</span>
          </div>
        </div>
      </div>
    `;
  } else if (tab === "org") {
    if (organization) {
      tabContentHtml = `
        <div class="profile-tab-content">
          <div class="profile-section-card">
            <div class="profile-section-title">${icons.organizations} ${escapeHtml(organization.name || "Đơn vị tổ chức")}</div>
            <div class="drawer-info-grid">
              <div class="info-row">
                <span class="info-label">Mã Đơn Vị</span>
                <strong>${escapeHtml(organization.code || "—")}</strong>
              </div>
              <div class="info-row">
                <span class="info-label">ID Đơn Vị</span>
                <strong>#${escapeHtml(organization.id || "—")}</strong>
              </div>
              <div class="info-row">
                <span class="info-label">Đơn Vị Cấp Trên</span>
                <strong>${escapeHtml(organization.parentName || (organization.parentId ? "ID: " + organization.parentId : "Cấp cao nhất (Root)"))}</strong>
              </div>
              <div class="info-row">
                <span class="info-label">Cấp Sơ Đồ (Level)</span>
                <strong>${organization.level !== undefined ? organization.level : "—"}</strong>
              </div>
              <div class="info-row">
                <span class="info-label">Trạng Thái</span>
                <span>${statusBadge(organization.status || "ACTIVE")}</span>
              </div>
            </div>
            ${organization.description ? `
              <div style="margin-top: 12px; font-size: 0.84rem; color: var(--muted);">
                <strong>Mô tả:</strong> ${escapeHtml(organization.description)}
              </div>
            ` : ""}
          </div>
        </div>
      `;
    } else {
      tabContentHtml = `
        <div class="empty-state" style="padding: 24px; text-align: center;">
          <p style="color: var(--muted);">Tài khoản hiện tại chưa thuộc Đơn vị/Tổ chức cụ thể nào hoặc chưa có thông tin tổ chức.</p>
        </div>
      `;
    }
  } else if (tab === "groups") {
    if (groups && groups.length > 0) {
      const itemsHtml = groups.map(g => `
        <div class="profile-list-item">
          <div class="profile-list-item-main">
            <span class="profile-list-item-title">${escapeHtml(g.name || g.code || "Nhóm tài khoản")}</span>
            <span class="profile-list-item-sub">Mã: ${escapeHtml(g.code || "—")}${g.organizationName ? " • Tổ chức: " + escapeHtml(g.organizationName) : ""}</span>
          </div>
          ${statusBadge(g.status || "ACTIVE")}
        </div>
      `).join("");

      tabContentHtml = `
        <div class="profile-tab-content">
          <div class="profile-item-list">
            ${itemsHtml}
          </div>
        </div>
      `;
    } else {
      tabContentHtml = `
        <div class="empty-state" style="padding: 24px; text-align: center;">
          <p style="color: var(--muted);">Bạn chưa tham gia vào nhóm tài khoản nào.</p>
        </div>
      `;
    }
  } else if (tab === "perms") {
    if (permissions && permissions.length > 0) {
      const itemsHtml = permissions.map(p => `
        <div class="profile-list-item">
          <div class="profile-list-item-main">
            <span class="profile-list-item-title">${escapeHtml(p.code || p.permissionCode || "—")}</span>
            <span class="profile-list-item-sub">${escapeHtml(p.name || p.permissionName || p.description || "Quyền truy cập")}</span>
          </div>
          ${effectBadge(p.effect || "ALLOW")}
        </div>
      `).join("");

      tabContentHtml = `
        <div class="profile-tab-content">
          <div class="profile-item-list" style="max-height: 420px; overflow-y: auto;">
            ${itemsHtml}
          </div>
        </div>
      `;
    } else {
      tabContentHtml = `
        <div class="empty-state" style="padding: 24px; text-align: center;">
          <p style="color: var(--muted);">Chưa ghi nhận danh sách quyền hạn hiệu lực cho tài khoản.</p>
        </div>
      `;
    }
  }

  return `
    <div class="self-profile-wrapper">
      <div class="self-profile-header">
        ${userAvatar(fullName || username, username)}
        <div class="self-profile-meta">
          <h3 class="self-profile-name">${escapeHtml(fullName)}</h3>
          <span class="self-profile-username">@${escapeHtml(username)}</span>
          <div class="self-profile-badges">
            ${statusBadge(status)}
            <span class="pill pill-muted" style="font-weight: 600;">${escapeHtml(roleText)}</span>
          </div>
        </div>
      </div>

      <div class="profile-modal-tabs">
        <button class="profile-tab-btn ${tab === 'info' ? 'active' : ''}" data-action="switch-profile-tab" data-tab="info">
          ${icons.users} Bản thân
        </button>
        <button class="profile-tab-btn ${tab === 'org' ? 'active' : ''}" data-action="switch-profile-tab" data-tab="org">
          ${icons.organizations} Tổ chức
        </button>
        <button class="profile-tab-btn ${tab === 'groups' ? 'active' : ''}" data-action="switch-profile-tab" data-tab="groups">
          ${icons.groups} Group (${groups.length})
        </button>
        <button class="profile-tab-btn ${tab === 'perms' ? 'active' : ''}" data-action="switch-profile-tab" data-tab="perms">
          ${icons.permissions} Quyền (${permissions.length})
        </button>
      </div>

      ${tabContentHtml}
    </div>
  `;
}
