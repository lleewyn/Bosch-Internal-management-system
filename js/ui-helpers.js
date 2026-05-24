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

    statusBadge(status, map) {
        const m = map[status] || { bg: '#e8ecf1', color: '#555', label: status };
        return `<span style="background:${m.bg};color:${m.color};padding:6px 12px;border-radius:4px;font-size:10px;font-weight:800;display:inline-block;line-height:1.4;">${this.escape(m.label)}</span>`;
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
