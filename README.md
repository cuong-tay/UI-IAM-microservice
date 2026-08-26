# UI-IAM-microservice

Giao diện Quản Trị Phân Quyền & Định Danh (IAM Console) kết nối tới hệ thống **Microservice API Gateway (Port 8084)**.

---

## 🚀 Tính năng chính

- 👤 **Quản lý Người dùng**: Xem danh sách phân trang, thêm/sửa thông tin, khóa/mở khóa tài khoản, Import/Export Excel.
- 🛡 **Quản lý Vai trò (Roles)**: Tạo vai trò, phân quyền trực tiếp theo danh sách mã quyền.
- 🔑 **Danh mục Quyền truy cập (Permissions)**: Tra cứu ma trận quyền API, chuyển đổi hiệu lực `ALLOW` ↔ `DENY`.
- 👥 **Quản lý Nhóm (Groups)**: Gán người dùng vào nhóm, gán vai trò theo nhóm để phân quyền đồng loạt.
- 🏢 **Cơ cấu Tổ chức (Organizations)**: Sơ đồ cây phân cấp đơn vị, phòng ban và chi nhánh.
- 🌓 **Hỗ trợ 2 Theme**: Chế độ Sáng (Light Mode) & Chế độ Tối (Dark / Dash Mode) với nút chuyển đổi nhanh.
- 🔍 **Live Search**: Tìm kiếm nhanh tức thì trên tất cả các bảng dữ liệu.

---

## 🛠 Kiến trúc & Cấu trúc thư mục

Dự án được xây dựng bằng **Vanilla JavaScript (ES Modules)** và **Vanilla CSS**:

```text
├── index.html                  # Entry point chính của ứng dụng
├── styles/
│   └── app.css                 # Master Design System (Light & Dark Theme)
├── src/
│   ├── main.js                 # Controller chính & Event Handlers
│   ├── store.js                # Quản lý State & Theme persistence
│   ├── api-client.js           # Tích hợp toàn bộ API Gateway (Port 8084)
│   └── views/
│       ├── admin-view.js       # Giao diện Dashboard quản trị & Slide-over Drawer
│       ├── auth-view.js        # Giao diện Đăng nhập xác thực
│       └── helpers.js          # SVG Icons, formatters & UI helpers
├── API_DOCUMENTATION.md        # Tài liệu đặc tả API Microservice
└── README.md
```

---

## 💻 Hướng dẫn chạy dự án

1. **Khởi chạy Backend Gateway**: Đảm bảo API Gateway đang chạy trên cổng `http://localhost:8084`.
2. **Mở giao diện**: Mở trực tiếp file `index.html` trên trình duyệt (hoặc dùng Live Server / bất kỳ HTTP server tĩnh nào).
3. **Tài khoản đăng nhập mặc định**:
   - **Username**: `admin` *(hoặc `admin@example.com`)*
   - **Password**: `Password@123`
