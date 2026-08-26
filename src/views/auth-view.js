/* ═══════════════════════════════════════════════════════════════
   Auth View — Màn hình Đăng Nhập IAM Portal
   ═══════════════════════════════════════════════════════════════ */

import { escapeHtml, icons, renderStatus } from "./helpers.js";

export function renderAuthView(state) {
  return `
    <div class="auth-page-container">
      <div class="auth-ambient-glow"></div>

      <div class="auth-grid-layout">
        <!-- Login Card Column -->
        <div class="auth-card-panel">
          <div class="auth-header-block">
            <div class="auth-brand-badge">
              <span class="auth-logo-text">IAM</span>
            </div>
            <div class="auth-brand-meta">
              <strong class="auth-brand-title">Security &amp; Governance</strong>
              <span class="auth-brand-sub">Microservice IAM Console</span>
            </div>
            <button class="btn-icon-only auth-theme-toggle" data-action="toggle-theme" title="Chuyển chế độ Sáng / Tối">
              ${state.theme === 'dark' ? icons.sun : icons.moon}
            </button>
          </div>

          <div class="auth-welcome-text">
            <span class="auth-eyebrow">XÁC THỰC QUYỀN HẠN</span>
            <h1 class="auth-main-title">Đăng nhập quản trị</h1>
            <p class="auth-main-desc">Nhập thông tin định danh để truy cập vào hệ thống quản lý phân quyền.</p>
          </div>

          ${renderStatus(state.status)}

          <form id="login-form" data-form="login" class="auth-form">
            <div class="auth-form-fields">
              <div class="input-group">
                <label for="usernameOrEmail">Tên đăng nhập hoặc Email <span class="required-star">*</span></label>
                <div class="input-with-icon">
                  <span class="field-icon">${icons.users}</span>
                  <input
                    id="usernameOrEmail"
                    name="usernameOrEmail"
                    type="text"
                    placeholder="admin hoặc admin@example.com"
                    required
                    autocomplete="username"
                  >
                </div>
              </div>

              <div class="input-group">
                <label for="password">Mật khẩu xác thực <span class="required-star">*</span></label>
                <div class="input-with-icon">
                  <span class="field-icon">${icons.shield}</span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    autocomplete="current-password"
                  >
                </div>
              </div>
            </div>

            <button class="btn-primary auth-submit-btn" type="submit">
              <span>Đăng nhập hệ thống</span>
              <span class="btn-arrow">→</span>
            </button>
          </form>

          <!-- Sample credentials box -->
          <div class="sample-credentials-card">
            <div class="credentials-header">
              <span class="credentials-badge">💡 THÔNG TIN MẪU</span>
            </div>
            <div class="credentials-body">
              <div class="credential-row">
                <span class="credential-label">Username:</span>
                <code class="credential-value">admin</code>
                <span class="credential-alt">(hoặc admin@example.com)</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Password:</span>
                <code class="credential-value">Password@123</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Hero Showcase Column -->
        <div class="auth-showcase-panel">
          <div class="showcase-top">
            <span class="showcase-tag">NỀN TẢNG BẢO MẬT &amp; PHÂN QUYỀN MICROSERVICE</span>
            <h2 class="showcase-title">Quản trị toàn diện định danh &amp; tài nguyên hệ thống</h2>
            <p class="showcase-subtitle">Kiểm soát tập trung người dùng, vai trò, quyền hạn API và cơ cấu tổ chức đa chi nhánh với độ tin cậy cao.</p>
          </div>

          <div class="showcase-features-list">
            <div class="showcase-feature-item">
              <div class="feature-icon-box">👤</div>
              <div class="feature-content">
                <strong>Quản lý Người Dùng Đa Đơn Vị</strong>
                <p>Khóa/Mở khóa tài khoản tức thì, import/export dữ liệu Excel và kiểm tra quyền hiệu lực của từng người.</p>
              </div>
            </div>

            <div class="showcase-feature-item">
              <div class="feature-icon-box">🛡</div>
              <div class="feature-content">
                <strong>Phân Vai Trò &amp; Nhóm Linh Hoạt</strong>
                <p>Gán quyền trực tiếp cho vai trò và phân bổ vai trò theo từng nhóm chuyên trách dễ dàng.</p>
              </div>
            </div>

            <div class="showcase-feature-item">
              <div class="feature-icon-box">🏢</div>
              <div class="feature-content">
                <strong>Cây Phân Cấp Cơ Cấu Tổ Chức</strong>
                <p>Mô hình hóa trụ sở, chi nhánh và các phòng ban theo cây phân cấp đa tầng.</p>
              </div>
            </div>
          </div>

          <div class="showcase-footer">
            <span class="showcase-version">IAM Microservice Platform • Gateway Port 8084 • v2.0</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
