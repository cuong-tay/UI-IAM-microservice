/* ═══════════════════════════════════════════════════════════════
   API Client — Microservice Gateway (port 8084)
   Tất cả endpoints theo tài liệu API_DOCUMENTATION.md
   ═══════════════════════════════════════════════════════════════ */

import { clearSession, saveSession, state } from "./store.js";

const BASE_URL = "http://localhost:8084";
const API_PREFIX = "/api/core/auth-service/api/v1";

/* ───────────────────────────────────────────────────────────────
   MODULE 1: AUTHENTICATION & SECURITY (/api/auth)
   ─────────────────────────────────────────────────────────────── */

/** 1.1 Đăng nhập (Username/Email & Mật khẩu) */
export function login(payload) {
  const body = {
    usernameOrEmail: payload.usernameOrEmail || payload.email,
    password: payload.password
  };
  return request("/api/auth/login", { method: "POST", body });
}

/** 1.2 Làm mới Token */
export function refreshToken(token) {
  return request("/api/auth/refresh-token", {
    method: "POST",
    body: { refreshToken: token }
  });
}

/** 1.3 Đăng xuất */
export function logout(accessToken, refreshTokenValue) {
  return request("/api/auth/logout", {
    method: "POST",
    body: { refreshToken: refreshTokenValue },
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

/** 1.4 Kiểm tra số điện thoại (Phone First-time Login Check) */
export function verifyPhone(phoneNumber, deviceId) {
  return request("/api/auth/verify-phone", {
    method: "POST",
    body: { phoneNumber, deviceId }
  });
}

/** 1.5 Gửi mã OTP */
export function sendOtp(phoneNumber) {
  return request("/api/auth/send-otp", {
    method: "POST",
    body: { phoneNumber }
  });
}

/** 1.6 Xác thực mã OTP */
export function verifyOtp(phoneNumber, otp, deviceId) {
  return request("/api/auth/verify-otp", {
    method: "POST",
    body: { phoneNumber, otp, deviceId }
  });
}

/** 1.7 Xác thực mật khẩu theo số điện thoại */
export function verifyPassword(phoneNumber, password) {
  return request("/api/auth/verify-password", {
    method: "POST",
    body: { phoneNumber, password }
  });
}

/** 1.8 Đặt lại mật khẩu (Reset Password bằng OTP) */
export function resetPassword(phoneNumber, otp, newPassword) {
  return request("/api/auth/reset-password", {
    method: "POST",
    body: { phoneNumber, otp, newPassword }
  });
}

/** 1.9 Kích hoạt tài khoản qua Token Email */
export function activateAccount(token) {
  return request(`/api/auth/activate?token=${encodeURIComponent(token)}`);
}

/* ───────────────────────────────────────────────────────────────
   MODULE 2: QUẢN LÝ NGƯỜI DÙNG - USERS (/api/v1/users)
   ─────────────────────────────────────────────────────────────── */

/** 2.1 Lấy danh sách Người dùng (Phân trang) */
export function listUsers(page = 0, size = 20) {
  return authRequest(`${API_PREFIX}/users?page=${page}&size=${size}`);
}

/** 2.2 Chi tiết Người dùng theo ID */
export function getUser(id) {
  return authRequest(`${API_PREFIX}/users/${id}`);
}

/** 2.3 Tạo mới Người dùng */
export function createUser(body) {
  return authRequest(`${API_PREFIX}/users`, { method: "POST", body });
}

/** 2.4 Cập nhật Người dùng */
export function updateUser(id, body) {
  return authRequest(`${API_PREFIX}/users/${id}`, { method: "PUT", body });
}

/** 2.5 Xóa Người dùng (Soft Delete) */
export function deleteUser(id) {
  return authRequest(`${API_PREFIX}/users/${id}`, { method: "DELETE" });
}

/** 2.6 Khóa Người dùng */
export function lockUser(id, reason) {
  return authRequest(`${API_PREFIX}/users/${id}/lock`, {
    method: "POST",
    body: { reason }
  });
}

/** 2.7 Mở khóa Người dùng */
export function unlockUser(id) {
  return authRequest(`${API_PREFIX}/users/${id}/unlock`, { method: "POST" });
}

/** 2.8 Lấy danh sách Quyền hiệu lực của Người dùng */
export function getUserEffectivePermissions(id, page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/users/${id}/effective-permissions?page=${page}&size=${size}`);
}

/** 2.9 Import danh sách Người dùng từ file Excel */
export function importUsers(file) {
  const formData = new FormData();
  formData.append("file", file);
  return authUpload(`${API_PREFIX}/users/import`, formData);
}

/** 2.10 Export danh sách Người dùng ra file Excel */
export function exportUsers(organizationId, status) {
  const params = new URLSearchParams();
  if (organizationId) params.append("organizationId", organizationId);
  if (status) params.append("status", status);
  const qs = params.toString() ? `?${params}` : "";
  return authDownload(`${API_PREFIX}/users/export${qs}`);
}

/* ───────────────────────────────────────────────────────────────
   MODULE 3: QUẢN LÝ VAI TRÒ - ROLES (/api/v1/roles)
   ─────────────────────────────────────────────────────────────── */

/** 3.1 Lấy danh sách Vai trò (Phân trang) */
export function listRoles(page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/roles?page=${page}&size=${size}`);
}

/** 3.2 Chi tiết Vai trò theo ID */
export function getRole(id) {
  return authRequest(`${API_PREFIX}/roles/${id}`);
}

/** 3.3 Tạo mới Vai trò */
export function createRole(body) {
  return authRequest(`${API_PREFIX}/roles`, { method: "POST", body });
}

/** 3.4 Cập nhật Vai trò */
export function updateRole(id, body) {
  return authRequest(`${API_PREFIX}/roles/${id}`, { method: "PUT", body });
}

/** 3.5 Xóa Vai trò */
export function deleteRole(id) {
  return authRequest(`${API_PREFIX}/roles/${id}`, { method: "DELETE" });
}

/** 3.6 Gán quyền cho Vai trò */
export function assignRolePermissions(id, permissionIds) {
  return authRequest(`${API_PREFIX}/roles/${id}/permissions`, {
    method: "POST",
    body: { permissionIds }
  });
}

/** 3.7 Thu hồi quyền khỏi Vai trò */
export function removeRolePermission(roleId, permissionId) {
  return authRequest(`${API_PREFIX}/roles/${roleId}/permissions/${permissionId}`, {
    method: "DELETE"
  });
}

/** 3.8 Danh sách Quyền của một Vai trò (Phân trang) */
export function listRolePermissions(roleId, page = 0, size = 100) {
  return authRequest(`${API_PREFIX}/roles/permissions/${roleId}?page=${page}&size=${size}`);
}

/** 3.9 Danh sách Nhóm đang được gán Vai trò này */
export function listRoleGroups(roleId, page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/roles/groups/${roleId}?page=${page}&size=${size}`);
}

/* ───────────────────────────────────────────────────────────────
   MODULE 4: QUẢN LÝ NHÓM - GROUPS (/api/v1/groups)
   ─────────────────────────────────────────────────────────────── */

/** 4.1 Lấy danh sách Nhóm (Phân trang) */
export function listGroups(page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/groups?page=${page}&size=${size}`);
}

/** 4.2 Chi tiết Nhóm theo ID */
export function getGroup(id) {
  return authRequest(`${API_PREFIX}/groups/${id}`);
}

/** 4.3 Lấy danh sách Nhóm theo Tổ chức */
export function listGroupsByOrganization(organizationId) {
  return authRequest(`${API_PREFIX}/groups/by-organization/${organizationId}`);
}

/** 4.4 Lấy danh sách Nhóm của 1 Người dùng */
export function listUserGroups(userId) {
  return authRequest(`${API_PREFIX}/groups/by-user/${userId}`);
}

/** 4.5 Tạo mới Nhóm */
export function createGroup(body) {
  return authRequest(`${API_PREFIX}/groups`, { method: "POST", body });
}

/** 4.6 Cập nhật Nhóm */
export function updateGroup(id, body) {
  return authRequest(`${API_PREFIX}/groups/${id}`, { method: "PUT", body });
}

/** 4.7 Xóa Nhóm */
export function deleteGroup(id) {
  return authRequest(`${API_PREFIX}/groups/${id}`, { method: "DELETE" });
}

/** 4.8 Gán Người dùng vào Nhóm */
export function assignGroupUsers(id, userIds) {
  return authRequest(`${API_PREFIX}/groups/${id}/users`, {
    method: "POST",
    body: { userIds }
  });
}

/** 4.9 Xóa Người dùng khỏi Nhóm */
export function removeGroupUser(groupId, userId) {
  return authRequest(`${API_PREFIX}/groups/${groupId}/users/${userId}`, {
    method: "DELETE"
  });
}

/** 4.10 Lấy danh sách Người dùng trong Nhóm */
export function listGroupUsers(id) {
  return authRequest(`${API_PREFIX}/groups/${id}/users`);
}

/** 4.11 Gán Vai trò cho Nhóm */
export function assignGroupRoles(id, roleIds) {
  return authRequest(`${API_PREFIX}/groups/${id}/roles`, {
    method: "POST",
    body: { roleIds }
  });
}

/** 4.12 Xóa Vai trò khỏi Nhóm */
export function removeGroupRole(groupId, roleId) {
  return authRequest(`${API_PREFIX}/groups/${groupId}/roles/${roleId}`, {
    method: "DELETE"
  });
}

/** 4.13 Lấy danh sách Vai trò của Nhóm (Phân trang) */
export function listGroupRoles(groupId, page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/groups/roles/${groupId}?page=${page}&size=${size}`);
}

/* ───────────────────────────────────────────────────────────────
   MODULE 5: QUẢN LÝ QUYỀN - PERMISSIONS (/api/v1/permissions)
   ─────────────────────────────────────────────────────────────── */

/** 5.1 Kiểm tra Quyền của User hiện tại */
export function checkPermission(permissionCode) {
  return authRequest(`${API_PREFIX}/permissions/can?permission=${encodeURIComponent(permissionCode)}`);
}

/** 5.2 Lấy Cây phân cấp Quyền theo Resource */
export function getPermissionTree(page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/permissions/permission-tree?page=${page}&size=${size}`);
}

/** 5.3 Lấy danh sách tất cả Quyền (Flat List Phân trang) */
export function listPermissions(page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/permissions?page=${page}&size=${size}`);
}

/** 5.4 Chi tiết Quyền theo ID */
export function getPermission(id) {
  return authRequest(`${API_PREFIX}/permissions/${id}`);
}

/** 5.5 Lấy danh sách Vai trò đang có Quyền này */
export function listPermissionRoles(permissionId) {
  return authRequest(`${API_PREFIX}/permissions/roles/${permissionId}`);
}

/** 5.6 Bật/Tắt Hiệu lực Quyền (Toggle Effect: ALLOW ↔ DENY) */
export function togglePermissionEffect(id) {
  return authRequest(`${API_PREFIX}/permissions/${id}/toggle-effect`, { method: "PUT" });
}

/* ───────────────────────────────────────────────────────────────
   MODULE 6: QUẢN LÝ TỔ CHỨC - ORGANIZATIONS (/api/v1/organizations)
   ─────────────────────────────────────────────────────────────── */

/** 6.1 Lấy danh sách Tổ chức (Phân trang) */
export function listOrganizations(page = 0, size = 50) {
  return authRequest(`${API_PREFIX}/organizations?page=${page}&size=${size}`);
}

/** 6.2 Chi tiết Tổ chức theo ID */
export function getOrganization(id) {
  return authRequest(`${API_PREFIX}/organizations/${id}`);
}

/** 6.3 Lấy Cây Sơ đồ Tổ chức Cha - Con */
export function getOrganizationTree(id) {
  return authRequest(`${API_PREFIX}/organizations/${id}/tree`);
}

/** 6.4 Tạo mới Tổ chức */
export function createOrganization(body) {
  return authRequest(`${API_PREFIX}/organizations`, { method: "POST", body });
}

/** 6.5 Cập nhật Tổ chức */
export function updateOrganization(id, body) {
  return authRequest(`${API_PREFIX}/organizations/${id}`, { method: "PUT", body });
}

/** 6.6 Xóa Tổ chức */
export function deleteOrganization(id) {
  return authRequest(`${API_PREFIX}/organizations/${id}`, { method: "DELETE" });
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES — Extractors & Helpers
   ═══════════════════════════════════════════════════════════════ */

/**
 * Trích xuất thông tin phân trang từ Spring Page<T> response.
 * Hoạt động cả khi response là array thuần (API trả list không phân trang).
 */
export function extractPage(response) {
  if (response && Array.isArray(response.content)) {
    return {
      items: response.content,
      totalElements: response.totalElements || 0,
      totalPages: response.totalPages || 1,
      page: response.number || 0,
      size: response.size || 10
    };
  }
  const items = Array.isArray(response) ? response : [];
  return { items, totalElements: items.length, totalPages: 1, page: 0, size: items.length };
}

/* ═══════════════════════════════════════════════════════════════
   HTTP LAYER — Request, Auth, Upload, Download
   ═══════════════════════════════════════════════════════════════ */

/**
 * authRequest: Gọi API có Bearer Token, tự động retry khi 401.
 */
async function authRequest(path, options = {}, retry = true) {
  const token = state.session?.accessToken;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    return await request(path, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
  } catch (error) {
    if (retry && error.status === 401 && state.session?.refreshToken) {
      await refreshSession();
      return authRequest(path, options, false);
    }
    if (error.status === 401) {
      clearSession();
    }
    throw error;
  }
}

/**
 * authUpload: Upload file (multipart/form-data) có Bearer Token.
 */
async function authUpload(path, formData) {
  const token = state.session?.accessToken;
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const msg = json?.status?.displayMessage || json?.status?.message || `Upload thất bại. Mã lỗi ${response.status}.`;
    const error = new Error(msg);
    error.status = response.status;
    throw error;
  }
  return json?.data !== undefined ? json.data : json;
}

/**
 * authDownload: Download file (Excel) có Bearer Token.
 * Trả về Blob để client tự tạo link tải.
 */
async function authDownload(path) {
  const token = state.session?.accessToken;
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    const msg = json?.status?.displayMessage || `Download thất bại. Mã lỗi ${response.status}.`;
    const error = new Error(msg);
    error.status = response.status;
    throw error;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch ? filenameMatch[1] : "export.xlsx";
  return { blob, filename };
}

/**
 * refreshSession: Tự động refresh access token khi hết hạn.
 */
async function refreshSession() {
  const data = await request("/api/auth/refresh-token", {
    method: "POST",
    body: { refreshToken: state.session.refreshToken }
  });
  saveSession({
    ...state.session,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken
  });
}

/**
 * request: HTTP request cơ bản, tự động unwrap BaseResponseDto.
 *
 * Response thành công:  { status: {...}, data: T }  →  return T
 * Response lỗi:         throw Error with status code, message, traceId
 */
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  // Không gửi Content-Type cho GET/DELETE không có body
  if (!options.body && (!options.method || options.method === "GET" || options.method === "DELETE")) {
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
  return json;
}
