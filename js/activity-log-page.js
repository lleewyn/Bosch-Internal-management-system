/**
 * Nhật ký hoạt động — đọc từ Supabase (audit_logs + login_logs)
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.PageCommon) return;

    const tbody    = document.querySelector('.activity-container table tbody');
    const stats    = document.querySelectorAll('.stats-grid .bosch-stat-value');
    const searchInp = document.querySelector('.search-box input');
    const filterRow = document.querySelector('.activity-container .hr-filters');

    let allLogs = [];
    let categoryFilter = '';
    let dateFrom = '';
    let dateTo   = '';

    // ── Thêm filter controls ──────────────────────────────────────────────────
    const categories = ['', 'Đăng nhập', 'Bảo mật', 'Nhân sự', 'Ngân sách', 'Vận hành', 'Dự án', 'Tổ chức'];

    if (filterRow && !document.getElementById('logCategoryFilter')) {
        const catSel = document.createElement('select');
        catSel.id = 'logCategoryFilter';
        catSel.className = 'hr-select';
        catSel.style.minWidth = '160px';
        catSel.innerHTML = categories.map(c => `<option value="${c}">${c || 'Tất cả loại hành động'}</option>`).join('');

        const dateFromInp = document.createElement('input');
        dateFromInp.type = 'date'; dateFromInp.id = 'logDateFrom';
        dateFromInp.className = 'hr-select'; dateFromInp.style.padding = '8px 12px';
        dateFromInp.title = 'Từ ngày';
        dateFromInp.value = ''; // không set giá trị mặc định

        const dateToInp = document.createElement('input');
        dateToInp.type = 'date'; dateToInp.id = 'logDateTo';
        dateToInp.className = 'hr-select'; dateToInp.style.padding = '8px 12px';
        dateToInp.title = 'Đến ngày';
        dateToInp.value = ''; // không set giá trị mặc định

        filterRow.querySelectorAll('.hr-select').forEach(el => el.remove());
        const clearBtn = filterRow.querySelector('.btn-action');
        filterRow.insertBefore(dateToInp,   clearBtn);
        filterRow.insertBefore(dateFromInp, dateToInp);
        filterRow.insertBefore(catSel,      dateFromInp);

        catSel.addEventListener('change',      () => { categoryFilter = catSel.value;      render(); });
        dateFromInp.addEventListener('change', () => { dateFrom = dateFromInp.value;        render(); });
        dateToInp.addEventListener('change',   () => { dateTo   = dateToInp.value;          render(); });
    }

    // ── Load data từ Supabase ─────────────────────────────────────────────────
    async function loadLogs() {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#888;">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>Đang tải nhật ký...</td></tr>`;

        const [auditRes, loginRes] = await Promise.all([
            DB.Logs.getAuditLogs(300),
            DB.Logs.getLoginLogs(100)
        ]);

        allLogs = [];

        // Map audit_logs
        if (auditRes.data) {
            auditRes.data.forEach(l => {
                allLogs.push({
                    id:       l.audit_id,
                    time:     l.action_time || l.created_at,
                    user:     l.users?.username || l.users?.company_email || 'Hệ thống',
                    category: mapActionCategory(l.action_type, l.table_name),
                    desc:     buildAuditDesc(l),
                    ip:       '—',
                    device:   '—',
                    location: '—'
                });
            });
        }

        // Map login_logs
        if (loginRes.data) {
            loginRes.data.forEach(l => {
                allLogs.push({
                    id:       l.login_logs_id,
                    time:     l.login_time || l.created_at,
                    user:     l.users?.username || l.users?.company_email || 'Unknown',
                    category: l.result_login === false ? 'Bảo mật' : 'Đăng nhập',
                    desc:     l.result_login === false
                        ? `Đăng nhập thất bại: ${l.failure_reason || 'Sai thông tin'}`
                        : 'Đăng nhập thành công',
                    ip:       l.ip_address || '—',
                    device:   l.device     || '—',
                    location: l.location   || '—'
                });
            });
        }

        // Sắp xếp mới nhất lên đầu
        allLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

        render();
    }

    function mapActionCategory(actionType, tableName) {
        if (!actionType) return 'Hệ thống';
        const t = (tableName || '').toLowerCase();
        if (t.includes('employee') || t.includes('position') || t.includes('job_level')) return 'Nhân sự';
        if (t.includes('project') || t.includes('contract') || t.includes('customer')) return 'Vận hành';
        if (t.includes('budget') || t.includes('service_line') || t.includes('effort')) return 'Ngân sách';
        if (t.includes('group') || t.includes('team') || t.includes('org')) return 'Tổ chức';
        if (t.includes('user') || t.includes('role') || t.includes('permission')) return 'Bảo mật';
        if (t.includes('training') || t.includes('course')) return 'Đào tạo';
        return 'Hệ thống';
    }

    function buildAuditDesc(l) {
        const action = l.action_type || 'Thao tác';
        const table  = l.table_name  || '';
        const record = l.record_id   ? ` #${String(l.record_id).slice(0,8)}` : '';
        return `${action} trên ${table}${record}`;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    function esc(v) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function render() {
        const today = new Date().toISOString().slice(0, 10);
        const todayLogs    = allLogs.filter(l => (l.time||'').startsWith(today));
        const securityLogs = allLogs.filter(l => l.category === 'Bảo mật');
        const activeSessions = new Set(allLogs.map(l => l.user)).size;

        if (stats[0]) stats[0].textContent = todayLogs.length.toLocaleString('vi-VN');
        if (stats[1]) stats[1].textContent = securityLogs.length.toLocaleString('vi-VN');
        if (stats[2]) stats[2].textContent = activeSessions.toLocaleString('vi-VN');

        const term = (searchInp?.value || '').toLowerCase();
        const filtered = allLogs.filter(l => {
            const d = (l.time || '').slice(0, 10);
            const matchSearch = !term || (l.user||'').toLowerCase().includes(term) || (l.desc||'').toLowerCase().includes(term) || (l.category||'').toLowerCase().includes(term);
            const matchCat  = !categoryFilter || l.category === categoryFilter;
            const matchFrom = !dateFrom || d >= dateFrom;
            const matchTo   = !dateTo   || d <= dateTo;
            return matchSearch && matchCat && matchFrom && matchTo;
        });

        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#888;">Không có bản ghi phù hợp</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(l => {
            const dt = new Date(l.time);
            const catBadge = window.UI?.badge ? UI.badge(l.category) : `<span class="badge">${esc(l.category)}</span>`;
            return `<tr>
                <td class="time-cell">
                    <span class="date">${dt.toLocaleDateString('vi-VN')}</span>
                    <span class="time">${dt.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})}</span>
                </td>
                <td><strong>${esc(l.user)}</strong></td>
                <td style="text-align:center;">${catBadge}</td>
                <td>${esc(l.desc)}</td>
                <td class="tech-info">
                    <span><b>IP:</b> ${esc(l.ip)}</span>
                    <span><b>Thiết bị:</b> ${esc(l.device)}</span>
                    <span><b>Vị trí:</b> ${esc(l.location)}</span>
                </td>
            </tr>`;
        }).join('');
    }

    // ── Events ────────────────────────────────────────────────────────────────
    searchInp?.addEventListener('input', render);

    document.querySelector('.activity-container .btn-action')?.addEventListener('click', () => {
        if (searchInp) searchInp.value = '';
        categoryFilter = ''; dateFrom = ''; dateTo = '';
        const cat = document.getElementById('logCategoryFilter');
        const df  = document.getElementById('logDateFrom');
        const dt  = document.getElementById('logDateTo');
        if (cat) cat.value = '';
        if (df)  df.value  = '';
        if (dt)  dt.value  = '';
        render();
        if (window.showToast) showToast('Đã xóa', 'Bộ lọc đã được đặt lại.');
    });

    // ── Khởi động ─────────────────────────────────────────────────────────────
    await loadLogs();
});
