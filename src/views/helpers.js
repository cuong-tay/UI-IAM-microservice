/* ═══════════════════════════════════════════════════════════════
   Shared Helpers — Format, escape, badges, icons & UI components
   ═══════════════════════════════════════════════════════════════ */

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
  );
}

export function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(value);
  }
}

export function userAvatar(name, username) {
  const text = (name || username || "U").trim();
  const initials = text.slice(0, 2).toUpperCase();
  const colors = [
    "linear-gradient(135deg, #e11d48, #be123c)",
    "linear-gradient(135deg, #f43f5e, #e11d48)",
    "linear-gradient(135deg, #fb7185, #f43f5e)",
    "linear-gradient(135deg, #e11d48, #9f1239)"
  ];
  const charCode = text.charCodeAt(0) || 0;
  const bg = colors[charCode % colors.length];

  return `
    <div class="user-avatar" style="background:${bg}" aria-hidden="true">
      <span>${escapeHtml(initials)}</span>
    </div>
  `;
}

export function statusBadge(status) {
  const map = {
    ACTIVE:   { label: "Hoạt động",       dot: "#16a34a", cls: "pill-success" },
    LOCKED:   { label: "Bị khóa",         dot: "#dc2626", cls: "pill-danger" },
    DISABLED: { label: "Vô hiệu hóa",     dot: "#71717a", cls: "pill-muted" },
    PENDING:  { label: "Chờ kích hoạt",    dot: "#d97706", cls: "pill-warning" },
    INACTIVE: { label: "Ngừng hoạt động",  dot: "#71717a", cls: "pill-muted" }
  };
  const s = map[status] || { label: status || "—", dot: "#71717a", cls: "pill-muted" };
  return `
    <span class="pill ${s.cls}">
      <span class="pill-dot" style="background:${s.dot}"></span>
      ${s.label}
    </span>
  `;
}

export function effectBadge(effect) {
  if (effect === "ALLOW") {
    return `<span class="pill pill-allow"><span class="pill-dot" style="background:#16a34a"></span>ALLOW</span>`;
  }
  return `<span class="pill pill-deny"><span class="pill-dot" style="background:#dc2626"></span>DENY</span>`;
}

/* ── SVG Icons ─────────────────────────────────────────────── */

export const icons = {
  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  roles: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  permissions: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-6 6 4-4m-9 9 2-2m-4 4 1-1m-4 4a5 5 0 1 1 7-7l8-8 4 4-8 8a5 5 0 0 1-7 7z"/></svg>`,
  groups: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  organizations: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M8 10h.01"></path><path d="M16 10h.01"></path><path d="M8 14h.01"></path><path d="M16 14h.01"></path></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  refresh: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
  download: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  unlock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  logout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
  key: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>`,
  shield: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
};

/* ── Form Builders ─────────────────────────────────────────── */

export function input(name, label, value, type = "text", required = true, placeholder = "") {
  return `
    <div class="input-group">
      <label for="${name}">${label}${required ? ` <span class="required-star">*</span>` : ""}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${placeholder}" ${required ? "required" : ""}>
    </div>
  `;
}

export function textarea(name, label, value, placeholder = "") {
  return `
    <div class="input-group">
      <label for="${name}">${label}</label>
      <textarea id="${name}" name="${name}" placeholder="${placeholder}">${escapeHtml(value)}</textarea>
    </div>
  `;
}

export function selectField(name, label, value, options) {
  const opts = options.map(o => `<option value="${o.value}" ${o.value === value ? "selected" : ""}>${o.label}</option>`).join("");
  return `
    <div class="input-group">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}">${opts}</select>
    </div>
  `;
}

export function formWrap(id, itemId, body, cta) {
  return `
    <form id="${id}" data-id="${itemId}">
      <div class="form-grid">${body}</div>
      <div class="drawer-actions-bar">
        <button class="btn-secondary" type="button" data-action="close-editor">Hủy bỏ</button>
        <button class="btn-primary" type="submit">${cta}</button>
      </div>
    </form>
  `;
}

export function renderStatus(status) {
  if (!status) return "";
  const icon = status.type === "success" ? icons.check : (status.type === "error" ? "⚠️" : "ℹ️");
  return `
    <div class="status-banner ${status.type}">
      <span class="status-icon">${icon}</span>
      <span class="status-text">${escapeHtml(status.message)}</span>
      <button class="status-close" data-action="dismiss-status" title="Đóng">&times;</button>
    </div>
  `;
}
