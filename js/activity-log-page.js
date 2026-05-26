/**
 * Nhật ký hoạt động — đọc, lọc, thống kê
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.MockStore || !window.PageCommon) return;

    const tbody = document.querySelector('.activity-container table tbody');
    const stats = document.querySelectorAll('.stats-grid .bosch-stat-value');
    const searchInp = document.querySelector('.search-box input');
    const filterRow = document.querySelector('.activity-container .hr-filters');

    let categoryFilter = '';
    let dateFrom = '';
    let dateTo = '';

    const categories = ['', 'Đăng nhập', 'Bảo mật', 'Nhân sự', 'Ngân sách', 'Vận hành', 'Dự án', 'Tổ chức'];

    if (filterRow && !document.getElementById('logCategoryFilter')) {
        const catSel = document.createElement('select');
        catSel.id = 'logCategoryFilter';
        catSel.className = 'hr-select';
        catSel.style.minWidth = '160px';
        catSel.innerHTML = categories
            .map((c) => `<option value="${c}">${c || 'Tất cả loại hành động'}</option>`)
            .join('');

        const dateFromInp = document.createElement('input');
        dateFromInp.type = 'date';
        dateFromInp.id = 'logDateFrom';
        dateFromInp.className = 'hr-select';
        dateFromInp.style.padding = '8px 12px';
        dateFromInp.title = 'Từ ngày';

        const dateToInp = document.createElement('input');
        dateToInp.type = 'date';
        dateToInp.id = 'logDateTo';
        dateToInp.className = 'hr-select';
        dateToInp.style.padding = '8px 12px';
        dateToInp.title = 'Đến ngày';

        const oldFilters = filterRow.querySelectorAll('.hr-select');
        oldFilters.forEach((el) => el.remove());

        filterRow.insertBefore(dateToInp, filterRow.querySelector('.btn-action'));
        filterRow.insertBefore(dateFromInp, dateToInp);
        filterRow.insertBefore(catSel, dateFromInp);

        catSel.addEventListener('change', () => {
            categoryFilter = catSel.value;
            render();
        });
        dateFromInp.addEventListener('change', () => {
            dateFrom = dateFromInp.value;
            render();
        });
        dateToInp.addEventListener('change', () => {
            dateTo = dateToInp.value;
            render();
        });
    }

    function render() {
        const logs = MockStore.getActivityLogs();
        const today = new Date().toISOString().slice(0, 10);
        const todayLogs = logs.filter((l) => l.time.startsWith(today));
        const security = logs.filter((l) => l.category === 'Bảo mật');

        if (stats[0]) stats[0].textContent = UI.formatNumber(todayLogs.length);
        if (stats[1]) stats[1].textContent = String(security.length).padStart(2, '0');
        if (stats[2]) stats[2].textContent = String(new Set(logs.map((l) => l.user)).size);

        const term = (searchInp?.value || '').toLowerCase();
        const filtered = logs.filter((l) => {
            const d = l.time.slice(0, 10);
            const matchSearch =
                !term ||
                l.user.toLowerCase().includes(term) ||
                l.desc.toLowerCase().includes(term) ||
                l.category.toLowerCase().includes(term) ||
                l.id.toLowerCase().includes(term);
            const matchCat = !categoryFilter || l.category === categoryFilter;
            const matchFrom = !dateFrom || d >= dateFrom;
            const matchTo = !dateTo || d <= dateTo;
            return matchSearch && matchCat && matchFrom && matchTo;
        });

        tbody.innerHTML =
            filtered.length === 0
                ? '<tr><td colspan="5" style="text-align:center;padding:32px;color:#888;">Không có bản ghi phù hợp</td></tr>'
                : filtered
                      .map((l) => {
                          const dt = new Date(l.time);
                          const catClass =
                              l.category === 'Bảo mật'
                                  ? 'badge-danger'
                                  : l.category === 'Đăng nhập'
                                    ? 'badge-info'
                                    : 'badge-success';
                          return `
            <tr>
                <td class="time-cell"><span class="date">${dt.toLocaleDateString('vi-VN')}</span>
                <span class="time">${dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span></td>
                <td><strong>${UI.escape(l.user)}</strong></td>
                <td style="text-align:center;"><span class="badge ${catClass}">${UI.escape(l.category)}</span></td>
                <td>${UI.escape(l.desc)}</td>
                <td class="tech-cell">
                    <span><b>IP:</b> ${UI.escape(l.ip)}</span>
                    <span><b>Thiết bị:</b> ${UI.escape(l.device)}</span>
                    <span><b>Vị trí:</b> ${UI.escape(l.location)}</span>
                </td>
            </tr>`;
                      })
                      .join('');
    }

    searchInp?.addEventListener('input', render);

    document.querySelector('.activity-container .btn-action')?.addEventListener('click', () => {
        if (searchInp) searchInp.value = '';
        categoryFilter = '';
        dateFrom = '';
        dateTo = '';
        const cat = document.getElementById('logCategoryFilter');
        const df = document.getElementById('logDateFrom');
        const dt = document.getElementById('logDateTo');
        if (cat) cat.value = '';
        if (df) df.value = '';
        if (dt) dt.value = '';
        render();
        showToast('Đã xóa', 'Bộ lọc đã được đặt lại.');
    });

    render();
});
