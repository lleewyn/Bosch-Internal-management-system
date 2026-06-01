/**
 * Vận hành — Khách hàng, Hợp đồng, Dự án (Supabase)
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.PageCommon) return;
    PageCommon.injectFormStyles();

    const views = {
        customers: document.getElementById('customersView'),
        contracts: document.getElementById('contractsView'),
        projects:  document.getElementById('projectsView')
    };
    const tables = {
        customers: document.getElementById('customersTable'),
        contracts: document.getElementById('contractsTable'),
        projects:  document.getElementById('projectsTable')
    };
    const $ = (id) => document.getElementById(id);

    let activeTab = 'customers';
    const selected = { customers: null, contracts: null, projects: null };
    let _customers = [], _contracts = [], _projects = [], _serviceLines = [], _employees = [];

    // ── Load data ─────────────────────────────────────────────────────────────
    async function loadAll() {
        showLoading(true);
        const [custRes, contRes, projRes, slRes, empRes] = await Promise.all([
            DB.Customers.getAll(),
            DB.Contracts.getAll(),
            DB.Projects.getAll(),
            DB.ServiceLines.getAll(),
            DB.Employees.getAll()
        ]);
        if (custRes.data)  _customers    = custRes.data;
        if (contRes.data)  _contracts    = contRes.data;
        if (projRes.data)  _projects     = projRes.data;
        if (slRes.data)    _serviceLines = slRes.data;
        if (empRes.data) {
            _employees = empRes.data.map(emp => {
                // Lấy org active mới nhất
                const activeOrg = (emp.employee_organizations || []).find(o => o.status === 'active')
                               || (emp.employee_organizations || [])[0];
                const teamName = activeOrg?.teams?.team_name
                              || activeOrg?.sub_teams?.sub_team_name
                              || '—';
                return {
                    id:       emp.employee_id,
                    code:     emp.employee_code,
                    name:     emp.full_name,
                    title:    emp.positions?.position_name || '—',
                    team:     teamName,
                    workload: null  // sẽ tính sau khi load assignments
                };
            });
        }

        // Tính workload từ assignments sau khi đã load
        const workloadMap = {};
        _allAssignments.forEach(a => {
            const empId = a.employee_id;
            const pct   = parseFloat(a.allocation_percent) || 0;
            workloadMap[empId] = Math.min((workloadMap[empId] || 0) + pct, 100);
        });
        _employees.forEach(e => { e.workload = Math.round(workloadMap[e.id] || 0); });
        loadEffortData(); // sync, không cần await vì dùng _allAssignments đã có

        if (custRes.error) console.error('[OP] customers:', custRes.error);
        if (contRes.error) console.error('[OP] contracts:', contRes.error);
        if (projRes.error) console.error('[OP] projects:',  projRes.error);

        showLoading(false);
        renderActive();
    }

    function showLoading(on) {
        Object.values(tables).forEach(t => {
            const tbody = t?.querySelector('tbody');
            if (!tbody) return;
            if (on) tbody.innerHTML = `<tr><td colspan="20" style="text-align:center;padding:32px;color:#888;">
                <i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>Đang tải dữ liệu...</td></tr>`;
        });
    }

    // ── Tab switching ─────────────────────────────────────────────────────────
    PageCommon.bindTabs('.bosch-tab', views, (tab) => {
        activeTab = tab;
        renderActive();
    });

    function renderActive() {
        if (activeTab === 'customers') renderCustomers();
        else if (activeTab === 'contracts') renderContracts();
        else if (activeTab === 'projects') renderProjects();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc(v) {
        return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function parseDateOnly(value) {
        if (!value) return null;
        const parts = String(value).slice(0,10).split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function statusBadge(status) {
        const key = String(status || '').toLowerCase();
        const localMap = {
            active_project: ['badge-success','Có dự án'],
            active:         ['badge-info',   'Hoạt động'],
            potential:      ['badge-warning','Tiềm năng'],
            suspended:      ['badge-danger', 'Tạm dừng'],
            terminated:     ['badge-muted',  'Kết thúc'],
            high:           ['badge-danger', 'Cao'],
            medium:         ['badge-warning','Trung bình'],
            low:            ['badge-info',   'Thấp'],
        };
        
        if (localMap[key]) {
            const [cls, label] = localMap[key];
            return `<span class="badge ${cls}">${label}</span>`;
        }

        if (window.UI?.badge) return UI.badge(status);
        
        return `<span class="badge badge-muted">${status || '—'}</span>`;
    }

    function fmtDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('vi-VN');
    }

    function fmtMoney(v) {
        if (!v) return '—';
        return Number(v).toLocaleString('vi-VN') + ' VND';
    }

    function progressBar(pct) {
        const v = Math.min(100, Math.max(0, pct || 0));
        const color = v >= 80 ? '#16a34a' : v < 30 ? '#d97706' : '#2563eb';
        return `<div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:#e5e7eb;border-radius:4px;height:8px;min-width:60px;">
                <div style="width:${v}%;background:${color};height:8px;border-radius:4px;"></div>
            </div>
            <span style="font-size:11px;font-weight:700;color:#374151;">${v}%</span>
        </div>`;
    }

    // Tính trạng thái dự án từ ngày và tiến độ (DB không có cột status)
    function computeProjectStatus(p) {
        const today = new Date(); today.setHours(0,0,0,0);
        function parseDate(str) {
            if (!str) return null;
            const [y,m,d] = String(str).slice(0,10).split('-').map(Number);
            return new Date(y, m-1, d);
        }
        const end  = parseDate(p.end_date);
        const pct  = Number(p.progress_percent) || 0;

        if (pct >= 100) return 'Hoàn thành';
        if (!end) return 'Đang triển khai';
        if (today > end) return 'Trễ tiến độ';
        const daysLeft = Math.ceil((end - today) / 86400000);
        if (daysLeft <= 30) return 'Sắp hết hạn';

        // Kiểm tra chưa phân bổ nhân sự
        const hasStaff = getAssignmentsByProject(p.project_id).length > 0;

        return 'Đang triển khai';
    }
    function computeContractStatus(c) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Parse date string YYYY-MM-DD tránh lỗi timezone
        function parseDate(str) {
            if (!str) return null;
            const s = String(str).slice(0, 10);
            const [y, m, d] = s.split('-').map(Number);
            if (!y || !m || !d) return null;
            return new Date(y, m - 1, d); // local time, không bị lệch timezone
        }

        const start = parseDate(c.start_date);
        const end   = parseDate(c.end_date);

        if (!end) return 'Chưa xác định';
        if (today > end) return 'Hết hạn';

        const daysLeft = Math.ceil((end - today) / 86400000);
        if (daysLeft <= 60)  return 'Sắp hết hạn';  // ≤ 60 ngày
        if (start && today < start) return 'Chưa hiệu lực';
        return 'Có hiệu lực';
    }

    // Cache assignments theo project_id
    let _allAssignments = [];

    async function loadAllAssignments() {
        const res = await DB.Assignments.getAll();
        _allAssignments = res.data || [];
    }

    function getAssignmentsByProject(projectId) {
        // Cần biết request_id → project_id mapping
        // Dùng cache _allAssignments đã load
        return _allAssignments.filter(a => {
            // project_resource_requests đã được join
            return a.project_resource_requests?.project_id === projectId;
        });
    }

    function staffChips(projectId) {
        const assignments = getAssignmentsByProject(projectId);
        if (!assignments.length) {
            return `<span style="color:#9ca3af;font-size:12px;font-style:italic;">Chưa phân bổ</span>`;
        }
        return assignments.slice(0, 3).map(a =>
            `<span style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;
                border:1px solid #bfdbfe;border-radius:20px;padding:3px 8px;
                font-size:11px;font-weight:600;color:#1d4ed8;margin:2px;">
                ${esc(a.employees?.full_name || '—')}
                <span style="color:#9ca3af;font-size:10px;">${a.allocation_percent}%</span>
            </span>`
        ).join('') + (assignments.length > 3 ? `<span style="font-size:11px;color:#9ca3af;margin:2px;">+${assignments.length-3}</span>` : '');
    }

    // ── Phân công nhân sự (Supabase) ─────────────────────────────────────────
    let _currentProjectAssignments = [];
    let _effortByEmployee = {}; // { employee_id: total_percent }

    function loadEffortData() {
        // Tính từ _allAssignments đã có sẵn — không cần query thêm
        _effortByEmployee = {};
        _allAssignments.forEach(a => {
            const empId = a.employee_id;
            if (!empId) return;
            _effortByEmployee[empId] = (_effortByEmployee[empId] || 0) + Number(a.allocation_percent || 0);
        });
        console.log('[OP] effort map:', _effortByEmployee);
    }

    async function loadProjectAssignments(projectId) {
        if (!projectId) { _currentProjectAssignments = []; return; }
        const res = await DB.Assignments.getByProject(projectId);
        _currentProjectAssignments = res.data || [];
    }

    function renderProjectAssignmentSummary(projectId) {
        const container = document.getElementById('opProjStaffList');
        if (!container) return;
        if (!_currentProjectAssignments.length) {
            container.innerHTML = `<span style="color:#9ca3af;font-size:13px;font-style:italic;">Chưa phân công nhân sự...</span>`;
            return;
        }
        container.innerHTML = _currentProjectAssignments.map(a =>
            `<span style="padding:4px 10px;border-radius:999px;background:#EFF6FF;color:#1D4ED8;font-size:12px;">
                ${esc(a.employees?.full_name || '—')} <span style="color:#9ca3af;">${a.allocation_percent}%</span>
            </span>`
        ).join('');
    }

    async function openStaffAssignModal() {
        const projectModal = document.getElementById('projectModal');
        if (!projectModal) return;
        let projectId = projectModal.dataset.projectId || '';

        // Nếu chưa có projectId (đang tạo mới), tự động lưu dự án trước
        if (!projectId) {
            showToast('Thông báo', 'Đang lưu dự án trước khi phân công...', 'info');
            projectId = await saveProject(false);
            if (!projectId) return; // lưu thất bại, dừng lại
        }

        // Lưu projectId vào staffAssignModal để saveStaffAssignments dùng độc lập
        const staffModal = document.getElementById('staffAssignModal');
        if (staffModal) staffModal.dataset.projectId = projectId;

        const tbody = document.getElementById('staffAssignTableBody');
        if (!tbody) return;

        // Load assignments hiện tại
        await loadProjectAssignments(projectId);
        const assignedIds = new Set(_currentProjectAssignments.map(a => a.employee_id));

        tbody.innerHTML = _employees.map(emp => {
            const checked = assignedIds.has(emp.id) ? 'checked' : '';
            const existing = _currentProjectAssignments.find(a => a.employee_id === emp.id);
            const percent = existing?.allocation_percent || 100;

            // Khối lượng hiện tại từ effort_projects
            const currentLoad = _effortByEmployee[emp.id] || 0;
            let loadBadge;
            if (currentLoad === 0)       loadBadge = `<span style="color:#9ca3af;font-size:12px;">0%</span>`;
            else if (currentLoad > 100)  loadBadge = `<span style="color:#dc2626;font-weight:700;font-size:12px;">${currentLoad}% ⚠️</span>`;
            else if (currentLoad > 80)   loadBadge = `<span style="color:#f59e0b;font-weight:700;font-size:12px;">${currentLoad}%</span>`;
            else                         loadBadge = `<span style="color:#10b981;font-weight:700;font-size:12px;">${currentLoad}%</span>`;

            return `<tr data-id="${emp.id}" style="cursor:pointer;">
                <td style="padding:12px 16px;text-align:center;">
                    <input type="checkbox" class="staff-assign-checkbox" data-id="${emp.id}" ${checked}>
                </td>
                <td style="padding:12px 16px;">
                    <div style="font-weight:700;">${esc(emp.code)} — ${esc(emp.name)}</div>
                </td>
                <td style="padding:12px 16px;">${esc(emp.title)}</td>
                <td style="padding:12px 16px;">${esc(emp.team)}</td>
                <td style="padding:12px 16px;text-align:center;">${loadBadge}</td>
                <td style="padding:12px 16px;text-align:center;">
                    <input type="number" min="0" max="100" class="staff-assign-percent" data-id="${emp.id}"
                        value="${percent}" style="width:64px;padding:4px 6px;border:1px solid #d1d5db;border-radius:6px;text-align:center;">
                </td>
            </tr>`;
        }).join('');

        if (!_employees.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#888;">Chưa có dữ liệu nhân sự</td></tr>`;
        }

        updateStaffAssignCount();
        document.getElementById('staffAssignSearch').value = '';
        document.getElementById('staffAssignModal')?.classList.add('show');
    }

    function updateStaffAssignCount() {
        const countEl = document.getElementById('staffAssignCount');
        if (!countEl) return;
        const checked = document.querySelectorAll('#staffAssignTableBody .staff-assign-checkbox:checked').length;
        countEl.textContent = `Đã chọn: ${checked} nhân viên`;
    }

    function filterStaffAssignRows() {
        const term = (document.getElementById('staffAssignSearch')?.value || '').toLowerCase();
        document.querySelectorAll('#staffAssignTableBody tr').forEach(tr => {
            tr.style.display = !term || tr.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    }

    async function saveStaffAssignments() {
        const staffModal = document.getElementById('staffAssignModal');
        const projectModal = document.getElementById('projectModal');
        // Ưu tiên lấy từ staffAssignModal.dataset (được set khi mở), fallback về projectModal
        const projectId = staffModal?.dataset.projectId || projectModal?.dataset.projectId || '';
        if (!projectId) return showToast('Lỗi', 'Vui lòng lưu dự án trước khi phân công nhân sự.', 'error');

        // Lấy danh sách được chọn
        const rows = Array.from(document.querySelectorAll('#staffAssignTableBody tr'));
        const selected = rows.filter(tr => tr.querySelector('.staff-assign-checkbox')?.checked);

        if (!selected.length) return showToast('Lỗi', 'Vui lòng chọn ít nhất 1 nhân viên.', 'error');

        // Cần có project_resource_request_id — tạo 1 request chung nếu chưa có
        let requestId = null;
        const reqRes = await DB.ResourceRequests.getByProject(projectId);
        if (reqRes.data && reqRes.data.length > 0) {
            requestId = reqRes.data[0].project_resource_request_id;
        } else {
            // Tạo request mới
            const newReq = await DB.ResourceRequests.create({
                project_id:  projectId,
                position_id: _positions[0]?.position_id || null,
                quantity:    selected.length,
                is_ot:       false,
                description: 'Phân công từ giao diện'
            });
            if (newReq.error) return showToast('Lỗi', newReq.error.message, 'error');
            requestId = newReq.data.project_resource_request_id;
        }

        // Xóa assignments cũ của request này
        await DB.Assignments.deleteByProject(projectId);

        // Insert assignments mới
        const inserts = selected.map(tr => {
            const empId  = tr.dataset.id;
            const pct    = Number(tr.querySelector('.staff-assign-percent')?.value) || 100;
            return {
                project_resource_request_id: requestId,
                employee_id:       empId,
                allocation_percent: pct,
                sub_team_id:       null
            };
        });

        let hasError = false;
        for (const payload of inserts) {
            const r = await DB.Assignments.create(payload);
            if (r.error) { hasError = true; console.error('[OP] assign:', r.error); }
        }

        if (hasError) return showToast('Lỗi', 'Một số nhân sự không thể phân công.', 'error');

        showToast('Thành công', `Đã phân công ${inserts.length} nhân sự.`);
        await loadProjectAssignments(projectId);
        await loadAllAssignments(); // cập nhật cache
        loadEffortData();           // tính lại workload
        renderProjectAssignmentSummary(projectId);
        closeModal('staffAssignModal');
    }

    function bindStaffAssignEvents() {
        document.querySelector('#staffAssignTableBody')?.addEventListener('change', e => {
            if (e.target.matches('.staff-assign-checkbox') || e.target.matches('.staff-assign-percent')) {
                updateStaffAssignCount();
            }
        });
    }
    bindStaffAssignEvents();

    function bindRowToggle(tbody, view) {
        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selected[view] === id) {
                    selected[view] = null;
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                } else {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    tr.classList.add('selected-row');
                    selected[view] = id;
                }
                updateBadge(view);
            });
        });
    }

    function updateBadge(view) {
        const ids = {
            customers: 'customerSelectionBadge',
            contracts: 'contractSelectionBadge',
            projects:  'projectSelectionBadge'
        };
        const el = $(ids[view]);
        if (!el) return;
        if (selected[view]) {
            let label = selected[view];
            if (view === 'customers') label = _customers.find(x => x.customer_id === selected[view])?.company_name || label;
            if (view === 'contracts') label = _contracts.find(x => x.contract_id === selected[view])?.contract_code || label;
            if (view === 'projects')  label = _projects.find(x => x.project_id  === selected[view])?.project_name  || label;
            el.textContent = `Đang chọn: ${label}`;
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }

    // ── Render Customers ──────────────────────────────────────────────────────
    function renderCustomers() {
        const tbody = tables.customers?.querySelector('tbody');
        if (!tbody) return;
        if (_customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#888;">Chưa có dữ liệu khách hàng</td></tr>`;
            return;
        }
        tbody.innerHTML = _customers.map((c, i) => `
            <tr data-id="${c.customer_id}" style="background:${i%2?'#f8f9fa':'white'};cursor:pointer;" class="${selected.customers===c.customer_id?'selected-row':''}">
                <td style="color:#0056b3;font-weight:800;padding:16px;text-align:center;" title="${esc(c.customer_id)}">KH-${esc((c.customer_id || '').slice(-6).toUpperCase())}</td>
                <td style="font-weight:700;padding:16px;">${esc(c.company_name)}</td>
                <td style="padding:16px;">${esc(c.contact_person)}</td>
                <td style="padding:16px;">${esc(c.contact_email)}</td>
                <td style="padding:16px;text-align:center;">${esc(c.phone)}</td>
                <td style="padding:16px;text-align:center;">${esc(c.country)}</td>
                <td style="padding:16px;text-align:center;">${statusBadge(c.status)}</td>
            </tr>`).join('');
        bindRowToggle(tbody, 'customers');
        applyFilter('customers');
    }

    // ── Render Contracts ──────────────────────────────────────────────────────
    function renderContracts() {
        const tbody = tables.contracts?.querySelector('tbody');
        if (!tbody) return;
        if (_contracts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;padding:32px;color:#888;">Chưa có dữ liệu hợp đồng</td></tr>`;
            return;
        }

        const sortValue = $('sortContracts')?.value || '';
        const contracts = _contracts.slice();
        if (sortValue === 'value-asc') {
            contracts.sort((a, b) => (Number(a.contract_value) || 0) - (Number(b.contract_value) || 0));
        } else if (sortValue === 'value-desc') {
            contracts.sort((a, b) => (Number(b.contract_value) || 0) - (Number(a.contract_value) || 0));
        }

        tbody.innerHTML = contracts.map(c => {
            const status = computeContractStatus(c);
            const alertCls = ['Sắp hết hạn','Hết hạn'].includes(status) ? ' row-alert' : '';
            const cust = c.customers || {};
            const sl   = c.service_lines || {};
            return `<tr data-id="${c.contract_id}" style="cursor:pointer;" class="${selected.contracts===c.contract_id?'selected-row':''}${alertCls}">
                <td class="code-col">${esc(c.contract_code)}</td>
                <td>${esc(cust.company_name)}</td>
                <td>${esc(cust.contact_person)}</td>
                <td>${esc(cust.contact_email)}</td>
                <td style="text-align:center;">${esc(cust.phone)}</td>
                <td>${esc(sl.service_line_name)}</td>
                <td style="text-align:center;font-weight:700;color:#059669;">${fmtMoney(c.contract_value)}</td>
                <td style="text-align:center;">${fmtDate(c.start_date)}</td>
                <td style="text-align:center;">${fmtDate(c.end_date)}</td>
                <td style="text-align:center;">${c.project_code ? esc(c.project_code) : '—'}</td>
                <td style="text-align:center;">${c.is_ot ? '<span class="badge badge-info">Có OT</span>' : '<span class="badge badge-muted">Không OT</span>'}</td>
                <td style="text-align:center;">${c.file_url ? '<i class="fa-solid fa-file-pdf" style="color:#dc2626;"></i>' : '—'}</td>
                <td style="text-align:center;">${statusBadge(status)}</td>
                <td style="text-align:center;">${c.file_url
                    ? `<a href="${esc(c.file_url)}" target="_blank" style="color:#0078d4;font-size:12px;font-weight:700;"><i class="fa-solid fa-eye"></i></a>`
                    : '—'}</td>
            </tr>`;
        }).join('');
        bindRowToggle(tbody, 'contracts');
        applyFilter('contracts');
    }

    // ── Render Projects ───────────────────────────────────────────────────────
    function renderProjects() {
        const tbody = tables.projects?.querySelector('tbody');
        if (!tbody) return;
        if (_projects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:32px;color:#888;">Chưa có dữ liệu dự án</td></tr>`;
            return;
        }

        // Populate filter dropdowns
        const companies = [...new Set(_projects.map(p => p.customers?.company_name).filter(Boolean))];
        const services  = [...new Set(_projects.map(p => p.contracts?.service_lines?.service_line_name).filter(Boolean))];
        const compSel = $('filterProjectCompany');
        const svcSel  = $('filterProjectService');
        if (compSel && compSel.options.length <= 1) {
            companies.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; compSel.appendChild(o); });
        }
        if (svcSel && svcSel.options.length <= 1) {
            services.forEach(s => { const o = document.createElement('option'); o.value=s; o.textContent=s; svcSel.appendChild(o); });
        }

        tbody.innerHTML = _projects.map(p => {
            const cust   = p.customers || {};
            const slName = p.contracts?.service_lines?.service_line_name || '—';
            const pct    = Number(p.progress_percent) || 0;
            const status = computeProjectStatus(p);
            const isLate = status === 'Trễ tiến độ';
            return `<tr data-id="${p.project_id}" style="cursor:pointer;${isLate?'background:#fff5f5 !important;':''}" class="${selected.projects===p.project_id?'selected-row':''}">
                <td style="padding:12px 16px;">
                    <div style="font-size:11px;color:#6b7280;font-weight:600;">${esc(p.project_code)}</div>
                    <div style="font-weight:700;color:#111827;font-size:13px;">${esc(p.project_name)}</div>
                </td>
                <td style="padding:12px 16px;font-weight:600;">${esc(cust.company_name)}</td>
                <td style="padding:12px 16px;font-size:12px;color:#6b7280;">${esc(cust.contact_person)}</td>
                <td style="padding:12px 16px;font-size:12px;">${staffChips(p.project_id)}</td>
                <td style="padding:12px 16px;font-size:12px;">${esc(slName)}</td>
                <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#059669;">${fmtMoney(p.budget)}</td>
                <td style="padding:12px 16px;font-size:12px;">${fmtDate(p.start_date)}</td>
                <td style="padding:12px 16px;font-size:12px;${isLate?'color:#dc2626;font-weight:700;':''}">${fmtDate(p.end_date)}</td>
                <td style="padding:12px 16px;">${progressBar(pct)}</td>
                <td style="padding:12px 16px;text-align:center;">${statusBadge(status)}</td>
                <td style="padding:12px 16px;font-size:12px;color:#6b7280;">${esc(p.description || '—')}</td>
            </tr>`;
        }).join('');

        bindRowToggle(tbody, 'projects');
        applyFilter('projects');
    }

    // ── Filter logic ──────────────────────────────────────────────────────────
    function applyFilter(view) {
        const v = views[view];
        if (!v) return;
        const term = (v.querySelector('.search-box input')?.value || '').toLowerCase();

        if (view === 'customers') {
            const countryFilter = $('filterCustomerCountry')?.value || '';
            const statusFilter  = $('filterCustomerStatus')?.value  || '';
            const filtered = _customers.filter(c => {
                const matchSearch  = !term          || (c.company_name||'').toLowerCase().includes(term)
                                                    || (c.contact_person||'').toLowerCase().includes(term)
                                                    || (c.contact_email||'').toLowerCase().includes(term);
                const matchCountry = !countryFilter || (c.country||'') === countryFilter;
                const matchStatus  = !statusFilter  || (c.status||'') === statusFilter;
                return matchSearch && matchCountry && matchStatus;
            });
            tables.customers.querySelectorAll('tbody tr[data-id]').forEach(tr => {
                tr.style.display = filtered.some(c => c.customer_id === tr.dataset.id) ? '' : 'none';
            });

        } else if (view === 'contracts') {
            const statusFilter = $('filterContractStatus')?.value || '';
            const otFilter     = $('filterContractOt')?.value     || '';
            const filtered = _contracts.filter(c => {
                const status = computeContractStatus(c);
                const matchSearch = !term         || (c.contract_code||'').toLowerCase().includes(term)
                                                  || (c.customers?.company_name||'').toLowerCase().includes(term);
                const matchStatus = !statusFilter || status === statusFilter;
                const matchOt     = !otFilter     || (otFilter === 'ot' ? c.is_ot === true : c.is_ot !== true);
                return matchSearch && matchStatus && matchOt;
            });
            tables.contracts.querySelectorAll('tbody tr[data-id]').forEach(tr => {
                tr.style.display = filtered.some(c => c.contract_id === tr.dataset.id) ? '' : 'none';
            });

        } else if (view === 'projects') {
            const companyFilter = $('filterProjectCompany')?.value || '';
            const serviceFilter = $('filterProjectService')?.value || '';
            const filtered = _projects.filter(p => {
                const slName = p.contracts?.service_lines?.service_line_name || '';
                const matchSearch  = !term          || (p.project_name||'').toLowerCase().includes(term)
                                                    || (p.project_code||'').toLowerCase().includes(term)
                                                    || (p.customers?.company_name||'').toLowerCase().includes(term);
                const matchCompany = !companyFilter || (p.customers?.company_name||'') === companyFilter;
                const matchService = !serviceFilter || slName === serviceFilter;
                return matchSearch && matchCompany && matchService;
            });
            tables.projects.querySelectorAll('tbody tr[data-id]').forEach(tr => {
                tr.style.display = filtered.some(p => p.project_id === tr.dataset.id) ? '' : 'none';
            });
        }
    }

    // Bind search & filter events
    Object.keys(views).forEach(v => {
        views[v]?.querySelector('.search-box input')?.addEventListener('input', () => applyFilter(v));
    });
    ['filterCustomerCountry','filterCustomerStatus'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('customers')));
    ['filterContractStatus','filterContractOt'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('contracts')));
    $('sortContracts')?.addEventListener('change', renderContracts);
    ['filterProjectCompany','filterProjectService','filterProjectStatus'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('projects')));

    // ── CRUD: Customers ───────────────────────────────────────────────────────
    $('openAddCustomerModalBtn')?.addEventListener('click', () => openCustomerModal(null));
    $('openEditCustomerModalBtn')?.addEventListener('click', () => {
        if (!selected.customers) return showToast('Lỗi', 'Vui lòng chọn khách hàng.', 'error');
        openCustomerModal(_customers.find(x => x.customer_id === selected.customers));
    });
    $('deleteCustomerBtn')?.addEventListener('click', async () => {
        if (!selected.customers) return showToast('Lỗi', 'Vui lòng chọn khách hàng.', 'error');
        if (!confirm('Xóa khách hàng này?')) return;
        const { error } = await DB.Customers.delete(selected.customers);
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã xóa khách hàng.');
        selected.customers = null;
        await loadAll();
    });

    function openCustomerModal(c) {
        const modal = document.getElementById('customerModal');
        if (!modal) return;
        const isEdit = !!c;
        modal.querySelector('h3').innerHTML = isEdit
            ? '<i class="fa-regular fa-pen-to-square" style="color:#E20015;margin-right:8px;"></i> SỬA KHÁCH HÀNG'
            : '<i class="fa-solid fa-plus" style="color:#0078d4;margin-right:8px;"></i> THÊM KHÁCH HÀNG MỚI';
        if (modal.querySelector('#opCustCompany')) modal.querySelector('#opCustCompany').value = c?.company_name   || '';
        if (modal.querySelector('#opCustContact')) modal.querySelector('#opCustContact').value = c?.contact_person || '';
        if (modal.querySelector('#opCustEmail'))   modal.querySelector('#opCustEmail').value   = c?.contact_email  || '';
        if (modal.querySelector('#opCustPhone'))   modal.querySelector('#opCustPhone').value   = c?.phone          || '';
        if (modal.querySelector('#opCustCountry')) modal.querySelector('#opCustCountry').value = c?.country        || '';
        modal.classList.add('show');

        // Map tên quốc gia → country_code
        const countryCodeMap = {
            'Việt Nam':'VN','Hàn Quốc':'KR','Đức':'DE','Nhật Bản':'JP',
            'Mỹ':'US','Singapore':'SG','Trung Quốc':'CN','Anh':'GB','Pháp':'FR','Úc':'AU'
        };

        modal.querySelector('.btn-update').onclick = async () => {
            const country = modal.querySelector('#opCustCountry')?.value || '';
            const payload = {
                company_name:   modal.querySelector('#opCustCompany')?.value.trim(),
                contact_person: modal.querySelector('#opCustContact')?.value.trim(),
                contact_email:  modal.querySelector('#opCustEmail')?.value.trim(),
                phone:          modal.querySelector('#opCustPhone')?.value.trim(),
                country:        country,
                country_code:   countryCodeMap[country] || '',
                status:         c?.status || 'potential'
            };
            if (!payload.company_name) return showToast('Lỗi', 'Vui lòng nhập tên công ty.', 'error');
            if (!payload.country)      return showToast('Lỗi', 'Vui lòng chọn quốc gia.', 'error');
            const { error } = isEdit
                ? await DB.Customers.update(c.customer_id, payload)
                : await DB.Customers.create(payload);
            if (error) return showToast('Lỗi', error.message, 'error');
            showToast('Thành công', isEdit ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng.');
            modal.classList.remove('show');
            await loadAll();
        };
    }

    // ── CRUD: Contracts ───────────────────────────────────────────────────────
    $('openAddContractModalBtn')?.addEventListener('click', () => populateContractModal(null));
    $('editContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');
        const contract = _contracts.find(x => x.contract_id === selected.contracts);
        if (!contract) return showToast('Lỗi', 'Hợp đồng đã chọn không tồn tại.', 'error');
        populateContractModal(contract);
    });
    $('deleteContractBtn')?.addEventListener('click', async () => {
        if (!selected.contracts) return showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');
        if (!confirm('Xóa hợp đồng này?')) return;
        const { error } = await DB.Contracts.delete(selected.contracts);
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã xóa hợp đồng.');
        selected.contracts = null;
        await loadAll();
    });
    $('renewContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');
        openRenewModal();
    });

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }

    // ── File upload cho hợp đồng ─────────────────────────────────────────────
    let _uploadedContractFileUrl = null;

    function populateContractModal(c) {
        const modal = document.getElementById('contractModal');
        if (!modal) return;
        const isEdit = !!c;
        const title = modal.querySelector('h3');
        if (title) title.innerHTML = isEdit
            ? '<i class="fa-regular fa-pen-to-square" style="margin-right:8px;"></i> SỬA HỢP ĐỒNG'
            : '<i class="fa-solid fa-plus" style="margin-right:8px;"></i> TẠO HỢP ĐỒNG MỚI';

        const custSel = modal.querySelector('#opContractCustomer');
        if (custSel) {
            custSel.innerHTML = '<option value="">--- Chọn khách hàng ---</option>' +
                _customers.map(x => `<option value="${x.customer_id}" ${c?.customer_id===x.customer_id?'selected':''}>${esc(x.company_name)}</option>`).join('');
        }

        const slSel = modal.querySelector('#opContractService');
        if (slSel) {
            slSel.innerHTML = '<option value="">-- Chọn Service Line --</option>' +
                _serviceLines.map(x => `<option value="${x.service_line_id}" ${c?.service_line_id===x.service_line_id?'selected':''}>${esc(x.service_line_name)}</option>`).join('');
        }

        if (modal.querySelector('#opContractStart')) modal.querySelector('#opContractStart').value = c?.start_date?.slice(0,10) || '';
        if (modal.querySelector('#opContractEnd')) modal.querySelector('#opContractEnd').value = c?.end_date?.slice(0,10) || '';
        if (modal.querySelector('#opContractValue')) modal.querySelector('#opContractValue').value = c?.contract_value || '';
        if (modal.querySelector('#otCheck')) modal.querySelector('#otCheck').checked = Boolean(c?.is_ot);
        modal.dataset.contractId = c?.contract_id || '';

        // Reset file upload state
        _uploadedContractFileUrl = null;
        const fileInput = document.getElementById('opContractFileInput');
        if (fileInput) fileInput.value = '';
        const fileNameEl = document.getElementById('opContractFileName');
        if (fileNameEl) {
            if (c?.file_url) {
                const fname = c.file_url.split('/').pop();
                fileNameEl.innerHTML = `<i class="fa-solid fa-file-lines" style="color:#0078d4;margin-right:6px;"></i>${fname}`;
                _uploadedContractFileUrl = c.file_url;
            } else {
                fileNameEl.innerHTML = '<i class="fa-regular fa-file-lines"></i> VD: contract_signed.pdf';
            }
        }

        modal.classList.add('show');

        modal.querySelector('.btn-update').onclick = saveContract;
    }

    async function saveContract() {
        const modal = document.getElementById('contractModal');
        if (!modal) return;
        const isEdit = Boolean(modal.dataset.contractId);
        const customerId = modal.querySelector('#opContractCustomer')?.value || '';
        const serviceLineId = modal.querySelector('#opContractService')?.value || '';
        const startDate = modal.querySelector('#opContractStart')?.value || '';
        const endDate = modal.querySelector('#opContractEnd')?.value || '';
        const rawValue = modal.querySelector('#opContractValue')?.value || '';
        const contractValue = Number(String(rawValue).replace(/[^0-9]/g, '')) || 0;
        const isOt = Boolean(modal.querySelector('#otCheck')?.checked);

        if (!customerId) return showToast('Lỗi', 'Vui lòng chọn khách hàng.', 'error');
        if (!serviceLineId) return showToast('Lỗi', 'Vui lòng chọn Service Line.', 'error');
        if (!startDate || !endDate) return showToast('Lỗi', 'Vui lòng nhập đủ ngày hiệu lực và ngày hết hạn.', 'error');
        if (contractValue <= 0) return showToast('Lỗi', 'Vui lòng nhập giá trị hợp đồng hợp lệ.', 'error');
        if (parseDateOnly(startDate) > parseDateOnly(endDate)) return showToast('Lỗi', 'Ngày hiệu lực phải nhỏ hơn ngày hết hạn.', 'error');

        const customer = _customers.find(x => x.customer_id === customerId);
        const serviceLine = _serviceLines.find(x => x.service_line_id === serviceLineId);

        const payload = {
            customer_id:     customerId,
            service_line_id: serviceLineId,
            contract_name:   `Hợp đồng ${serviceLine?.service_line_name || ''} - ${customer?.company_name || ''}`.trim(),
            start_date:      startDate,
            end_date:        endDate,
            contract_value:  contractValue,
            is_ot:           isOt
        };

        if (_uploadedContractFileUrl) {
            payload.file_url = _uploadedContractFileUrl;
        }

        let result;
        if (isEdit) {
            result = await DB.Contracts.update(modal.dataset.contractId, payload);
        } else {
            payload.contract_code = `HD-${Date.now().toString().slice(-6)}`;
            result = await DB.Contracts.create(payload);
        }

        if (result.error) return showToast('Lỗi', result.error.message, 'error');
        showToast('Thành công', isEdit ? 'Đã cập nhật hợp đồng.' : 'Đã tạo hợp đồng mới.');
        modal.classList.remove('show');
        await loadAll();
    }

    function openRenewModal() {
        const modal = document.getElementById('renewModal');
        if (!modal) return;
        const contract = _contracts.find(x => x.contract_id === selected.contracts);
        if (!contract) return showToast('Lỗi', 'Hợp đồng đã chọn không tồn tại.', 'error');
        const display = modal.querySelector('#renewContractIdDisplay');
        if (display) display.textContent = contract.contract_code || '—';
        if (modal.querySelector('#renewNewEndDate')) modal.querySelector('#renewNewEndDate').value = contract.end_date?.slice(0,10) || '';
        modal.classList.add('show');
    }

    $('confirmRenewBtn')?.addEventListener('click', async () => {
        const modal = document.getElementById('renewModal');
        if (!modal) return;
        const newEndDate = modal.querySelector('#renewNewEndDate')?.value || '';
        if (!newEndDate) return showToast('Lỗi', 'Vui lòng chọn ngày hết hạn mới.', 'error');
        if (!selected.contracts) return showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');

        // Validate ngày mới phải lớn hơn ngày cũ
        const contract = _contracts.find(x => x.contract_id === selected.contracts);
        if (contract?.end_date && new Date(newEndDate) <= new Date(contract.end_date)) {
            return showToast('Lỗi', 'Ngày gia hạn phải lớn hơn ngày hết hạn hiện tại.', 'error');
        }

        const { error } = await DB.Contracts.update(selected.contracts, { end_date: newEndDate });
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã gia hạn hợp đồng thành công.');
        closeModal('renewModal');
        await loadAll();
    });

    $('cancelContractBtn')?.addEventListener('click', () => closeModal('contractModal'));
    $('closeContractModal')?.addEventListener('click', () => closeModal('contractModal'));
    $('cancelRenewBtn')?.addEventListener('click',  () => closeModal('renewModal'));
    $('closeRenewModal')?.addEventListener('click',  () => closeModal('renewModal'));

    // ── CRUD: Projects ────────────────────────────────────────────────────────
    $('openAddProjectModalBtn')?.addEventListener('click', () => populateProjectModal(null));
    $('editProjectBtn')?.addEventListener('click', () => {
        if (!selected.projects) return showToast('Lỗi', 'Vui lòng chọn dự án.', 'error');
        populateProjectModal(_projects.find(x => x.project_id === selected.projects));
    });
    $('deleteProjectBtn')?.addEventListener('click', async () => {
        if (!selected.projects) return showToast('Lỗi', 'Vui lòng chọn dự án.', 'error');
        if (!confirm('Xóa dự án này? Thao tác sẽ xóa toàn bộ phân công nhân sự liên quan.')) return;

        const projectId = selected.projects;

        // Bước 1: Xóa project_assignments (FK → project_resource_requests)
        await DB.Assignments.deleteByProject(projectId);

        // Bước 2: Xóa project_resource_requests (FK → projects)
        await DB.ResourceRequests.deleteByProject(projectId);

        // Bước 3: Xóa project
        const { error } = await DB.Projects.delete(projectId);
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã xóa dự án.');
        selected.projects = null;
        await loadAll();
    });

    function updateProjectContractSummary() {
        const modal = document.getElementById('projectModal');
        if (!modal) return;
        const contractId = modal.querySelector('#opProjContract')?.value || '';
        const display = {
            customer: modal.querySelector('#opProjCustomerDisplay'),
            service:  modal.querySelector('#opProjServiceDisplay'),
            budget:   modal.querySelector('#opProjBudgetDisplay'),
            ot:       modal.querySelector('#opProjOtDisplay'),
            range:    modal.querySelector('#opProjContractRange')
        };
        if (!contractId) {
            Object.values(display).forEach(el => { if (el) el.textContent = '—'; });
            return;
        }

        const contract = _contracts.find(x => x.contract_id === contractId);
        if (!contract) {
            Object.values(display).forEach(el => { if (el) el.textContent = '—'; });
            return;
        }

        if (display.customer) display.customer.textContent = contract.customers?.company_name || '—';
        if (display.service)  display.service.textContent  = contract.service_lines?.service_line_name || '—';
        if (display.budget)   display.budget.textContent   = fmtMoney(contract.contract_value);
        if (display.ot)       display.ot.textContent       = contract.is_ot ? 'Có OT' : 'Không OT';
        if (display.range)    display.range.textContent    = `${fmtDate(contract.start_date)} → ${fmtDate(contract.end_date)}`;
    }

    async function populateProjectModal(p) {
        const modal = document.getElementById('projectModal');
        if (!modal) return;
        _uploadedFileUrl = null; // reset file upload
        const fileName = modal.querySelector('#opProjFileName');
        if (fileName) fileName.innerHTML = '<i class="fa-regular fa-file-lines"></i> Chọn tệp đính kèm...';
        const isEdit = !!p;
        const titleEl = modal.querySelector('#projectModalTitle') || modal.querySelector('h3');
        if (titleEl) titleEl.textContent = isEdit ? 'Sửa dự án' : 'Tạo dự án mới';

        const contractSel = modal.querySelector('#opProjContract');
        if (contractSel) {
            contractSel.innerHTML = '<option value="">-- Chọn hợp đồng đang hiệu lực --</option>' +
                _contracts.map(c => `<option value="${c.contract_id}" ${p?.contract_id===c.contract_id?'selected':''}>${esc(c.contract_code)} — ${esc(c.customers?.company_name || '')}</option>`).join('');
        }

        if (modal.querySelector('#opProjName'))  modal.querySelector('#opProjName').value  = p?.project_name || '';
        if (modal.querySelector('#opProjStart')) modal.querySelector('#opProjStart').value = p?.start_date?.slice(0,10) || '';
        if (modal.querySelector('#opProjEnd'))   modal.querySelector('#opProjEnd').value   = p?.end_date?.slice(0,10) || '';
        modal.dataset.projectId = p?.project_id || '';

        updateProjectContractSummary();

        // Load assignments từ Supabase
        await loadProjectAssignments(p?.project_id || '');
        renderProjectAssignmentSummary(p?.project_id || '');

        modal.classList.add('show');
    }

    // Trả về projectId nếu lưu thành công, null nếu lỗi
    // closeAfter=true: đóng modal sau khi lưu (dùng cho nút Lưu)
    // closeAfter=false: giữ modal mở (dùng khi lưu trước khi phân công)
    async function saveProject(closeAfter = true) {
        const modal = document.getElementById('projectModal');
        if (!modal) return null;
        const projectId = modal.dataset.projectId || '';
        const projectName = modal.querySelector('#opProjName')?.value?.trim() || '';
        const contractId = modal.querySelector('#opProjContract')?.value || '';
        const startDate = modal.querySelector('#opProjStart')?.value || '';
        const endDate = modal.querySelector('#opProjEnd')?.value || '';

        if (!projectName) { showToast('Lỗi', 'Vui lòng nhập tên dự án.', 'error'); return null; }
        if (!contractId)  { showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error'); return null; }
        if (!startDate || !endDate) { showToast('Lỗi', 'Vui lòng nhập đủ thời gian dự án.', 'error'); return null; }
        if (new Date(startDate) > new Date(endDate)) { showToast('Lỗi', 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc.', 'error'); return null; }

        // Các trường bắt buộc chỉ check khi bấm Lưu hoàn tất (không check khi auto-save trước phân công)
        if (closeAfter) {
            if (!_uploadedFileUrl) { showToast('Lỗi', 'Vui lòng tải lên tệp mô tả chi tiết.', 'error'); return null; }
            if (!_currentProjectAssignments.length) { showToast('Lỗi', 'Vui lòng phân công ít nhất 1 nhân sự cho dự án.', 'error'); return null; }
        }

        const contract = _contracts.find(x => x.contract_id === contractId);
        if (!contract) { showToast('Lỗi', 'Hợp đồng chọn không hợp lệ.', 'error'); return null; }
        const contractStart = contract.start_date ? new Date(contract.start_date) : null;
        const contractEnd   = contract.end_date   ? new Date(contract.end_date)   : null;
        const projectStart  = new Date(startDate);
        const projectEnd    = new Date(endDate);
        if (contractStart && projectStart < contractStart) {
            showToast('Lỗi', 'Ngày bắt đầu dự án phải nằm trong hiệu lực hợp đồng.', 'error'); return null;
        }
        if (contractEnd && projectEnd > contractEnd) {
            showToast('Lỗi', 'Ngày kết thúc dự án phải không vượt quá ngày hết hạn hợp đồng.', 'error'); return null;
        }

        const payload = {
            project_name:     projectName,
            contract_id:      contractId,
            customer_id:      contract.customer_id,
            start_date:       startDate,
            end_date:         endDate,
            priority:         'medium',
            description:      '',
            progress_percent: 0
        };

        let result;
        if (projectId) {
            result = await DB.Projects.update(projectId, payload);
        } else {
            payload.project_code = `PJ-${Date.now().toString().slice(-6)}`;
            result = await DB.Projects.create(payload);
        }

        if (result.error) { showToast('Lỗi', result.error.message, 'error'); return null; }

        const savedId = projectId || result.data?.project_id;
        modal.dataset.projectId = savedId; // cập nhật lại dataset với ID mới

        showToast('Thành công', projectId ? 'Đã cập nhật dự án.' : 'Đã tạo dự án mới.');

        if (closeAfter) {
            closeModal('projectModal');
            await loadAll();
        } else {
            // Reload data ngầm để cache cập nhật, không đóng modal
            const [contRes, projRes] = await Promise.all([DB.Contracts.getAll(), DB.Projects.getAll()]);
            if (contRes.data) _contracts = contRes.data;
            if (projRes.data) _projects  = projRes.data;
        }

        return savedId;
    }

    $('saveProjectBtn')?.addEventListener('click', () => saveProject(true));

    // ── File upload cho hợp đồng — event listeners ───────────────────────────
    $('opContractFileArea')?.addEventListener('click', () => {
        $('opContractFileInput')?.click();
    });

    $('opContractFileInput')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileNameEl = $('opContractFileName');
        if (fileNameEl) fileNameEl.textContent = `⏳ Đang tải lên: ${file.name}`;

        function sanitizeFileName(name) {
            return name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/gi, 'd')
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .replace(/_+/g, '_');
        }

        const safeName = sanitizeFileName(file.name);
        const path = `contracts/${Date.now()}_${safeName}`;
        const { url, error } = await DB.Storage.uploadFile('project-files', path, file);

        if (error) {
            if (fileNameEl) fileNameEl.textContent = '❌ Tải lên thất bại';
            showToast('Lỗi', 'Không thể tải file lên: ' + error.message, 'error');
            _uploadedContractFileUrl = null;
        } else {
            if (fileNameEl) fileNameEl.innerHTML = `<i class="fa-solid fa-file-lines" style="color:#0078d4;margin-right:6px;"></i>${file.name}`;
            _uploadedContractFileUrl = url;
            showToast('Thành công', 'Đã tải file lên thành công.');
        }
    });

    // ── File upload cho dự án ─────────────────────────────────────────────────
    let _uploadedFileUrl = null;

    $('opProjFileArea')?.addEventListener('click', () => {
        $('opProjFile')?.click();
    });

    $('opProjFile')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = $('opProjFileName');
        if (fileName) fileName.textContent = `⏳ Đang tải lên: ${file.name}`;

        // Sanitize tên file: bỏ dấu tiếng Việt, thay ký tự đặc biệt bằng _
        function sanitizeFileName(name) {
            return name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')  // bỏ dấu
                .replace(/đ/gi, 'd')
                .replace(/[^a-zA-Z0-9._-]/g, '_') // thay ký tự đặc biệt
                .replace(/_+/g, '_');              // gộp nhiều _ liên tiếp
        }

        const safeName = sanitizeFileName(file.name);
        const path = `projects/${Date.now()}_${safeName}`;
        const { url, error } = await DB.Storage.uploadFile('project-files', path, file);

        if (error) {
            if (fileName) fileName.textContent = '❌ Tải lên thất bại';
            showToast('Lỗi', 'Không thể tải file lên: ' + error.message, 'error');
            _uploadedFileUrl = null;
        } else {
            if (fileName) fileName.innerHTML = `<i class="fa-solid fa-file-lines" style="color:#0078d4;margin-right:6px;"></i>${file.name}`;
            _uploadedFileUrl = url;
            showToast('Thành công', 'Đã tải file lên thành công.');
        }
    });
    $('closeProjectModal')?.addEventListener('click', () => closeModal('projectModal'));
    $('opProjContract')?.addEventListener('change', updateProjectContractSummary);
    $('openStaffAssignBtn')?.addEventListener('click', () => openStaffAssignModal());
    $('staffAssignSearch')?.addEventListener('input', filterStaffAssignRows);
    $('saveStaffAssignBtn')?.addEventListener('click', () => saveStaffAssignments());
    $('closeStaffAssignModal')?.addEventListener('click', () => closeModal('staffAssignModal'));
    $('cancelStaffAssignBtn')?.addEventListener('click', () => closeModal('staffAssignModal'));

    // Close modals
    document.querySelectorAll('.close-modal, .bosch-modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay, .bosch-modal-overlay')?.classList.remove('show');
        });
    });

    // ── Khởi động ─────────────────────────────────────────────────────────────
    await loadAll();
});
