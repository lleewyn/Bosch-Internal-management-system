/** Tiện ích UI dùng chung */
window.UI = {
    escape(s) {
        const d = document.createElement('div');
        d.textContent = s ?? '';
        return d.innerHTML;
    },

    formatVnd(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
        return Number(n).toLocaleString('vi-VN');
    },

    formatNumber(n) {
        return Number(n).toLocaleString('vi-VN');
    },

    workloadBadge(pct) {
        if (pct >= 90) return { cls: 'badge-danger', text: 'QUÁ TẢI' };
        if (pct >= 75) return { cls: 'badge-warning', text: 'CAO' };
        if (pct >= 50) return { cls: 'badge-success', text: 'ỔN ĐỊNH' };
        return { cls: 'badge-info', text: 'THẤP' };
    },

    progressColor(pct) {
        if (pct >= 90) return 'red';
        if (pct >= 75) return 'orange';
        return 'green';
    },

    // Bảng map trạng thái → class badge (dùng chung toàn app)
    // Chuẩn màu lấy từ tab Khách hàng trang Vận hành:
    //   badge-info    = xanh dương  (ĐÃ DEAL HỢP ĐỒNG)
    //   badge-success = xanh lá     (ĐÃ CÓ DỰ ÁN, Đang triển khai, Hoàn thành...)
    //   badge-warning = vàng        (TIỀM NĂNG, Sắp hết hạn, Chờ duyệt...)
    //   badge-danger  = đỏ          (ĐANG ĐÀM PHÁN, Đã hủy, Quá hạn...)
    //   badge-muted   = xám         (trung tính)
    _statusClassMap: {
        // ── Xanh lá — tích cực / đang chạy ──────────────────────────────────
        'Đang hiệu lực':    'badge-success',
        'Có hiệu lực':      'badge-success',
        'Đã tạo':           'badge-info',
        'Đã duyệt':         'badge-success',
        'ĐÃ PHÂN BỔ':       'badge-success',
        'Đã gia hạn':       'badge-success',
        'Hoàn thành':       'badge-success',
        'Hoạt động':        'badge-success',
        'ĐÃ CÓ DỰ ÁN':     'badge-success',
        'Đang tuyển dụng':  'badge-success',
        'Đang mở':          'badge-success',
        'ỔN ĐỊNH':          'badge-success',
        // ── Xanh dương — thông tin / đã deal ─────────────────────────────────
        'Đang triển khai':  'badge-info',
        'ĐÃ DEAL HỢP ĐỒNG': 'badge-info',
        'ĐANG TIẾN HÀNH':   'badge-info',
        'Đang học':         'badge-info',
        'Cần làm rõ':       'badge-info',
        // ── Vàng — cảnh báo nhẹ / chờ xử lý ─────────────────────────────────
        'Chờ duyệt':        'badge-warning',
        'ĐANG CHỜ':         'badge-warning',
        'TIỀM NĂNG':        'badge-warning',
        'Chưa bắt đầu':     'badge-warning',
        'Sắp khai giảng':   'badge-warning',
        'Chờ phê duyệt':    'badge-warning',
        'RẢNH RỖI':         'badge-warning',
        'CAO':              'badge-warning',
        // ── Đỏ — nguy hiểm / cần chú ý ───────────────────────────────────────
        'Sắp hết hạn':      'badge-danger',
        'Tạm dừng':         'badge-danger',
        'ĐANG ĐÀM PHÁN':    'badge-danger',
        'Đã hủy':           'badge-danger',
        'Hết hạn':          'badge-danger',
        'Quá hạn':          'badge-danger',
        'QUÁ TẢI':          'badge-danger',
        'QUÁ MỨC':          'badge-danger',
        'Bị từ chối':       'badge-danger',
        // ── Xám — trung tính / kết thúc ──────────────────────────────────────
        'Trễ tiến độ':      'badge-danger',
        'Chưa phân bổ':     'badge-muted',
        // ── Nhật ký hoạt động ─────────────────────────────────────────────────
        'Đăng nhập':        'badge-info',
        'Bảo mật':          'badge-danger',
        'Nhân sự':          'badge-success',
        'Ngân sách':        'badge-warning',
        'Vận hành':         'badge-info',
        'Dự án':            'badge-success',
        'Tổ chức':          'badge-muted',
        'ĐÃ ĐĂNG XUẤT':     'badge-muted',
        'Chưa':             'badge-muted',
        'Đã kết thúc':      'badge-muted',
    },

    // Tạo badge HTML từ text, tự map class
    badge(text, overrideCls) {
        const cls = overrideCls || this._statusClassMap[text] || 'badge-muted';
        return `<span class="badge ${cls}">${this.escape(text)}</span>`;
    },

    // Giữ lại để tương thích ngược, nhưng giờ dùng class thay inline style
    statusBadge(status, map) {
        if (map && map[status]) {
            // Ưu tiên map nếu có, nhưng dùng class từ _statusClassMap
            const cls = this._statusClassMap[status] || 'badge-muted';
            return `<span class="badge ${cls}">${this.escape(status)}</span>`;
        }
        return this.badge(status);
    },

    openModal(el) {
        if (el) el.style.display = 'flex';
    },

    closeModal(el) {
        if (el) el.style.display = 'none';
    },

    showModalClass(el) {
        if (el) el.classList.add('show');
    },

    hideModalClass(el) {
        if (el) el.classList.remove('show');
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch {
            return null;
        }
    },

    getUserName() {
        const u = this.getUser();
        return u?.full_name || u?.FullName || u?.Username || u?.Email || 'Hệ thống';
    }
};
