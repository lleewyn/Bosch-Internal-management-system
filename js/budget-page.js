/**
 * Ngân sách — 3 tab: Dòng dịch vụ | Mức độ tham gia | Doanh thu dự án
 * Kết nối Supabase qua DB service
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.PageCommon) return;
    PageCommon.injectFormStyles();

    const $ = (id) => document.getElementById(id);
    const svView   = $('serviceLineView');
    const partView = $('participationView');
    const revView  = $('revenueView');
    const slModal  = $('serviceLineModal');

    let activeTab      = 'serviceLine';
    let selectedSlId   = null;
    let selectedPartId = null;
    let selectedRevId  = null;
    let editSl         = false;

    // Data cache
    let _serviceLines  = [];
    let _slRates       = {};
    let _assignments   = [];
    let _projects      = [];
    let _employees     = [];
    let _contracts     = [];
    let _effortMap     = {}; // { assignment_id: { hours, percent } }

    function esc(v) {
        return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function fmtMoney(v) {
        if (!v && v !== 0) return '—';
        return Number(v).toLocaleString('vi-VN') + ' VND';
    }
    function fmtRate(v) {
        if (!v) return '—';
        return Number(v).toLocaleString('vi-VN');
    }

    // ── Load data ─────────────────────────────────────────────────────────────
    async function loadAll() {
        showLoading();
        const [slRes, projRes, empRes, contRes] = await Promise.all([
            DB.ServiceLines.getAll(),
            DB.Projects.getAll(),
            DB.Employees.getAll(),
            DB.Contracts.getAll()
        ]);

        if (slRes.data)   _serviceLines = slRes.data;
        if (projRes.data) _projects     = projRes.data;
        if (empRes.data)  _employees    = empRes.data;
        _contracts = contRes.data || [];

        await loadRates();

        const assignRes = await DB.Assignments.getAll();
        _assignments = assignRes.data || [];

        // Load effort để lấy giờ OT
        const effortRes = await window.supabaseClient
            .from('effort_projects')
            .select('assignment_id, actual_hours, effort_percent');
        _effortMap = {};
        if (effortRes.data) {
            effortRes.data.forEach(e => {
                if (!_effortMap[e.assignment_id]) _effortMap[e.assignment_id] = { hours: 0, percent: 0 };
                _effortMap[e.assignment_id].hours   += Number(e.actual_hours  || 0);
                _effortMap[e.assignment_id].percent += Number(e.effort_percent || 0);
            });
        }

        renderActive();
    }

    async function loadRates() {
        _slRates = {};
        for (const sl of _serviceLines) {
            const res = await DB.ServiceLines.getRates(sl.service_line_id);
            if (res.data && res.data.length > 0) {
                // Lấy rate mới nhất (effective_from lớn nhất, effective_to = null)
                const active = res.data.find(r => !r.effective_to) || res.data[0];
                _slRates[sl.service_line_id] = active?.hourly_rate || 0;
            }
        }
    }

    function showLoading() {
        [svView, partView, revView].forEach(v => {
            const tbody = v?.querySelector('tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:#888;">
                <i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>Đang tải...</td></tr>`;
        });
    }

    // ── Tab switching ─────────────────────────────────────────────────────────
    PageCommon.bindTabs('.bosch-tab', {
        serviceLine:   svView,
        participation: partView,
        revenue:       revView
    }, (tab) => {
        activeTab = tab;
        renderActive();
    });

    function renderActive() {
        if (activeTab === 'serviceLine')   renderServiceLines();
        else if (activeTab === 'participation') renderParticipation();
        else renderRevenue();
    }

    // ── Badge helpers ─────────────────────────────────────────────────────────
    function showBadge(badgeId, text) {
        const b = $(badgeId);
        if (!b) return;
        if (text) { b.textContent = text; b.style.display = 'block'; }
        else b.style.display = 'none';
    }

    function clearSl()   { selectedSlId   = null; svView?.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected-row'));   showBadge('slSelectionBadge',   null); }
    function clearPart() { selectedPartId = null; partView?.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected-row')); showBadge('partSelectionBadge', null); }
    function clearRev()  { selectedRevId  = null; revView?.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected-row'));  showBadge('revSelectionBadge',  null); }

    // ── TAB 1: Dòng dịch vụ ──────────────────────────────────────────────────
    function renderServiceLines() {
        const tbody = svView?.querySelector('tbody');
        if (!tbody) return;

        const term   = (svView.querySelector('.search-box input')?.value || '').toLowerCase();
        const status = $('filterSlStatus')?.value || '';
        const sort   = $('filterSlSort')?.value   || '';

        let data = _serviceLines.slice();
        if (sort === 'rate-asc')  data.sort((a,b) => (_slRates[a.service_line_id]||0) - (_slRates[b.service_line_id]||0));
        if (sort === 'rate-desc') data.sort((a,b) => (_slRates[b.service_line_id]||0) - (_slRates[a.service_line_id]||0));

        // Đếm hợp đồng và dự án theo service_line_id
        const contractCountMap = {};
        const projectCountMap  = {};
        _contracts.forEach(c => {
            const id = c.service_line_id;
            if (id) contractCountMap[id] = (contractCountMap[id] || 0) + 1;
        });
        _projects.forEach(p => {
            const id = p.contracts?.service_line_id;
            if (id) projectCountMap[id] = (projectCountMap[id] || 0) + 1;
        });

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#888;">Chưa có dữ liệu dòng dịch vụ</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(s => {
            const rate     = _slRates[s.service_line_id] || 0;
            const isActive = s.status === 'active';
            const alertCls = !isActive ? ' row-alert' : '';
            const matchSearch = !term   || (s.service_line_name||'').toLowerCase().includes(term) || (s.description||'').toLowerCase().includes(term);
            const matchStatus = !status || s.status === status;
            if (!matchSearch || !matchStatus) return '';
            return `<tr data-id="${s.service_line_id}" style="cursor:pointer;" class="${selectedSlId===s.service_line_id?'selected-row':''}${alertCls}">
                <td class="code-col" style="text-align:center;font-size:11px;color:#6b7280;" title="${esc(s.service_line_id)}">${esc(s.service_line_id.slice(-8))}</td>
                <td class="name-col">${esc(s.service_line_name)}</td>
                <td class="role-col">${esc(s.description || '—')}</td>
                <td style="text-align:center;font-weight:700;color:var(--bosch-blue);">${fmtRate(rate)}</td>
                <td style="text-align:center;">${contractCountMap[s.service_line_id] || 0}</td>
                <td style="text-align:center;">${projectCountMap[s.service_line_id]  || 0}</td>
                <td style="text-align:center;">
                    <span class="badge ${isActive?'badge-success':'badge-muted'}">${isActive?'Hoạt động':'Ngừng'}</span>
                </td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selectedSlId === id) { clearSl(); return; }
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                selectedSlId = id;
                const sl = _serviceLines.find(x => x.service_line_id === id);
                showBadge('slSelectionBadge', sl ? `Đang chọn: ${sl.service_line_name}` : null);
            });
        });
    }

    // ── TAB 2: Mức độ tham gia ────────────────────────────────────────────────
    function renderParticipation() {
        const tbody = partView?.querySelector('tbody');
        if (!tbody) return;

        const term    = (partView.querySelector('.search-box input')?.value || '').toLowerCase();
        const projFilter = $('filterPartProject')?.value || '';
        const otFilter   = $('filterPartOt')?.value     || '';
        const sort       = $('filterPartSort')?.value   || '';

        // Populate project filter
        const projSel = $('filterPartProject');
        if (projSel && projSel.options.length <= 1) {
            const names = [...new Set(_projects.map(p => p.project_name).filter(Boolean))];
            names.forEach(n => { const o = document.createElement('option'); o.value=n; o.textContent=n; projSel.appendChild(o); });
        }

        // Build participation data từ assignments
        let data = _assignments.map(a => {
            const emp  = a.employees || {};
            // Lấy chức danh từ cache _employees
            const empFull = _employees.find(e => e.employee_id === (emp.employee_id || a.employee_id));
            const pos  = empFull?.positions?.position_name || '—';
            // Tìm project qua request
            const reqProjectId = a.project_resource_requests?.project_id;
            const proj = _projects.find(p => p.project_id === reqProjectId) || {};
            // Giờ OT: lấy từ effort_projects
            const effort   = _effortMap[a.assignment_id] || {};
            const otHours  = effort.hours || 0;
            const isOt     = a.project_resource_requests?.is_ot === true || otHours > 0;
            return {
                assignmentId: a.assignment_id,
                empId:        emp.employee_id || a.employee_id,
                empCode:      empFull?.employee_code || emp.employee_code || '—',
                empName:      empFull?.full_name || emp.full_name || '—',
                position:     pos,
                projectName:  proj.project_name || '—',
                planned:      Number(a.allocation_percent) || 0,
                actual:       Number(a.allocation_percent) || 0,
                isOt:         false,
                otHours:      otHours
            };
        }).filter(a => a.empName !== '—');

        if (sort === 'actual-desc') data.sort((a,b) => b.actual - a.actual);
        if (sort === 'actual-asc')  data.sort((a,b) => a.actual - b.actual);

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#888;">Chưa có dữ liệu mức độ tham gia</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(p => {
            const matchSearch  = !term       || p.empName.toLowerCase().includes(term) || p.empCode.toLowerCase().includes(term);
            const matchProject = !projFilter || p.projectName === projFilter;
            const matchOt      = !otFilter   || (otFilter === 'ot' ? p.isOt : !p.isOt);
            if (!matchSearch || !matchProject || !matchOt) return '';

            const pct = Math.min(p.actual, 100);
            let barColor='#10b981', badgeLabel='ỔN ĐỊNH', badgeStyle='background:#d1fae5;color:#059669;', rowBg='';
            if (p.actual > 90) { barColor='#dc2626'; badgeLabel='QUÁ TẢI'; badgeStyle='background:#fee2e2;color:#dc2626;'; rowBg='background:#fff5f5 !important;'; }
            else if (p.actual > 70) { barColor='#f59e0b'; badgeLabel='CAO'; badgeStyle='background:#fef3c7;color:#d97706;'; }

            const progressBar = `
                <div style="width:100%;background:#e5e7eb;border-radius:4px;height:6px;margin-bottom:6px;">
                    <div style="width:${pct}%;background:${barColor};height:6px;border-radius:4px;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${badgeStyle}">${badgeLabel}</span>
                    <span style="font-size:12px;font-weight:700;color:#374151;">${p.actual}%</span>
                </div>`;

            return `<tr data-id="${p.assignmentId}" style="cursor:pointer;${rowBg}" class="${selectedPartId===p.assignmentId?'selected-row':''}">
                <td class="code-col" style="text-align:center;">${esc(p.empCode)}</td>
                <td class="name-col">${esc(p.empName)}</td>
                <td>${esc(p.position)}</td>
                <td><span class="tag-project">${esc(p.projectName)}</span></td>
                <td style="text-align:center;font-weight:700;color:var(--bosch-blue);">${p.planned}%</td>
                <td style="text-align:center;">${p.otHours > 0 ? `<span style="color:#10b981;font-weight:700;">${p.otHours}h</span><span style="color:#E20015;font-size:10px;font-weight:700;display:block;">OT</span>` : '—'}</td>
                <td style="padding:10px 16px;min-width:160px;">${progressBar}</td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selectedPartId === id) { clearPart(); return; }
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                selectedPartId = id;
                const a = _assignments.find(x => x.assignment_id === id);
                showBadge('partSelectionBadge', a ? `Đang chọn: ${a.employees?.full_name || id}` : null);
            });
        });
    }

    function computeProjectStatus(p) {
        const today = new Date(); today.setHours(0,0,0,0);
        function pd(s) { if(!s) return null; const [y,m,d]=String(s).slice(0,10).split('-').map(Number); return new Date(y,m-1,d); }
        const end = pd(p.end_date);
        const pct = Number(p.progress_percent) || 0;
        if (pct >= 100) return { label:'Hoàn thành', cls:'badge-success' };
        if (!end)       return { label:'Đang triển khai', cls:'badge-info' };
        if (today > end) return { label:'Trễ tiến độ', cls:'badge-danger' };
        const days = Math.ceil((end - today) / 86400000);
        if (days <= 30) return { label:'Sắp hết hạn', cls:'badge-warning' };
        return { label:'Đang triển khai', cls:'badge-info' };
    }
    function renderRevenue() {
        const tbody = revView?.querySelector('tbody');
        if (!tbody) return;

        const term       = (revView.querySelector('.search-box input')?.value || '').toLowerCase();
        const compFilter = $('filterRevCompany')?.value || '';
        const sort       = $('filterRevSort')?.value    || '';

        // Populate company filter
        const compSel = $('filterRevCompany');
        if (compSel && compSel.options.length <= 1) {
            const companies = [...new Set(_projects.map(p => p.customers?.company_name).filter(Boolean))];
            companies.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; compSel.appendChild(o); });
        }

        let data = _projects.slice();
        if (sort === 'revenue-desc')  data.sort((a,b) => (Number(b.revenue_amount)||0) - (Number(a.revenue_amount)||0));
        if (sort === 'revenue-asc')   data.sort((a,b) => (Number(a.revenue_amount)||0) - (Number(b.revenue_amount)||0));
        if (sort === 'progress-desc') data.sort((a,b) => (Number(b.progress_percent)||0) - (Number(a.progress_percent)||0));
        if (sort === 'progress-asc')  data.sort((a,b) => (Number(a.progress_percent)||0) - (Number(b.progress_percent)||0));

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#888;">Chưa có dữ liệu doanh thu</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(p => {
            const cust   = p.customers || {};
            const slName = p.contracts?.service_lines?.service_line_name || '—';
            const pct    = Number(p.progress_percent) || 0;
            const staffCount = _assignments.filter(a => {
                const reqProjectId = a.project_resource_requests?.project_id;
                return reqProjectId === p.project_id;
            }).length;

            const matchSearch  = !term       || (p.project_name||'').toLowerCase().includes(term) || (p.project_code||'').toLowerCase().includes(term);
            const matchCompany = !compFilter || (cust.company_name||'') === compFilter;
            if (!matchSearch || !matchCompany) return '';

            return `<tr data-id="${p.project_id}" style="cursor:pointer;" class="${selectedRevId===p.project_id?'selected-row':''}">
                <td class="code-col" style="text-align:center;">${esc(p.project_code)}</td>
                <td class="name-col">${esc(p.project_name)}</td>
                <td>${esc(cust.company_name)}</td>
                <td><span class="tag-project">${esc(slName)}</span></td>
                <td style="text-align:center;">
                    ${(() => { const s = computeProjectStatus(p); return `<span class="badge ${s.cls}">${s.label}</span>`; })()}
                </td>
                <td style="text-align:center;font-weight:700;color:var(--bosch-blue);">${staffCount}</td>
                <td style="text-align:center;">
                    <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                        <div style="width:50px;height:5px;background:#eee;border-radius:3px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:${pct>=70?'#28a745':'#f58220'};border-radius:3px;"></div>
                        </div>
                        <span style="font-size:12px;font-weight:700;">${pct}%</span>
                    </div>
                </td>
                <td style="text-align:center;font-weight:700;color:var(--bosch-blue);">${fmtMoney(p.revenue_amount)}</td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selectedRevId === id) { clearRev(); return; }
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                selectedRevId = id;
                const p = _projects.find(x => x.project_id === id);
                showBadge('revSelectionBadge', p ? `Đang chọn: ${p.project_name}` : null);
            });
        });
    }

    // ── Bind search & filter ──────────────────────────────────────────────────
    svView?.querySelector('.search-box input')?.addEventListener('input', renderServiceLines);
    partView?.querySelector('.search-box input')?.addEventListener('input', renderParticipation);
    revView?.querySelector('.search-box input')?.addEventListener('input', renderRevenue);

    ['filterSlStatus','filterSlSort'].forEach(id => $(id)?.addEventListener('change', renderServiceLines));
    ['filterPartProject','filterPartOt','filterPartSort'].forEach(id => $(id)?.addEventListener('change', renderParticipation));
    ['filterRevCompany','filterRevSort'].forEach(id => $(id)?.addEventListener('change', renderRevenue));

    // ── CRUD: Dòng dịch vụ ────────────────────────────────────────────────────
    function openSlModal(edit) {
        editSl = edit;
        const s = edit ? _serviceLines.find(x => x.service_line_id === selectedSlId) : null;
        slModal.querySelector('h3').innerHTML = edit
            ? '<i class="fa-regular fa-pen-to-square" style="margin-right:8px;"></i> SỬA DÒNG DỊCH VỤ'
            : '<i class="fa-solid fa-plus" style="margin-right:8px;"></i> TẠO MỚI DÒNG DỊCH VỤ';
        const inputs = slModal.querySelectorAll('input.custom-input');
        if (inputs[0]) inputs[0].value = s?.service_line_name || '';
        const textarea = slModal.querySelector('textarea');
        if (textarea) textarea.value = s?.description || '';
        if (inputs[1]) inputs[1].value = s ? (_slRates[s.service_line_id] || '') : '';
        const statusCheck = slModal.querySelector('#statusCheck');
        if (statusCheck) statusCheck.checked = s ? s.status === 'active' : true;
        slModal.classList.add('show');
    }

    $('openAddServiceLineBtn')?.addEventListener('click', () => { selectedSlId = null; openSlModal(false); });
    $('editServiceLineBtn')?.addEventListener('click', () => {
        if (!selectedSlId) return showToast('Lỗi', 'Chọn dòng dịch vụ trước.', 'error');
        openSlModal(true);
    });
    $('deleteServiceLineBtn')?.addEventListener('click', async () => {
        if (!selectedSlId) return showToast('Lỗi', 'Chọn dòng dịch vụ trước.', 'error');
        const sl = _serviceLines.find(x => x.service_line_id === selectedSlId);
        if (!sl) return;
        if (sl.status === 'active') return showToast('Không thể xóa', 'Chỉ xóa dòng dịch vụ có trạng thái "Ngừng".', 'error');
        if (!confirm('Xóa dòng dịch vụ này?')) return;
        const { error } = await DB.ServiceLines.delete(selectedSlId);
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã xóa dòng dịch vụ.');
        clearSl();
        await loadAll();
    });

    $('saveServiceLineBtn')?.addEventListener('click', async () => {
        const inputs = slModal.querySelectorAll('input.custom-input');
        const name = inputs[0]?.value.trim();
        const desc = slModal.querySelector('textarea')?.value.trim() || '';
        const rate = Number(String(inputs[1]?.value || '').replace(/\D/g,'')) || 0;
        const isActive = slModal.querySelector('#statusCheck')?.checked;

        if (!name) return showToast('Lỗi', 'Vui lòng nhập tên dòng dịch vụ.', 'error');
        if (!rate) return showToast('Lỗi', 'Vui lòng nhập đơn giá.', 'error');

        const payload = {
            service_line_name: name,
            description:       desc,
            status:            isActive ? 'active' : 'inactive'
        };

        let result;
        if (editSl && selectedSlId) {
            result = await DB.ServiceLines.update(selectedSlId, payload);
        } else {
            result = await DB.ServiceLines.create(payload);
        }
        if (result.error) return showToast('Lỗi', result.error.message, 'error');

        // Lưu rate mới
        const slId = editSl ? selectedSlId : result.data?.service_line_id;
        if (slId && rate) {
            await window.supabaseClient.from('service_line_rates').insert({
                service_line_id: slId,
                hourly_rate:     rate,
                effective_from:  new Date().toISOString().slice(0,10)
            });
        }

        showToast('Thành công', editSl ? 'Đã cập nhật dòng dịch vụ.' : 'Đã tạo dòng dịch vụ.');
        slModal.classList.remove('show');
        await loadAll();
    });

    $('closeServiceLineModal')?.addEventListener('click', () => slModal.classList.remove('show'));
    $('cancelServiceLineBtn')?.addEventListener('click', () => slModal.classList.remove('show'));
    slModal?.addEventListener('click', e => { if (e.target === slModal) slModal.classList.remove('show'); });

    // ── CRUD: Mức độ tham gia ─────────────────────────────────────────────────
    const partModal = $('participationModal');

    $('editPartBtn')?.addEventListener('click', () => {
        if (!selectedPartId) return showToast('Lỗi', 'Vui lòng chọn nhân sự trước.', 'error');
        const a = _assignments.find(x => x.assignment_id === selectedPartId);
        if (!a) return;
        const empFull = _employees.find(e => e.employee_id === (a.employees?.employee_id || a.employee_id));
        const name = empFull?.full_name || a.employees?.full_name || '—';
        const code = empFull?.employee_code || a.employees?.employee_code || '—';
        if ($('partStaffName')) $('partStaffName').value = `${name} (${code})`;
        if ($('partPlanned'))   $('partPlanned').value   = a.allocation_percent || 0;
        partModal?.classList.add('show');
    });

    $('savePartModal')?.addEventListener('click', async () => {
        if (!selectedPartId) return;
        const planned = Number($('partPlanned')?.value) || 0;
        if (planned < 0 || planned > 100) return showToast('Lỗi', '% tham gia phải từ 0 đến 100.', 'error');
        const { error } = await DB.Assignments.update(selectedPartId, { allocation_percent: planned });
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã cập nhật mức tham gia.');
        partModal?.classList.remove('show');
        await loadAll();
    });

    $('closePartModal')?.addEventListener('click',  () => partModal?.classList.remove('show'));
    $('cancelPartModal')?.addEventListener('click', () => partModal?.classList.remove('show'));
    partModal?.addEventListener('click', e => { if (e.target === partModal) partModal.classList.remove('show'); });
    $('syncRevenueBtn')?.addEventListener('click', async () => {
        showToast('Đang xử lý', 'Đang đồng bộ dữ liệu...', 'info');
        await loadAll();
        showToast('Thành công', 'Đã đồng bộ dữ liệu từ Supabase.');
    });

    // ── Khởi động ─────────────────────────────────────────────────────────────
    await loadAll();
});
