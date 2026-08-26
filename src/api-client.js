/* ═══════════════════════════════════════════════════════════════
   API Client — Microservice Gateway (port 8084)
   Tất cả endpoints theo tài liệu API_DOCUMENTATION.md
   ═══════════════════════════════════════════════════════════════ */

import { clearSession, saveSession, setAccessContext, clearAccessContext, state } from "./store.js";

const BASE_URL = "http://localhost:8084";
const API_PREFIX = "/api/core/auth-service/api/v1";
let refreshPromise = null;

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
   ACCESS CONTEXT — JWT Decode & Permission Loading
   ═══════════════════════════════════════════════════════════════ */

/**
 * Decode JWT payload (phần giữa) để lấy userId (sub/id), username, email, fullName, roles.
 * Không verify signature — chỉ đọc claims.
 * @param {string} token  JWT access token
 * @returns {{ userId: number|null, username: string|null, email: string|null, fullName: string|null, roles: Array<string> }}
 */
export function decodeJwtPayload(token) {
  try {
    const parts = (token || "").split(".");
    if (parts.length < 2) return { userId: null, username: null, email: null, fullName: null, roles: [] };
    // Base64url → Base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    const payload = JSON.parse(jsonStr);

    // Extract userId (numeric)
    let userId = null;
    if (payload.userId !== undefined && payload.userId !== null && !isNaN(Number(payload.userId))) {
      userId = Number(payload.userId);
    } else if (payload.user_id !== undefined && payload.user_id !== null && !isNaN(Number(payload.user_id))) {
      userId = Number(payload.user_id);
    } else if (payload.id !== undefined && payload.id !== null && !isNaN(Number(payload.id))) {
      userId = Number(payload.id);
    } else if (payload.sub && !isNaN(Number(payload.sub))) {
      userId = Number(payload.sub);
    }

    // Extract username (string)
    let username = payload.username || payload.preferred_username || payload.name || null;
    if (!username && payload.sub && isNaN(Number(payload.sub))) {
      username = payload.sub;
    }

    // Extract roles
    const rawRoles = payload.roles || payload.authorities || payload.role || payload.scope || [];
    const roles = Array.isArray(rawRoles)
      ? rawRoles.map(r => String(r.authority || r.name || r.code || r).replace(/^ROLE_/, ""))
      : typeof rawRoles === "string"
        ? rawRoles.split(/\s+/).map(r => r.replace(/^ROLE_/, "")).filter(Boolean)
        : [];

    return {
      userId: userId,
      username: username,
      email: payload.email || null,
      fullName: payload.fullName || payload.full_name || payload.name || null,
      roles: roles
    };
  } catch {
    return { userId: null, username: null, email: null, fullName: null, roles: [] };
  }
}

/**
 * Nạp Access Context sau khi login:
 *  1. Decode JWT lấy userId, username, email, roles
 *  2. Gọi GET /users/{userId} lấy profile (nếu có userId)
 *  3. Gọi GET /users/{userId}/effective-permissions lấy danh sách quyền
 *  4. Build accessContext và lưu vào store
 *
 * @returns {Promise<{user: object, isSystemAdmin: boolean, permissions: Array}>}
 */
export async function loadAccessContext() {
  const token = state.session?.accessToken;
  if (!token) {
    clearAccessContext();
    return null;
  }

  const decoded = decodeJwtPayload(token);
  const username = decoded.username || state.session?.username || "";
  let userId = decoded.userId || state.session?.user?.id || null;

  // Detect system admin (backend bypass cho username "admin" hoặc role ADMIN/SUPER_ADMIN)
  const isSystemAdmin = (username || "").toLowerCase() === "admin" ||
    (decoded.roles || []).some(r => {
      const u = String(r).toUpperCase();
      return u === "ADMIN" || u === "SUPER_ADMIN";
    });

  let userProfile = {
    id: userId,
    username: username || "Người dùng",
    fullName: decoded.fullName || state.session?.fullName || username || "",
    email: decoded.email || state.session?.email || "",
    roles: decoded.roles || state.session?.roles || [],
    status: "ACTIVE"
  };
  let permissions = [];

  try {
    const promises = [];
    if (userId) {
      promises.push(safeLoad(() => getUser(userId)));
      promises.push(safeLoad(() => getUserEffectivePermissions(userId, 0, 200)));
    } else {
      // Nếu userId chưa có từ JWT, thử tìm trong listUsers nếu có quyền
      promises.push(safeLoad(async () => {
        const res = await listUsers(0, 100);
        const page = extractPage(res);
        const found = (page.items || []).find(u =>
          (username && u.username?.toLowerCase() === username.toLowerCase()) ||
          (decoded.email && u.email?.toLowerCase() === decoded.email.toLowerCase())
        );
        return found || null;
      }));
      promises.push(Promise.resolve(null));
    }

    const [profileRes, permsRes] = await Promise.all(promises);

    if (profileRes) {
      userId = profileRes.id || userId;
      userProfile = {
        id: profileRes.id || userId,
        username: profileRes.username || username || "Người dùng",
        fullName: profileRes.fullName || profileRes.username || decoded.fullName || username || "",
        email: profileRes.email || decoded.email || "",
        status: profileRes.status || "ACTIVE",
        roles: profileRes.roles || decoded.roles || [],
        roleName: profileRes.roleName || (decoded.roles && decoded.roles[0]) || "",
        organizationId: profileRes.organizationId || null,
        organizationName: profileRes.organizationName || ""
      };

      // Nếu có userId sau khi tìm được profileRes mà chưa load perms, thử load perms
      if (!permsRes && userId) {
        const pRes = await safeLoad(() => getUserEffectivePermissions(userId, 0, 200));
        if (pRes) {
          const page = extractPage(pRes);
          permissions = (page.items || []).map(p => ({
            code: (p.code || "").trim(),
            effect: p.effect || "ALLOW"
          }));
        }
      }
    }

    if (permsRes) {
      const page = extractPage(permsRes);
      permissions = (page.items || []).map(p => ({
        code: (p.code || "").trim(),
        effect: p.effect || "ALLOW"
      }));
    }
  } catch (err) {
    console.warn("Failed to load access context:", err.message);
    if (!state.session?.accessToken) {
      clearAccessContext();
      return null;
    }
  }

  // Update session with enriched user profile
  if (state.session) {
    saveSession({
      ...state.session,
      username: userProfile.username,
      fullName: userProfile.fullName,
      email: userProfile.email,
      roles: userProfile.roles,
      user: userProfile
    });
  }

  const ctx = { user: userProfile, isSystemAdmin, permissions };
  setAccessContext(ctx);
  return ctx;
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
      try {
        await refreshSession();
      } catch (refreshError) {
        // The refresh token is revoked when an administrator locks this user.
        // Never leave the old protected UI visible in that situation.
        clearSession();
        const sessionError = new Error("Phiên đăng nhập đã hết hạn hoặc tài khoản đã bị khóa.");
        sessionError.status = 401;
        sessionError.cause = refreshError;
        throw sessionError;
      }
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
  // Several parallel requests may receive 401 together. Refresh tokens are
  // rotated by the backend, so all callers must await the same refresh request.
  if (!refreshPromise) {
    const refreshTokenValue = state.session?.refreshToken;
    refreshPromise = request("/api/auth/refresh-token", {
      method: "POST",
      body: { refreshToken: refreshTokenValue }
    }).then(data => {
      if (!state.session) {
        throw new Error("Phiên đăng nhập không còn tồn tại.");
      }
      saveSession({
        ...state.session,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });
      return data;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
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
