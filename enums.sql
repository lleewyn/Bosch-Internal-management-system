-- ============================================================
-- ENUMS — KienTap Project
-- Chạy file này TRƯỚC khi tạo bảng hoặc chạy seed_data.sql
-- Nếu ENUM đã tồn tại thì bỏ qua (DO NOTHING)
-- ============================================================

-- Xóa ENUM cũ nếu cần reset (bỏ comment nếu muốn chạy lại từ đầu)
-- DROP TYPE IF EXISTS user_status CASCADE;
-- DROP TYPE IF EXISTS employee_status CASCADE;
-- DROP TYPE IF EXISTS gender_type CASCADE;
-- DROP TYPE IF EXISTS contract_status CASCADE;
-- DROP TYPE IF EXISTS renewal_status CASCADE;
-- DROP TYPE IF EXISTS project_status CASCADE;
-- DROP TYPE IF EXISTS project_priority CASCADE;
-- DROP TYPE IF EXISTS customer_status CASCADE;
-- DROP TYPE IF EXISTS service_line_status CASCADE;
-- DROP TYPE IF EXISTS assignment_status CASCADE;
-- DROP TYPE IF EXISTS effort_status CASCADE;
-- DROP TYPE IF EXISTS budget_status CASCADE;
-- DROP TYPE IF EXISTS allocation_status CASCADE;
-- DROP TYPE IF EXISTS resource_request_status CASCADE;
-- DROP TYPE IF EXISTS session_status CASCADE;
-- DROP TYPE IF EXISTS login_result CASCADE;
-- DROP TYPE IF EXISTS password_request_status CASCADE;
-- DROP TYPE IF EXISTS action_type CASCADE;
-- DROP TYPE IF EXISTS training_plan_status CASCADE;
-- DROP TYPE IF EXISTS employee_study_status CASCADE;
-- DROP TYPE IF EXISTS study_priority CASCADE;
-- DROP TYPE IF EXISTS course_status CASCADE;
-- DROP TYPE IF EXISTS report_status CASCADE;
-- DROP TYPE IF EXISTS report_type CASCADE;
-- DROP TYPE IF EXISTS time_range_type CASCADE;
-- DROP TYPE IF EXISTS result_status CASCADE;
-- DROP TYPE IF EXISTS schedule_frequency CASCADE;
-- DROP TYPE IF EXISTS schedule_status CASCADE;
-- DROP TYPE IF EXISTS notification_type CASCADE;
-- DROP TYPE IF EXISTS notification_status CASCADE;
-- DROP TYPE IF EXISTS alert_type CASCADE;
-- DROP TYPE IF EXISTS alert_status CASCADE;
-- DROP TYPE IF EXISTS org_status CASCADE;

-- ============================================================
-- NHÓM 1: USER & AUTH
-- ============================================================

-- Trạng thái tài khoản người dùng
CREATE TYPE user_status AS ENUM (
    'active',       -- Đang hoạt động
    'inactive',     -- Vô hiệu hóa
    'locked'        -- Bị khóa tạm thời
);

-- Kết quả đăng nhập
CREATE TYPE login_result AS ENUM (
    'success',      -- Đăng nhập thành công
    'failed'        -- Đăng nhập thất bại
);

-- Trạng thái phiên làm việc
CREATE TYPE session_status AS ENUM (
    'active',       -- Đang hoạt động
    'expired',      -- Hết hạn
    'logged_out'    -- Đã đăng xuất
);

-- Trạng thái yêu cầu cấp lại mật khẩu
CREATE TYPE password_request_status AS ENUM (
    'pending',      -- Đã gửi, chờ xử lý
    'processing',   -- Đang xử lý
    'resolved',     -- Đã giải quyết
    'rejected'      -- Bị từ chối
);

-- Loại thao tác audit
CREATE TYPE action_type AS ENUM (
    'INSERT',       -- Thêm mới
    'UPDATE',       -- Cập nhật
    'DELETE',       -- Xóa
    'LOGIN',        -- Đăng nhập
    'LOGOUT',       -- Đăng xuất
    'EXPORT'        -- Xuất dữ liệu
);

-- ============================================================
-- NHÓM 2: NHÂN SỰ
-- ============================================================

-- Trạng thái nhân viên
CREATE TYPE employee_status AS ENUM (
    'active',       -- Đang làm việc
    'inactive',     -- Đã nghỉ việc
    'on_leave'      -- Đang nghỉ phép dài hạn
);

-- Giới tính
CREATE TYPE gender_type AS ENUM (
    'male',         -- Nam
    'female',       -- Nữ
    'other'         -- Khác
);

-- Trạng thái tổ chức (group/team/sub_team/employee_org)
CREATE TYPE org_status AS ENUM (
    'active',       -- Đang hoạt động
    'inactive',     -- Ngừng hoạt động
    'dissolved'     -- Đã giải thể
);

-- ============================================================
-- NHÓM 3: ĐÀO TẠO
-- ============================================================

-- Trạng thái khóa học
CREATE TYPE course_status AS ENUM (
    'active',           -- Đang mở
    'upcoming',         -- Sắp khai giảng
    'closed',           -- Đã kết thúc
    'cancelled'         -- Đã hủy
);

-- Trạng thái kế hoạch đào tạo
CREATE TYPE training_plan_status AS ENUM (
    'draft',            -- Bản nháp
    'active',           -- Đang triển khai
    'completed',        -- Đã hoàn thành
    'cancelled'         -- Đã hủy
);

-- Trạng thái học của nhân viên
CREATE TYPE employee_study_status AS ENUM (
    'not_started',      -- Chưa bắt đầu
    'in_progress',      -- Đang học
    'completed',        -- Hoàn thành
    'failed'            -- Không đạt
);

-- Mức độ ưu tiên học
CREATE TYPE study_priority AS ENUM (
    'mandatory',        -- Bắt buộc
    'optional'          -- Tùy chọn
);

-- ============================================================
-- NHÓM 4: VẬN HÀNH (KHÁCH HÀNG, HỢP ĐỒNG, DỰ ÁN)
-- ============================================================

-- Trạng thái khách hàng
CREATE TYPE customer_status AS ENUM (
    'potential',        -- Tiềm năng
    'negotiating',      -- Đang đàm phán
    'contracted',       -- Đã ký hợp đồng
    'active_project',   -- Đang có dự án
    'inactive'          -- Ngừng hợp tác
);

-- Trạng thái hợp đồng
CREATE TYPE contract_status AS ENUM (
    'pending',          -- Chờ ký kết
    'active',           -- Có hiệu lực
    'expiring_soon',    -- Sắp hết hạn (≤60 ngày)
    'expired',          -- Đã hết hạn
    'renewed',          -- Đã gia hạn
    'cancelled'         -- Đã hủy
);

-- Trạng thái gia hạn hợp đồng
CREATE TYPE renewal_status AS ENUM (
    'pending',          -- Đang chờ quyết định
    'renewed',          -- Đã gia hạn
    'extended',         -- Đã mở rộng phạm vi
    'closed'            -- Kết thúc, không gia hạn
);

-- Trạng thái dịch vụ
CREATE TYPE service_line_status AS ENUM (
    'active',           -- Đang cung cấp
    'inactive'          -- Ngừng cung cấp
);

-- Trạng thái dự án
CREATE TYPE project_status AS ENUM (
    'planning',         -- Đang lên kế hoạch
    'in_progress',      -- Đang triển khai
    'on_hold',          -- Tạm dừng
    'delayed',          -- Trễ tiến độ
    'completed',        -- Hoàn thành
    'cancelled'         -- Đã hủy
);

-- Mức độ ưu tiên dự án
CREATE TYPE project_priority AS ENUM (
    'low',              -- Thấp
    'medium',           -- Trung bình
    'high',             -- Cao
    'critical'          -- Khẩn cấp
);

-- Trạng thái yêu cầu nguồn lực
CREATE TYPE resource_request_status AS ENUM (
    'pending',          -- Chờ phê duyệt
    'approved',         -- Đã phê duyệt
    'rejected',         -- Bị từ chối
    'clarification',    -- Cần làm rõ
    'recruiting',       -- Đang tuyển dụng
    'fulfilled'         -- Đã đáp ứng đủ
);

-- Trạng thái phân bổ nhân sự
CREATE TYPE assignment_status AS ENUM (
    'active',           -- Đang tham gia
    'completed',        -- Đã hoàn thành
    'withdrawn'         -- Đã rút khỏi dự án
);

-- Trạng thái effort
CREATE TYPE effort_status AS ENUM (
    'draft',            -- Bản nháp
    'submitted',        -- Đã nộp
    'confirmed',        -- Đã xác nhận
    'rejected'          -- Bị từ chối
);

-- ============================================================
-- NHÓM 5: NGÂN SÁCH
-- ============================================================

-- Trạng thái ngân sách kỳ
CREATE TYPE budget_status AS ENUM (
    'draft',            -- Bản nháp
    'active',           -- Đang áp dụng
    'closed',           -- Đã đóng kỳ
    'cancelled'         -- Đã hủy
);

-- Trạng thái phân bổ ngân sách
CREATE TYPE allocation_status AS ENUM (
    'active',           -- Đang phân bổ
    'closed',           -- Đã quyết toán
    'cancelled'         -- Đã hủy
);

-- ============================================================
-- NHÓM 6: BÁO CÁO
-- ============================================================

-- Trạng thái yêu cầu báo cáo
CREATE TYPE report_status AS ENUM (
    'pending',          -- Chờ xử lý
    'processing',       -- Đang tạo
    'completed',        -- Hoàn thành
    'failed'            -- Lỗi
);

-- Loại báo cáo
CREATE TYPE report_type AS ENUM (
    'hr',               -- Nhân sự
    'operations',       -- Vận hành
    'budget',           -- Ngân sách
    'project',          -- Dự án
    'training'          -- Đào tạo
);

-- Khoảng thời gian báo cáo
CREATE TYPE time_range_type AS ENUM (
    'monthly',          -- Theo tháng
    'quarterly',        -- Theo quý
    'yearly',           -- Theo năm
    'custom'            -- Tùy chỉnh
);

-- Trạng thái kết quả báo cáo
CREATE TYPE result_status AS ENUM (
    'ready',            -- Sẵn sàng tải
    'archived',         -- Đã lưu trữ
    'failed'            -- Lỗi tạo file
);

-- Chu kỳ gửi báo cáo tự động
CREATE TYPE schedule_frequency AS ENUM (
    'daily',            -- Hàng ngày
    'weekly',           -- Hàng tuần
    'monthly',          -- Hàng tháng
    'quarterly'         -- Hàng quý
);

-- Trạng thái lịch gửi báo cáo
CREATE TYPE schedule_status AS ENUM (
    'active',           -- Đang kích hoạt
    'paused',           -- Tạm dừng
    'cancelled'         -- Đã hủy
);

-- ============================================================
-- NHÓM 7: THÔNG BÁO & CẢNH BÁO
-- ============================================================

-- Loại thông báo
CREATE TYPE notification_type AS ENUM (
    'info',             -- Thông tin
    'warning',          -- Cảnh báo
    'alert',            -- Khẩn cấp
    'success'           -- Thành công
);

-- Trạng thái thông báo
CREATE TYPE notification_status AS ENUM (
    'active',           -- Đang hiển thị
    'dismissed',        -- Đã bỏ qua
    'archived'          -- Đã lưu trữ
);

-- Loại cảnh báo tự động
CREATE TYPE alert_type AS ENUM (
    'contract_expiry',      -- Hợp đồng sắp hết hạn
    'project_delay',        -- Dự án trễ tiến độ
    'budget_overrun',       -- Vượt ngân sách
    'employee_unassigned',  -- Nhân viên chưa có dự án
    'login_failure',        -- Đăng nhập thất bại nhiều lần
    'training_overdue'      -- Khóa học quá hạn
);

-- Trạng thái cấu hình cảnh báo
CREATE TYPE alert_status AS ENUM (
    'active',           -- Đang kích hoạt
    'inactive'          -- Đã tắt
);

-- ============================================================
-- KIỂM TRA — Liệt kê tất cả ENUM vừa tạo
-- ============================================================
SELECT n.nspname AS schema, t.typname AS enum_name,
       string_agg(e.enumlabel, ' | ' ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY n.nspname, t.typname
ORDER BY t.typname;
