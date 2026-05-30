# Kiến Trúc Hệ Thống — Bosch HR Management (BGSV Internal Tool)

> **Đề tài:** Phân tích yêu cầu và thiết kế phần mềm quản lý nội bộ dành cho cấp Quản lý tại Bosch Global Software Technologies (BGSV).

---

## 1. Tổng Quan Kiến Trúc

Hệ thống được xây dựng theo mô hình **Serverless Frontend + BaaS (Backend-as-a-Service)**, không có backend server riêng. Toàn bộ logic nghiệp vụ chạy trên trình duyệt (client-side), giao tiếp trực tiếp với Supabase thông qua REST API / Realtime.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   HTML Pages  ──►  JavaScript Modules  ──►  Supabase JS SDK    │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTPS / REST API
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (BaaS Platform)                     │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│   │  Auth Service│  │  REST API    │  │  Storage (Files)     │ │
│   │  (JWT-based) │  │  (PostgREST) │  │  (Avatar, JD files)  │ │
│   └──────────────┘  └──────┬───────┘  └──────────────────────┘ │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   PostgreSQL    │                          │
│                    │   Database      │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Công Nghệ Sử Dụng

| Tầng | Công nghệ | Vai trò |
|------|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) | Giao diện người dùng, logic nghiệp vụ |
| **UI Library** | Font Awesome 6, Google Fonts (Inter) | Icon, typography |
| **Chart Library** | Chart.js | Biểu đồ Dashboard (Line, Bar, Pie, Heatmap) |
| **Backend-as-a-Service** | Supabase | Database, Auth, Storage, REST API |
| **Database** | PostgreSQL (hosted trên Supabase) | Lưu trữ dữ liệu quan hệ |
| **Auth** | Supabase Auth + Custom session (localStorage) | Xác thực người dùng |
| **Storage** | Supabase Storage | Lưu avatar, file JD |
| **Hosting** | Static file (local / có thể deploy lên Vercel/Netlify) | Phục vụ HTML/CSS/JS |

---

## 3. Cấu Trúc Thư Mục

```
Kientap/
│
├── index.html                  # Trang đăng nhập
├── dashboard.html              # Dashboard tổng quan
├── hr.html                     # Quản lý nhân sự
├── operations.html             # Vận hành (Khách hàng, Hợp đồng, Dự án)
├── budget.html                 # Ngân sách
├── organization.html           # Cơ cấu tổ chức
├── activity-log.html           # Nhật ký hoạt động
├── account.html                # Tài khoản cá nhân
├── forgot-password.html        # Quên mật khẩu
│
├── css/
│   ├── global.css              # Biến CSS, reset, layout chung
│   ├── dashboard.css           # Style trang Dashboard
│   ├── hr.css                  # Style trang Nhân sự
│   ├── operations.css          # Style trang Vận hành
│   ├── tables.css              # Style bảng dữ liệu dùng chung
│   ├── login.css               # Style trang đăng nhập
│   └── forgot-password.css     # Style trang quên mật khẩu
│
├── js/
│   ├── supabase-client.js      # Khởi tạo kết nối Supabase
│   ├── db.js                   # Data Access Layer — tất cả query Supabase
│   ├── router.js               # Routing, phân quyền, điều hướng trang
│   ├── auth.js                 # Logic đăng nhập / đăng xuất
│   ├── global.js               # Toast notification, form validation
│   ├── common.js               # Utility functions dùng chung
│   ├── page-common.js          # Khởi tạo chung cho các trang (sidebar, nav)
│   ├── ui-helpers.js           # Helper render UI (modal, table rows...)
│   ├── mock-store.js           # Mock data store (localStorage fallback)
│   ├── dashboard.js            # Logic trang Dashboard
│   ├── hr-page.js              # Logic trang Nhân sự
│   ├── operations-page.js      # Logic trang Vận hành
│   ├── budget-page.js          # Logic trang Ngân sách
│   ├── organization-page.js    # Logic trang Cơ cấu tổ chức
│   ├── activity-log-page.js    # Logic trang Nhật ký
│   └── account.js              # Logic trang Tài khoản
│
├── Source/Image/               # Ảnh tĩnh (logo Bosch...)
└── assets/                     # Tài nguyên bổ sung
```

---

## 4. Kiến Trúc Phân Lớp (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (HTML + CSS)                                │
│  index.html, dashboard.html, hr.html, operations.html...        │
│  css/global.css, css/dashboard.css, css/tables.css...           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  APPLICATION LAYER (JavaScript)                                 │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Page Logic     │  │  Shared Services │  │  Auth & RBAC  │  │
│  │  dashboard.js   │  │  global.js       │  │  auth.js      │  │
│  │  hr-page.js     │  │  common.js       │  │  router.js    │  │
│  │  operations-    │  │  ui-helpers.js   │  │               │  │
│  │  page.js        │  │  page-common.js  │  │               │  │
│  │  budget-page.js │  │                  │  │               │  │
│  │  ...            │  │                  │  │               │  │
│  └─────────────────┘  └──────────────────┘  └───────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  DATA ACCESS LAYER                                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  db.js  (window.DB)                                      │   │
│  │  DB.Employees  DB.Customers  DB.Contracts  DB.Projects   │   │
│  │  DB.Budgets    DB.Org        DB.Meta       DB.Logs       │   │
│  │  DB.Assignments  DB.Effort   DB.Storage    DB.Auth       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  mock-store.js  (window.Store)  — localStorage fallback  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │  Supabase JS SDK
┌──────────────────────────────▼──────────────────────────────────┐
│  BACKEND LAYER (Supabase)                                       │
│                                                                 │
│  supabase-client.js  →  window.supabaseClient                   │
│  URL: https://fnlaikizesijkzseauup.supabase.co                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  PostgREST   │  │  Auth        │  │  Storage             │   │
│  │  (CRUD API)  │  │  (JWT)       │  │  (Buckets)           │   │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘   │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Luồng Xác Thực (Authentication Flow)

```
User nhập email/password
        │
        ▼
auth.js → query bảng users (Supabase)
        │
        ├── Không tìm thấy → Hiển thị lỗi
        │
        ├── is_locked = true → Hiển thị lỗi khóa tài khoản
        │
        ├── password_hash không khớp
        │       └── failed_attempts >= 5 → Khóa tài khoản (is_locked = true)
        │       └── failed_attempts < 5  → Tăng counter, hiển thị số lần còn lại
        │
        └── Đăng nhập thành công
                │
                ├── Reset failed_attempts = 0
                ├── Lấy role từ bảng roles
                ├── Lấy thông tin nhân viên từ bảng employees
                ├── Lưu session vào localStorage (currentUser)
                ├── Tạo bản ghi user_sessions (Supabase)
                └── Redirect → dashboard.html
```

---

## 6. Hệ Thống Phân Quyền (RBAC)

Có 4 role chính, được định nghĩa trong `router.js`:

| Role Code | Tên Role | Mô tả |
|-----------|----------|-------|
| `DH` | Department Head | Chỉ xem, không thao tác (trừ trang Tài khoản) |
| `GM` | General Manager | Toàn quyền thao tác tất cả module |
| `DM` | Department Manager | Thao tác HR, Vận hành; không thao tác Ngân sách |
| `OP` | Operations | Thao tác Ngân sách; không thấy trang HR, Tổ chức |

### Ma trận phân quyền theo trang:

| Trang | DH | GM | DM | OP |
|-------|----|----|----|----|
| Dashboard (xem) | ✅ | ✅ | ✅ | ✅ |
| Dashboard (xuất báo cáo) | ❌ | ✅ | ❌ | ❌ |
| Nhân sự (xem) | ✅ | ✅ | ✅ | ❌ |
| Nhân sự (thêm/sửa/xóa) | ❌ | ✅ | ✅ | ❌ |
| Vận hành (xem) | ✅ | ✅ | ✅ | ✅ |
| Vận hành (thao tác) | ❌ | ✅ | ✅ | ❌ |
| Ngân sách (xem) | ✅ | ✅ | ✅ | ✅ |
| Ngân sách (thao tác) | ❌ | ✅ | ❌ | ✅ |
| Cơ cấu tổ chức | ✅ | ✅ | ✅ | ❌ |
| Cơ cấu tổ chức (thao tác) | ❌ | ✅ | ❌ | ❌ |
| Nhật ký (xem) | ✅ | ✅ | ✅ | ✅ |
| Nhật ký (thao tác) | ❌ | ✅ | ❌ | ❌ |
| Tài khoản cá nhân | ✅ | ✅ | ✅ | ✅ |

---

## 7. Cấu Trúc Cơ Sở Dữ Liệu (PostgreSQL trên Supabase)

### 7.1 Nhóm bảng Auth & User

```
users               → Tài khoản đăng nhập (user_id, employee_id, role_id, password_hash, is_locked...)
roles               → Vai trò (role_id, role_code: DH|GM|DM|OP, role_name)
user_sessions       → Phiên đăng nhập (session_token, device, expired_at, status)
login_logs          → Lịch sử đăng nhập (login_time, result: success|failed, ip_address)
audit_logs          → Nhật ký thao tác (action_type: INSERT|UPDATE|DELETE|LOGIN|LOGOUT|EXPORT)
password_reset_requests → Yêu cầu đặt lại mật khẩu
```

### 7.2 Nhóm bảng Nhân sự

```
employees           → Thông tin nhân viên (employee_code, full_name, gender, hire_date, status)
positions           → Chức danh (position_name)
job_levels          → Cấp bậc (level_name: L1-L7, level_order)
groups              → Nhóm tổ chức cấp cao nhất
teams               → Nhóm con trong Group
sub_teams           → Nhóm nhỏ nhất trong Team
employee_organizations → Mapping nhân viên ↔ Group/Team/Sub-team
employee_study      → Lộ trình đào tạo của nhân viên
courses             → Danh mục khóa học
training_plans      → Kế hoạch đào tạo
```

### 7.3 Nhóm bảng Vận hành

```
customers           → Khách hàng (company_name, contact_person, status: potential|negotiating|contracted...)
service_lines       → Dòng dịch vụ (service_line_name, rate)
service_line_rates  → Lịch sử đơn giá dịch vụ
contracts           → Hợp đồng (contract_code, value, start_date, end_date, status)
projects            → Dự án (project_code, project_name, progress, status)
project_resource_requests → Yêu cầu nguồn lực cho dự án
project_assignments → Phân bổ nhân viên vào dự án (allocation_percent)
effort_projects     → Ghi nhận effort thực tế theo tháng
```

### 7.4 Nhóm bảng Ngân sách

```
budgets             → Ngân sách theo kỳ (budget_year, total_amount, status)
budget_allocations  → Phân bổ ngân sách theo dự án
```

### 7.5 Quan hệ chính (ERD tóm tắt)

```
roles ──────────────── users ──────────────── employees
                          │                       │
                    user_sessions          employee_organizations
                    login_logs                     │
                    audit_logs            groups ─ teams ─ sub_teams
                                                   │
employees ─────────────────────────── project_assignments
                                               │
customers ── contracts ── projects ────────────┘
                  │            │
           service_lines  project_resource_requests
                  │            │
           service_line_rates  effort_projects
                  │
           budget_allocations ── budgets
```

---

## 8. Data Access Layer — `db.js`

File `db.js` đóng vai trò **Repository Pattern**, tập trung toàn bộ query Supabase:

| Namespace | Bảng liên quan | Chức năng |
|-----------|---------------|-----------|
| `DB.Auth` | users | Lấy thông tin user hiện tại từ localStorage |
| `DB.Employees` | employees, positions, job_levels | CRUD nhân viên |
| `DB.Customers` | customers | CRUD khách hàng |
| `DB.Contracts` | contracts, customers, service_lines | CRUD hợp đồng |
| `DB.Projects` | projects, customers, contracts | CRUD dự án |
| `DB.ServiceLines` | service_lines, service_line_rates | CRUD dòng dịch vụ |
| `DB.Org` | groups, teams, sub_teams | Đọc cơ cấu tổ chức |
| `DB.Meta` | positions, job_levels, roles | Đọc danh mục |
| `DB.Assignments` | project_assignments, project_resource_requests | Phân bổ nhân sự |
| `DB.ResourceRequests` | project_resource_requests | Yêu cầu nguồn lực |
| `DB.Logs` | audit_logs, login_logs | Nhật ký hoạt động |
| `DB.Budgets` | budgets, budget_allocations | Ngân sách |
| `DB.Effort` | effort_projects | Effort thực tế |
| `DB.Storage` | Supabase Storage | Upload file |

**Auto Audit Logging:** Các hàm `create`, `update`, `delete` của Customers, Contracts, Projects, Employees được wrap tự động ghi `audit_logs` sau mỗi thao tác thành công.

---

## 9. Routing & Navigation

`router.js` quản lý 9 route của ứng dụng multi-page:

| Route | File | Auth | Mô tả |
|-------|------|------|-------|
| login | index.html | public | Trang đăng nhập |
| forgot-password | forgot-password.html | public | Quên mật khẩu |
| dashboard | dashboard.html | required | Tổng quan |
| hr | hr.html | required (DH/GM/DM) | Nhân sự |
| operations | operations.html | required | Vận hành |
| budget | budget.html | required | Ngân sách |
| organization | organization.html | required (DH/GM/DM) | Cơ cấu tổ chức |
| activity-log | activity-log.html | required | Nhật ký |
| account | account.html | required | Tài khoản |

**Guard logic:**
- Chưa đăng nhập → redirect về `index.html`
- Đã đăng nhập vào trang login → redirect về `dashboard.html`
- Role không có quyền truy cập trang → redirect về `dashboard.html`

---

## 10. Chiến Lược Dữ Liệu Kép (Dual Data Strategy)

Hệ thống sử dụng song song 2 nguồn dữ liệu:

```
┌─────────────────────────────────────────────────────────────┐
│  Supabase (Production Data)          mock-store.js (Demo)   │
│                                                             │
│  • Dữ liệu thật từ database          • Seed data cứng      │
│  • Gọi qua DB.xxx()                  • Lưu localStorage    │
│  • Cần kết nối internet              • Hoạt động offline   │
│  • Dùng cho production               • Dùng cho demo/dev   │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Các Module Chức Năng

### Module 1: Dashboard
- Biểu đồ doanh thu theo thời gian (Line chart)
- Biểu đồ doanh thu theo dịch vụ (Pie chart)
- Biểu đồ nhân sự theo vị trí/dự án (Bar chart)
- Heatmap workload nhân viên
- Xuất báo cáo tự động (chỉ GM)

### Module 2: Nhân sự (HR)
- Danh sách nhân viên (CRUD)
- Gán nhân viên vào dự án
- Phê duyệt yêu cầu nguồn lực
- Lộ trình phát triển & đào tạo

### Module 3: Vận hành (Operations)
- Quản lý khách hàng (CRUD)
- Quản lý hợp đồng (CRUD, gia hạn)
- Quản lý dự án (CRUD, tiến độ)
- Phân bổ nhân sự vào dự án

### Module 4: Ngân sách (Budget)
- Quản lý dòng dịch vụ & đơn giá
- Ngân sách theo kỳ
- Phân bổ ngân sách theo dự án
- Đồng bộ doanh thu từ dự án

### Module 5: Cơ cấu tổ chức
- Sơ đồ Group → Team → Sub-team
- Thêm/sửa cơ cấu (chỉ GM)

### Module 6: Nhật ký hoạt động
- Audit log (INSERT/UPDATE/DELETE)
- Login log (đăng nhập/đăng xuất)
- Xuất log (chỉ GM)

### Module 7: Tài khoản cá nhân
- Xem thông tin cá nhân
- Đổi mật khẩu
- Quản lý thiết bị đăng nhập

---

## 12. Bảo Mật

| Cơ chế | Mô tả |
|--------|-------|
| **Password hashing** | Mật khẩu lưu dạng hash trong cột `password_hash` |
| **Account lockout** | Khóa tài khoản sau 5 lần nhập sai mật khẩu |
| **Session management** | Session lưu localStorage, hết hạn sau 8 giờ |
| **RBAC** | Phân quyền theo role, ẩn/disable UI element không có quyền |
| **Supabase RLS** | Row Level Security trên PostgreSQL (cấu hình phía Supabase) |
| **Audit trail** | Ghi log tất cả thao tác INSERT/UPDATE/DELETE |

---

## 13. Sơ Đồ Luồng Dữ Liệu Tổng Quát

```
User Action (click nút)
        │
        ▼
Page JS (hr-page.js, operations-page.js...)
        │
        ├── Validate input (global.js → validateForm)
        │
        ▼
DB Layer (db.js → DB.Employees.create / update / delete...)
        │
        ▼
Supabase JS SDK (window.supabaseClient)
        │
        ▼
Supabase REST API (PostgREST)
        │
        ▼
PostgreSQL Database
        │
        ▼ (response)
DB Layer → Auto Audit Log (withAudit wrapper)
        │
        ▼
Page JS → Re-render UI
        │
        ▼
Toast Notification (global.js → showToast)
```

---

*File này được tạo tự động để mô tả kiến trúc hệ thống dự án Bosch HR Management — BGSV Internal Tool.*
