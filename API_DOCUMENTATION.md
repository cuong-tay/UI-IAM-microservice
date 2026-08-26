# TÀI LIỆU API CHO FRONTEND (API SPECIFICATION & INTEGRATION GUIDE)

> **Workspace:** IAM & Microservice Starter Platform (`cuongvm-SRS`)  
> **Cập nhật:** Nhánh `develop-iam`  
> **Định dạng dữ liệu:** `application/json` (trừ API upload file dùng `multipart/form-data` và download file Excel)  

---

## 1. THÔNG TIN KẾT NỐI & PORT (ENVIRONMENT & ENDPOINTS)

### 1.1. Danh sách Port & Base URL

| Service | Port | Base URL Trực tiếp | Base URL qua Gateway (Khuyến nghị cho Frontend) |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `8084` | `http://localhost:8084` | `http://localhost:8084` |
| **Auth Service** (IAM) | `8082` | `http://localhost:8082` | `http://localhost:8084/api/auth/...` hoặc `http://localhost:8084/api/core/auth-service/api/...` |

### 1.2. Cách Gateway định tuyến (Routing Rule)
* **Auth APIs:** Frontend gọi trực tiếp tới `http://localhost:8084/api/auth/...` -> Gateway tự động chuyển tiếp tới `auth-service` (`http://localhost:8082/api/auth/...`).
* **Core APIs (Users, Roles, Groups, Permissions, Organizations):** 
  - Frontend gọi qua Gateway: `http://localhost:8084/api/core/auth-service/api/v1/...`
  - Hoặc trong môi trường Dev/Local có thể gọi thẳng tới Auth Service: `http://localhost:8082/api/v1/...`

### 1.3. Request Headers Chuẩn

| Header | Bắt buộc | Giá trị mẫu | Mô tả |
| :--- | :--- | :--- | :--- |
| `Content-Type` | Có (trừ GET/Delete/Upload) | `application/json` | Định dạng body gửi lên |
| `Authorization` | Có (với các API yêu cầu đăng nhập) | `Bearer eyJhbGciOi...` | Access Token nhận được sau khi login |
| `Accept-Language` | Tuỳ chọn | `vi` hoặc `en` | Tuỳ chọn ngôn ngữ hiển thị thông báo lỗi |

---

## 2. CẤU TRÚC DỮ LIỆU CHUẨN (STANDARD SCHEMAS)

Tất cả các API (trừ API download file Excel) đều trả về định dạng bọc thống nhất qua `BaseResponseDto<T>`.

### 2.1. Cấu trúc Response Thành công (`200 OK` / `201 Created`)
```json
{
  "status": {
    "code": "200",
    "message": "Operation completed successfully",
    "displayMessage": "Thao tác thành công",
    "traceId": "9fa8c1a2",
    "responseTime": "2026-08-25 08:30:00"
  },
  "data": { ... } // Đối tượng kết quả hoặc mảng, hoặc null
}
```

### 2.2. Cấu trúc Response Phân trang (Spring Data `Page<T>`)
Áp dụng cho các API trả về danh sách có phân trang (`getRoleList`, `getAll`, `getPermissionTree`, ...):
```json
{
  "status": {
    "code": "200",
    "message": "Operation completed successfully",
    "displayMessage": "Operation completed successfully",
    "traceId": "1b2c3d4e",
    "responseTime": "2026-08-25 08:30:00"
  },
  "data": {
    "content": [
      { /* item 1 */ },
      { /* item 2 */ }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10,
      "sort": { "sorted": true, "unsorted": false, "empty": false },
      "offset": 0,
      "paged": true,
      "unpaged": false
    },
    "totalElements": 45,
    "totalPages": 5,
    "last": false,
    "first": true,
    "size": 10,
    "number": 0,
    "numberOfElements": 10,
    "empty": false
  }
}
```

### 2.3. Cấu trúc Response Lỗi (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "status": {
    "code": "400",
    "message": "Validation error / Chi tiết lỗi kỹ thuật",
    "displayMessage": "Dữ liệu không hợp lệ",
    "traceId": "e3b8a1c9",
    "responseTime": "2026-08-25 08:30:00"
  },
  "data": null
}
```

### 2.4. Danh mục Enums (Hằng số trạng thái)

* **`UserStatus`**: `ACTIVE` (Hoạt động), `LOCKED` (Bị khóa), `DISABLED` (Vô hiệu hóa), `PENDING` (Chờ kích hoạt)
* **`RoleStatus`**: `ACTIVE` (Hoạt động), `INACTIVE` (Ngừng hoạt động)
* **`GroupStatus`**: `ACTIVE` (Hoạt động), `DISABLED` (Vô hiệu hóa)
* **`OrganizationStatus`**: `ACTIVE` (Hoạt động), `DISABLED` (Vô hiệu hóa)
* **`PermissionEffect`**: `ALLOW` (Cho phép), `DENY` (Từ chối/Cấm)

---

## 3. CHI TIẾT DANH SÁCH API

---

### MODULE 1: AUTHENTICATION & SECURITY (`/api/auth`)

#### 1.1. Đăng nhập (Username/Email & Mật khẩu)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/login`
* **Direct Endpoint:** `http://localhost:8082/api/auth/login`
* **Auth:** Không yêu cầu (Public)
* **Request Body:**
```json
{
  "usernameOrEmail": "admin",
  "password": "Password@123"
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Login successful", "displayMessage": "Đăng nhập thành công", "traceId": "...", "responseTime": "..." },
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "dGhpcy1pcy1yZWZyZXNo...",
    "mfaRequired": false,
    "mustChangePassword": false
  }
}
```

#### 1.2. Làm mới Token (Refresh Token)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/refresh-token`
* **Direct Endpoint:** `http://localhost:8082/api/auth/refresh-token`
* **Auth:** Không yêu cầu (Public)
* **Request Body:**
```json
{
  "refreshToken": "dGhpcy1pcy1yZWZyZXNo..."
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Token refreshed successfully", "displayMessage": "Làm mới token thành công" },
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "new-refresh-token...",
    "mfaRequired": false,
    "mustChangePassword": false
  }
}
```

#### 1.3. Đăng xuất (Logout)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/logout`
* **Direct Endpoint:** `http://localhost:8082/api/auth/logout`
* **Auth:** Bearer Token
* **Request Body:**
```json
{
  "refreshToken": "dGhpcy1pcy1yZWZyZXNo..."
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Logged out successfully", "displayMessage": "Đăng xuất thành công" },
  "data": null
}
```

#### 1.4. Kiểm tra Số điện thoại (Phone First-time Login Check)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/verify-phone`
* **Direct Endpoint:** `http://localhost:8082/api/auth/verify-phone`
* **Request Body:**
```json
{
  "phoneNumber": "0987654321",
  "deviceId": "web-browser-device-uuid"
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "phoneNumber": "0987654321",
    "isFirstTimeLogin": true
  }
}
```

#### 1.5. Gửi mã OTP (Send OTP)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/send-otp`
* **Direct Endpoint:** `http://localhost:8082/api/auth/send-otp`
* **Request Body:**
```json
{
  "phoneNumber": "0987654321"
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "message": "OTP sent successfully",
    "phoneNumber": "0987654321",
    "expiresInSeconds": 300
  }
}
```

#### 1.6. Xác thực mã OTP (Verify OTP)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/verify-otp`
* **Direct Endpoint:** `http://localhost:8082/api/auth/verify-otp`
* **Request Body:**
```json
{
  "phoneNumber": "0987654321",
  "otp": "123456",
  "deviceId": "web-browser-device-uuid"
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "verified": true,
    "message": "OTP verified successfully",
    "phoneNumber": "0987654321"
  }
}
```

#### 1.7. Xác thực mật khẩu theo số điện thoại (Verify Password)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/verify-password`
* **Direct Endpoint:** `http://localhost:8082/api/auth/verify-password`
* **Request Body:**
```json
{
  "phoneNumber": "0987654321",
  "password": "Password@123"
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "verified": true
  }
}
```

#### 1.8. Đặt lại mật khẩu (Reset Password bằng OTP)
* **Method:** `POST`
* **Gateway Endpoint:** `/api/auth/reset-password`
* **Direct Endpoint:** `http://localhost:8082/api/auth/reset-password`
* **Request Body:**
```json
{
  "phoneNumber": "0987654321",
  "otp": "123456",
  "newPassword": "NewPassword@123"
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Password reset successfully", "displayMessage": "Đổi mật khẩu thành công" },
  "data": null
}
```

#### 1.9. Kích hoạt tài khoản qua Token Email
* **Method:** `GET`
* **Gateway Endpoint:** `/api/auth/activate?token=...`
* **Direct Endpoint:** `http://localhost:8082/api/auth/activate?token=...`
* **Query Params:** `token` (String, required)
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Account activated successfully" },
  "data": null
}
```

---

### MODULE 2: QUẢN LÝ NGƯỜI DÙNG - USERS (`/api/v1/users`)

#### 2.1. Lấy danh sách Người dùng (Phân trang)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/users` (hoặc `/api/v1/users`)
* **Quyền yêu cầu:** `users:list`
* **Query Params:**
  - `page` (int, mặc định `0`)
  - `size` (int, mặc định `10`)
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": [
    {
      "id": 1,
      "uuid": "8b843187-b690-4e38-89c0-6d43343ef082",
      "username": "admin",
      "email": "admin@example.com",
      "fullName": "System Administrator",
      "phone": "0987654321",
      "organizationId": 1,
      "organizationCode": "HQ",
      "organizationName": "Headquarters",
      "status": "ACTIVE",
      "mustChangePassword": false,
      "failedLoginAttempts": 0,
      "lockedAt": null,
      "lockReason": null,
      "lastLoginAt": "2026-08-25T08:00:00",
      "createdAt": "2026-08-01T00:00:00",
      "updatedAt": "2026-08-25T08:00:00",
      "deletedAt": null
    }
  ]
}
```

#### 2.2. Chi tiết Người dùng theo ID
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/users/{id}` (hoặc `/api/v1/users/{id}`)
* **Path Params:** `id` (Long, ID của người dùng)
* **Response `200 OK`:** Trả về đối tượng `UserResponse` như trên.

#### 2.3. Tạo mới Người dùng
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/users` (hoặc `/api/v1/users`)
* **Request Body:**
```json
{
  "username": "johndoe",
  "email": "johndoe@example.com",
  "password": "Password@123",
  "fullName": "John Doe",
  "phone": "0912345678",
  "organizationId": 1
}
```
* **Validation Rules:**
  - `username`: 3-50 ký tự, chỉ gồm chữ thường, số, gạch dưới `^[a-z0-9_]+$`
  - `password`: 8-128 ký tự, có ít nhất 1 hoa, 1 thường, 1 số, 1 ký tự đặc biệt
  - `email`: Định dạng email hợp lệ, tối đa 255 ký tự
  - `organizationId`: Không được null

#### 2.4. Cập nhật Người dùng
* **Method:** `PUT`
* **Endpoint:** `/api/core/auth-service/api/v1/users/{id}` (hoặc `/api/v1/users/{id}`)
* **Path Params:** `id` (Long)
* **Request Body:**
```json
{
  "email": "johndoe_updated@example.com",
  "fullName": "John Doe Updated",
  "phone": "0912345679",
  "organizationId": 2
}
```

#### 2.5. Xóa Người dùng (Soft Delete)
* **Method:** `DELETE`
* **Endpoint:** `/api/core/auth-service/api/v1/users/{id}`
* **Response `200 OK`:** `data: null`

#### 2.6. Khóa Người dùng (Lock User)
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/users/{id}/lock`
* **Quyền yêu cầu:** `users:update`
* **Request Body:**
```json
{
  "reason": "Vi phạm chính sách bảo mật"
}
```
* **Response `200 OK`:** Trả về `UserResponse` với `status: "LOCKED"`.

#### 2.7. Mở khóa Người dùng (Unlock User)
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/users/{id}/unlock`
* **Quyền yêu cầu:** `users:update`
* **Body:** Không cần body
* **Response `200 OK`:** Trả về `UserResponse` với `status: "ACTIVE"`.

#### 2.8. Lấy danh sách Quyền hiệu lực của Người dùng (Effective Permissions)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/users/{id}/effective-permissions`
* **Query Params:** `page` (int, default 0), `size` (int, default 10), `sort` (default "id")
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "content": [
      {
        "id": 10,
        "code": "users:create",
        "effect": "ALLOW"
      },
      {
        "id": 11,
        "code": "users:delete",
        "effect": "DENY"
      }
    ],
    "totalElements": 2,
    "totalPages": 1,
    "size": 10,
    "number": 0
  }
}
```

#### 2.9. Import danh sách Người dùng từ file Excel
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/users/import`
* **Quyền yêu cầu:** `users:import`
* **Content-Type:** `multipart/form-data`
* **Form Data:** `file` (File Excel `.xlsx` / `.xls`)
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Import completed" },
  "data": {
    "totalRows": 100,
    "successCount": 98,
    "failedCount": 2,
    "errors": [
      {
        "rowNumber": 15,
        "field": "email",
        "message": "Email already exists"
      }
    ]
  }
}
```

#### 2.10. Export danh sách Người dùng ra file Excel
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/users/export`
* **Quyền yêu cầu:** `users:export`
* **Query Params:**
  - `organizationId` (Long, optional)
  - `status` (UserStatus, optional: `ACTIVE`, `LOCKED`, `DISABLED`, `PENDING`)
* **Response:** Binary Stream file Excel (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), đính kèm header `Content-Disposition: attachment; filename="users_export.xlsx"`.

---

### MODULE 3: QUẢN LÝ VAI TRÒ - ROLES (`/api/v1/roles`)

#### 3.1. Lấy danh sách Vai trò (Phân trang)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/roles` (hoặc `/api/v1/roles`)
* **Query Params:** `page` (default 0), `size` (default 10), `sort` (default "id")
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "content": [
      {
        "id": 1,
        "uuid": "7a8b9c...",
        "code": "ROLE_ADMIN",
        "name": "Quản trị viên hệ thống",
        "description": "Toàn quyền quản lý hệ thống",
        "system": true,
        "status": "ACTIVE",
        "createdAt": "2026-08-01T00:00:00",
        "updatedAt": "2026-08-01T00:00:00"
      }
    ],
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### 3.2. Chi tiết Vai trò theo ID
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/roles/{id}`
* **Response `200 OK`:** Trả về đối tượng `RoleResponse`.

#### 3.3. Tạo mới Vai trò
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/roles`
* **Request Body:**
```json
{
  "code": "ROLE_MANAGER",
  "name": "Quản lý phòng ban",
  "description": "Quản lý nhân sự và phân công công việc",
  "status": "ACTIVE"
}
```

#### 3.4. Cập nhật Vai trò
* **Method:** `PUT`
* **Endpoint:** `/api/core/auth-service/api/v1/roles/{id}`
* **Request Body:**
```json
{
  "name": "Quản lý cấp cao",
  "description": "Mô tả mới",
  "status": "ACTIVE"
}
```

#### 3.5. Xóa Vai trò
* **Method:** `DELETE`
* **Endpoint:** `/api/core/auth-service/api/v1/roles/{id}`
* **Response `200 OK`:** `data: null`

#### 3.6. Gán quyền cho Vai trò (Assign Permissions to Role)
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/roles/{id}/permissions`
* **Quyền yêu cầu:** `roles:approve`
* **Path Params:** `id` (Role ID)
* **Request Body:**
```json
{
  "permissionIds": [1, 2, 3, 4]
}
```
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Permissions assigned successfully" },
  "data": [
    {
      "roleId": 1,
      "roleCode": "ROLE_MANAGER",
      "permissionId": 1,
      "permissionCode": "users:read",
      "assignedBy": "admin",
      "assignedAt": "2026-08-25T08:30:00"
    }
  ]
}
```

#### 3.7. Thu hồi quyền khỏi Vai trò (Remove Permission from Role)
* **Method:** `DELETE`
* **Endpoint:** `/api/core/auth-service/api/v1/roles/{roleId}/permissions/{permissionId}`
* **Quyền yêu cầu:** `roles:approve`
* **Response `200 OK`:** `data: null`

#### 3.8. Danh sách Quyền của một Vai trò (Phân trang)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/roles/permissions/{roleId}`
* **Quyền yêu cầu:** `roles:list`
* **Query Params:** `page`, `size`, `sort`
* **Response `200 OK`:** `Page<RolePermissionResponse>`

#### 3.9. Danh sách Nhóm đang được gán Vai trò này
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/roles/groups/{roleId}`
* **Quyền yêu cầu:** `roles:list`
* **Query Params:** `page`, `size`, `sort`
* **Response `200 OK`:** `Page<GroupRoleResponse>`

---

### MODULE 4: QUẢN LÝ NHÓM - GROUPS (`/api/v1/groups`)

#### 4.1. Lấy danh sách Nhóm (Phân trang)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/groups`
* **Query Params:** `page`, `size`, `sort`
* **Response `200 OK`:** `Page<GroupResponse>`

#### 4.2. Chi tiết Nhóm theo ID
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{id}`
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "id": 1,
    "uuid": "5e4d3c...",
    "code": "GRP_IT",
    "name": "Nhóm Kỹ thuật IT",
    "description": "Nhóm phụ trách hệ thống IT",
    "organizationId": 1,
    "organizationCode": "HQ",
    "organizationName": "Headquarters",
    "status": "ACTIVE",
    "createdAt": "2026-08-01T00:00:00",
    "updatedAt": "2026-08-01T00:00:00"
  }
}
```

#### 4.3. Lấy danh sách Nhóm theo Tổ chức/Đơn vị
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/by-organization/{organizationId}`
* **Quyền yêu cầu:** `organizations:list`
* **Response `200 OK`:** `List<GroupResponse>`

#### 4.4. Lấy danh sách Nhóm của 1 Người dùng
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/by-user/{userId}`
* **Response `200 OK`:** `List<UserGroupResponse>`

#### 4.5. Tạo mới Nhóm
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/groups`
* **Request Body:**
```json
{
  "code": "GRP_DEV",
  "name": "Nhóm Lập trình",
  "description": "Phát triển phần mềm",
  "organizationId": 1
}
```

#### 4.6. Cập nhật Nhóm
* **Method:** `PUT`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{id}`
* **Request Body:**
```json
{
  "code": "GRP_DEV",
  "name": "Nhóm Phát triển Phần mềm",
  "description": "Mô tả mới",
  "status": "ACTIVE"
}
```

#### 4.7. Xóa Nhóm
* **Method:** `DELETE`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{id}`
* **Response `200 OK`:** `data: null`

#### 4.8. Gán Người dùng vào Nhóm (Add Users to Group)
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{id}/users`
* **Quyền yêu cầu:** `groups:approve`
* **Request Body:**
```json
{
  "userIds": [1, 2, 5]
}
```
* **Response `200 OK`:** `List<UserGroupResponse>`

#### 4.9. Xóa Người dùng khỏi Nhóm
* **Method:** `DELETE`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{id}/users/{userId}`
* **Quyền yêu cầu:** `groups:approve`
* **Response `200 OK`:** `data: null`

#### 4.10. Lấy danh sách Người dùng trong Nhóm
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{id}/users`
* **Quyền yêu cầu:** `groups:list`
* **Response `200 OK`:** `List<UserGroupResponse>`

#### 4.11. Gán Vai trò cho Nhóm (Assign Roles to Group)
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{id}/roles`
* **Quyền yêu cầu:** `groups:approve`
* **Request Body:**
```json
{
  "roleIds": [1, 3]
}
```
* **Response `200 OK`:** `List<GroupRoleResponse>`

#### 4.12. Xóa Vai trò khỏi Nhóm
* **Method:** `DELETE`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/{groupId}/roles/{roleId}`
* **Quyền yêu cầu:** `groups:approve`
* **Response `200 OK`:** `data: null`

#### 4.13. Lấy danh sách Vai trò của Nhóm (Phân trang)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/groups/roles/{groupId}`
* **Quyền yêu cầu:** `groups:list`
* **Response `200 OK`:** `Page<GroupRoleResponse>`

---

### MODULE 5: QUẢN LÝ QUYỀN - PERMISSIONS (`/api/v1/permissions`)

#### 5.1. Kiểm tra Quyền của User hiện tại (Check Permission Directly)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/permissions/can?permission=users:create`
* **Auth:** Bearer Token
* **Query Params:** `permission` (String, ví dụ `users:create`, `roles:approve`, ...)
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": true // true nếu có quyền, false nếu bị chặn
}
```

#### 5.2. Lấy Cây phân cấp Quyền theo Resource (Permission Tree)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/permissions/permission-tree`
* **Quyền yêu cầu:** `permissions:list`
* **Query Params:** `page`, `size`, `sort`
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "content": [
      {
        "resource": "users",
        "permissions": [
          {
            "id": 1,
            "uuid": "...",
            "code": "users:create",
            "name": "Tạo người dùng",
            "resource": "users",
            "action": "create",
            "effect": "ALLOW",
            "createdAt": "2026-08-01T00:00:00",
            "updatedAt": "2026-08-01T00:00:00"
          },
          {
            "id": 2,
            "uuid": "...",
            "code": "users:list",
            "name": "Xem danh sách người dùng",
            "resource": "users",
            "action": "list",
            "effect": "ALLOW",
            "createdAt": "2026-08-01T00:00:00",
            "updatedAt": "2026-08-01T00:00:00"
          }
        ]
      }
    ],
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### 5.3. Lấy danh sách tất cả Quyền (Flat List Phân trang)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/permissions`
* **Query Params:** `page`, `size`, `sort`
* **Response `200 OK`:** `Page<PermissionResponse>`

#### 5.4. Chi tiết Quyền theo ID
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/permissions/{id}`
* **Response `200 OK`:** Trả về `PermissionResponse`.

#### 5.5. Lấy danh sách Vai trò đang có Quyền này
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/permissions/roles/{permissionId}`
* **Quyền yêu cầu:** `permissions:list`
* **Response `200 OK`:** `Page<RolePermissionResponse>`

#### 5.6. Bật/Tắt Hiệu lực Quyền (Toggle Effect: ALLOW <-> DENY)
* **Method:** `PUT`
* **Endpoint:** `/api/core/auth-service/api/v1/permissions/{id}/toggle-effect`
* **Response `200 OK`:** Trả về `PermissionResponse` với giá trị `effect` mới.

---

### MODULE 6: QUẢN LÝ TỔ CHỨC / ĐƠN VỊ - ORGANIZATIONS (`/api/v1/organizations`)

#### 6.1. Lấy danh sách Tổ chức (Phân trang)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/organizations`
* **Quyền yêu cầu:** `organizations:list`
* **Query Params:** `page`, `size`, `sort`
* **Response `200 OK`:** `Page<OrganizationResponse>`

#### 6.2. Chi tiết Tổ chức theo ID
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/organizations/{id}`
* **Quyền yêu cầu:** `organizations:read`
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "id": 1,
    "uuid": "4c3b2a...",
    "code": "ORG_HQ",
    "name": "Tập đoàn Tổng công ty",
    "description": "Trụ sở chính",
    "parentId": null,
    "level": 1,
    "path": "/1",
    "status": "ACTIVE",
    "createdAt": "2026-08-01T00:00:00",
    "updatedAt": "2026-08-01T00:00:00"
  }
}
```

#### 6.3. Lấy Cây Sơ đồ Tổ chức Cha - Con (Organization Tree)
* **Method:** `GET`
* **Endpoint:** `/api/core/auth-service/api/v1/organizations/{id}/tree`
* **Quyền yêu cầu:** `organizations:list`
* **Path Params:** `id` (ID của tổ chức gốc cần lấy cây)
* **Response `200 OK`:**
```json
{
  "status": { "code": "200", "message": "Success" },
  "data": {
    "id": 1,
    "uuid": "4c3b2a...",
    "code": "ORG_HQ",
    "name": "Tập đoàn Tổng công ty",
    "description": "Trụ sở chính",
    "level": 1,
    "path": "/1",
    "status": "ACTIVE",
    "children": [
      {
        "id": 2,
        "uuid": "5d4c3b...",
        "code": "ORG_HN",
        "name": "Chi nhánh Hà Nội",
        "description": "Văn phòng miền Bắc",
        "level": 2,
        "path": "/1/2",
        "status": "ACTIVE",
        "children": []
      }
    ]
  }
}
```

#### 6.4. Tạo mới Tổ chức
* **Method:** `POST`
* **Endpoint:** `/api/core/auth-service/api/v1/organizations`
* **Request Body:**
```json
{
  "code": "ORG_HCM",
  "name": "Chi nhánh TP. Hồ Chí Minh",
  "description": "Văn phòng đại diện miền Nam",
  "parentId": 1
}
```

#### 6.5. Cập nhật Tổ chức
* **Method:** `PUT`
* **Endpoint:** `/api/core/auth-service/api/v1/organizations/{id}`
* **Request Body:**
```json
{
  "code": "ORG_HCM",
  "name": "Chi nhánh TP.HCM - Mở rộng",
  "description": "Mô tả mới",
  "status": "ACTIVE"
}
```

#### 6.6. Xóa Tổ chức
* **Method:** `DELETE`
* **Endpoint:** `/api/core/auth-service/api/v1/organizations/{id}`
* **Response `200 OK`:** `data: null`

---

## 4. HƯỚNG DẪN TÍCH HỢP CHO FRONTEND DEVELOPER (FRONTEND CHEAT SHEET)

### 4.1. Cấu hình Axios Client Mẫu (TypeScript / JavaScript)

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8084';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Tự động đính kèm Access Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Xử lý Tự động Refresh Token khi gặp lỗi 401
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const res = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);
```

### 4.2. Xử lý các mã lỗi phổ biến trên giao diện (UI Error Handling)

| Mã lỗi HTTP | Nguyên nhân | Hành động gợi ý cho Frontend |
| :--- | :--- | :--- |
| `400 Bad Request` | Dữ liệu gửi lên sai định dạng / vi phạm validate | Đọc `status.displayMessage` hoặc `status.message` để hiển thị toast notification đỏ hoặc gán vào form field error. |
| `401 Unauthorized` | Token không hợp lệ, hết hạn hoặc bị thu hồi | Gọi refresh token hoặc tự động chuyển hướng về trang `/login`. |
| `403 Forbidden` | Người dùng không đủ quyền thực hiện hành động | Hiển thị thông báo "Bạn không có quyền thực hiện thao tác này" hoặc ẩn các nút bấm tương ứng trên UI. |
| `404 Not Found` | Bản ghi hoặc endpoint không tồn tại | Hiển thị thông báo "Không tìm thấy dữ liệu". |
| `409 Conflict` | Dữ liệu bị trùng lặp (ví dụ trùng Username, Email, Code) | Hiển thị cảnh báo trùng mã / bản ghi cho người dùng. |
| `500 Server Error` | Lỗi nội bộ hệ thống | Hiển thị thông báo lỗi chung kèm mã `traceId` để hỗ trợ báo lỗi với team Backend. |
