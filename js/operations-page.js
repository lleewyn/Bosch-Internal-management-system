/**
 * Vận hành — Khách hàng, Hợp đồng, Dự án
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.MockStore || !window.PageCommon) return;
    PageCommon.injectFormStyles();

    const views = {
        customers: document.getElementById('customersView'),
        contracts: document.getElementById('contractsView'),
        projects: document.getElementById('projectsView')
    };
    const tables = {
        customers: document.getElementById('customersTable'),
        contracts: document.getElementById('contractsTable'),
        projects: document.getElementById('projectsTable')
    };
    const modals = {
        customer: document.getElementById('customerModal'),
        contract: document.getElementById('contractModal'),
        renew: document.getElementById('renewModal'),
        project: document.getElementById('projectModal'),
        staffAssign: document.getElementById('staffAssignModal')
    };

    const $ = (id) => document.getElementById(id);

    let activeTab = 'customers';
    const selected = { customers: null, contracts: null, projects: null };
    const editing = { customers: false, contracts: false, projects: false };
    const customerStatuses = ['ĐANG ĐÀM PHÁN', 'ĐÃ DEAL HỢP ĐỒNG', 'ĐÃ CÓ DỰ ÁN'];

    // Trạng thái phân công tạm thời khi đang mở modal dự án
    let tempStaffAssignments = []; // [{staffId, name, title, team, percent, isLeader}]


    // ── Tự động tính trạng thái hợp đồng theo ngày ──────────────────────────
    function computeContractStatus(c) {
        // Giữ nguyên nếu đã gia hạn (do người dùng xác nhận)
        if (c.status === 'Đã gia hạn') return 'Đã gia hạn';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = c.start ? new Date(c.start) : null;
        const end   = c.end   ? new Date(c.end)   : null;
        if (!start || !end) return 'Đã tạo';
        if (today < start) return 'Đã tạo';
        if (today > end)   return 'Hết hạn';
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 60) return 'Sắp hết hạn';
        return 'Có hiệu lực';
    }
    function computeProjectStatus(p) {
        // Nếu đã hoàn thành hoặc tạm dừng/hủy thì giữ nguyên
        if (['Hoàn thành', 'Tạm dừng', 'Đã hủy'].includes(p.status)) return p.status;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = p.end ? new Date(p.end) : null;
        const startDate = p.start ? new Date(p.start) : null;
        if (!endDate) return p.status;

        // Trễ tiến độ: đã qua ngày kết thúc nhưng chưa hoàn thành
        if (today > endDate) return 'Trễ tiến độ';

        // Sắp hết hạn: còn <= 30 ngày
        const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) return 'Sắp hết hạn';

        // Chưa phân bổ nhân sự
        const assignments = MockStore.getProjectAssignments ? MockStore.getProjectAssignments(p.id) : [];
        if (!assignments || assignments.length === 0) return 'Chưa phân bổ';

        return 'Đang triển khai';
    }

    // Thứ tự ưu tiên hiển thị
    const STATUS_PRIORITY = {
        'Trễ tiến độ': 0,
        'Sắp hết hạn': 1,
        'Chưa phân bổ': 2,
        'Đang triển khai': 3,
        'Tạm dừng': 4,
        'Đã hủy': 5,
        'Hoàn thành': 6
    };

    function sortProjects(projects) {
        return [...projects].sort((a, b) => {
            const sa = computeProjectStatus(a);
            const sb = computeProjectStatus(b);
            const pa = STATUS_PRIORITY[sa] ?? 99;
            const pb = STATUS_PRIORITY[sb] ?? 99;
            return pa - pb;
        });
    }


    // ── Badge selection helpers ──────────────────────────────────────────────
    function updateBadge(view) {
        const badgeId = { customers: 'customerSelectionBadge', contracts: 'contractSelectionBadge', projects: 'projectSelectionBadge' }[view];
        const badge = $(badgeId);
        if (!badge) return;
        const item = selected[view] ? getItem(view, selected[view]) : null;
        if (item) {
            badge.textContent = `Đang chọn: ${item.company || item.name || item.id}`;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    function clearSelection(view) {
        selected[view] = null;
        const tbody = tables[view]?.querySelector('tbody');
        if (tbody) tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
        updateBadge(view);
    }

    // ── Modal wiring ─────────────────────────────────────────────────────────
    function wireCustomerModal() {
        const m = modals.customer;
        const body = m.querySelector('.modal-body');
        if (body.querySelector('#opCustCompany')) return;
        const inputs = body.querySelectorAll('input.bg-white-input');
        inputs[0].id = 'opCustCompany';
        inputs[1].id = 'opCustContact';
        inputs[2].id = 'opCustEmail';
        inputs[3].id = 'opCustPhone';
        const countryP = body.querySelector('p');
        if (countryP) {
            const sel = document.createElement('select');
            sel.id = 'opCustCountry';
            sel.className = 'hr-form-select';
            sel.innerHTML = '<option value="">-- Chọn quốc gia --</option>' +
                ['Việt Nam', 'Hàn Quốc', 'Đức', 'Nhật Bản', 'Mỹ'].map(c => `<option value="${c}">${c}</option>`).join('');
            countryP.replaceWith(sel);
        }
        const statusWrap = document.createElement('div');
        statusWrap.id = 'opCustStatusWrap';
        statusWrap.className = 'form-group mb-15';
        statusWrap.innerHTML = `<label>Trạng thái <span class="required-asterisk">*</span></label>
            <select id="opCustStatus" class="hr-form-select">${customerStatuses.map(s => `<option value="${s}">${s}</option>`).join('')}</select>`;
        body.appendChild(statusWrap);
    }

    function wireContractModal() {
        const m = modals.contract;
        const body = m.querySelector('.modal-body');
        const selCust = body.querySelector('select:not([id])');
        if (selCust) selCust.id = 'opContractCustomer';
        const inputs = body.querySelectorAll('input.bg-white-input');
        if (inputs[0]) { inputs[0].type = 'date'; inputs[0].id = 'opContractStart'; }
        if (inputs[1]) { inputs[1].type = 'date'; inputs[1].id = 'opContractEnd'; }
        if (inputs[2]) inputs[2].id = 'opContractValue';
    }

    function refreshContractServiceLines() {
        const sel = $('opContractService');
        if (!sel) return;
        const lines = MockStore.getServiceLines ? MockStore.getServiceLines() : [];
        const current = sel.value;
        sel.innerHTML = '<option value="">-- Chọn Service Line --</option>' +
            lines.map(sl => `<option value="${UI.escape(sl.name)}">${UI.escape(sl.name)}</option>`).join('');
        if (current) sel.value = current;
    }

    wireCustomerModal();
    wireContractModal();

    function refreshContractCustomers() {
        const sel = $('opContractCustomer');
        if (!sel) return;
        sel.innerHTML = '<option value="">--- Chọn khách hàng ---</option>' +
            MockStore.getCustomers().map(c => `<option value="${c.id}">${UI.escape(c.company)}</option>`).join('');
    }


    // ── Tab switching ────────────────────────────────────────────────────────
    PageCommon.bindTabs('.bosch-tab', views, (tab) => {
        activeTab = tab;
        renderActive();
    });

    function getItem(view, id) {
        const fn = {
            customers: () => MockStore.getCustomers().find(c => c.id === id),
            contracts: () => MockStore.getContracts().find(c => c.id === id),
            projects: () => MockStore.getProjects().find(p => p.id === id)
        };
        return fn[view]?.();
    }

    function bindRowToggle(tbody, view) {
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selected[view] === id) {
                    clearSelection(view);
                } else {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    tr.classList.add('selected-row');
                    selected[view] = id;
                    updateBadge(view);
                }
            });
        });
    }

    // ── Render Customers ─────────────────────────────────────────────────────
    function renderCustomers() {
        const tbody = tables.customers.querySelector('tbody');
        const STATUS_ORDER = { 'ĐANG ĐÀM PHÁN': 0, 'ĐÃ DEAL HỢP ĐỒNG': 1, 'ĐÃ CÓ DỰ ÁN': 2 };
        const sorted = MockStore.getCustomers().slice().sort((a, b) => {
            const oa = STATUS_ORDER[a.status] ?? 99;
            const ob = STATUS_ORDER[b.status] ?? 99;
            return oa - ob;
        });
        tbody.innerHTML = sorted.map((c, i) => `
            <tr data-id="${c.id}" style="background:${i % 2 ? '#f8f9fa' : 'white'};cursor:pointer;" class="${selected.customers === c.id ? 'selected-row' : ''}">
                <td style="color:#0056b3;font-weight:800;padding:16px;text-align:center;">${UI.escape(c.id)}</td>
                <td style="font-weight:700;padding:16px;">${UI.escape(c.company)}</td>
                <td style="padding:16px;">${UI.escape(c.contact)}</td>
                <td style="padding:16px;">${UI.escape(c.email)}</td>
                <td style="padding:16px;text-align:center;">${UI.escape(c.phone)}</td>
                <td style="padding:16px;text-align:center;">${UI.escape(c.country)}</td>
                <td style="padding:16px;text-align:center;">${UI.badge(c.status)}</td>
            </tr>`).join('');
        bindRowToggle(tbody, 'customers');
        applyFilter('customers');
    }

    // ── Render Contracts ─────────────────────────────────────────────────────
    function renderContracts() {
        const tbody = tables.contracts.querySelector('tbody');
        const sortVal = $('sortContracts')?.value || '';
        let contracts = MockStore.getContracts().slice();
        if (sortVal === 'value-asc')  contracts.sort((a, b) => (a.value || 0) - (b.value || 0));
        if (sortVal === 'value-desc') contracts.sort((a, b) => (b.value || 0) - (a.value || 0));
        tbody.innerHTML = contracts.map(c => {
            const alertStatuses = ['Sắp hết hạn', 'Hết hạn'];
            const computedStatus = computeContractStatus(c);
            const alertCls = alertStatuses.includes(computedStatus) ? ' row-alert' : '';

            // Cột đính kèm
            const attachKey = `contract_attach_${c.id}`;
            const attachMeta = (() => { try { return JSON.parse(localStorage.getItem(attachKey)); } catch { return null; } })();
            let attachCell;
            if (attachMeta) {
                attachCell = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                    <span style="font-size:11px;color:#374151;font-weight:600;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${UI.escape(attachMeta.name)}">${UI.escape(attachMeta.name)}</span>
                    <div style="display:flex;gap:6px;">
                        <button onclick="contractAttachView('${c.id}')" title="Xem / Tải về" style="background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="contractAttachUpload('${c.id}')" title="Thay thế file" style="background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-arrow-up-from-bracket"></i></button>
                    </div>
                </div>`;
            } else {
                attachCell = `<button onclick="contractAttachUpload('${c.id}')" title="Tải hợp đồng lên" style="background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">
                    <i class="fa-solid fa-arrow-up-from-bracket"></i> Tải lên
                </button>`;
            }

            return `<tr data-id="${c.id}" style="cursor:pointer;" class="${selected.contracts === c.id ? 'selected-row' : ''}${alertCls}">
                <td class="code-col">${UI.escape(c.id)}</td>
                <td>${UI.escape(c.company)}</td>
                <td>${UI.escape(c.contact)}</td>
                <td>${UI.escape(c.email)}</td>
                <td>${UI.escape(c.phone)}</td>
                <td>${UI.escape(c.serviceLine)}</td>
                <td>${UI.formatNumber(c.value)}</td>
                <td>${c.start}</td>
                <td>${c.end}</td>
                <td>${UI.escape(c.project)}</td>
                <td>${c.ot ? 'Có' : 'Không'}</td>
                <td>${c.signed ? 'Đã ký' : 'Chưa'}</td>
                <td style="text-align:center;">${UI.badge(computedStatus)}</td>
                <td style="text-align:center;padding:10px 8px;">${attachCell}</td>
            </tr>`;
        }).join('');
        bindRowToggle(tbody, 'contracts');
        applyFilter('contracts');
    }


    // ── Render Projects ──────────────────────────────────────────────────────
    function projectStatusBadge(status) {
        const map = {
            'Trễ tiến độ':    'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;',
            'Sắp hết hạn':    'background:#fffbeb;color:#d97706;border:1px solid #fde68a;',
            'Chưa phân bổ':   'background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;',
            'Đang triển khai':'background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;',
            'Hoàn thành':     'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;',
            'Tạm dừng':       'background:#fdf4ff;color:#9333ea;border:1px solid #e9d5ff;',
            'Đã hủy':         'background:#f9fafb;color:#9ca3af;border:1px solid #e5e7eb;'
        };
        const style = map[status] || 'background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;';
        return `<span style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;${style}">${UI.escape(status)}</span>`;
    }

    function progressBar(pct) {
        const clamped = Math.min(100, Math.max(0, pct || 0));
        let color = '#2563eb';
        if (clamped >= 80) color = '#16a34a';
        else if (clamped < 30) color = '#d97706';
        return `<div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:#e5e7eb;border-radius:4px;height:8px;min-width:60px;">
                <div style="width:${clamped}%;background:${color};height:8px;border-radius:4px;transition:width .3s;"></div>
            </div>
            <span style="font-size:11px;font-weight:700;color:#374151;min-width:28px;">${clamped}%</span>
        </div>`;
    }

    function staffChips(projectId, leader) {
        const assignments = MockStore.getProjectAssignments ? MockStore.getProjectAssignments(projectId) : [];
        if (!assignments || assignments.length === 0) {
            return `<span style="color:#9ca3af;font-size:12px;font-style:italic;">Chưa phân bổ</span>`;
        }
        return assignments.map(a => {
            const isLeader = a.isLeader || a.name === leader;
            return `<span style="display:inline-flex;align-items:center;gap:4px;background:${isLeader ? '#eff6ff' : '#f3f4f6'};
                border:1px solid ${isLeader ? '#bfdbfe' : '#e5e7eb'};border-radius:20px;
                padding:3px 8px;font-size:11px;font-weight:600;color:${isLeader ? '#1d4ed8' : '#374151'};margin:2px;">
                ${isLeader ? '<i class="fa-solid fa-crown" style="font-size:9px;color:#f59e0b;"></i>' : ''}
                ${UI.escape(a.name)}
                <span style="color:#9ca3af;font-size:10px;">${a.percent}%</span>
            </span>`;
        }).join('');
    }

    function renderProjects() {
        const tbody = tables.projects.querySelector('tbody');
        const sorted = sortProjects(MockStore.getProjects());

        tbody.innerHTML = sorted.map(p => {
            const status = computeProjectStatus(p);
            const isCompleted = status === 'Hoàn thành';
            const isLate = status === 'Trễ tiến độ';
            const isExpiring = status === 'Sắp hết hạn';

            let rowStyle = 'cursor:pointer;';
            if (isCompleted) rowStyle += 'opacity:0.6;';
            if (isLate) rowStyle += 'background:#fff5f5 !important;';
            if (isExpiring) rowStyle += 'background:#fffdf0 !important;';

            // Tìm thông tin liên hệ từ hợp đồng/khách hàng
            const contract = MockStore.getContracts().find(c => c.customerId === p.customerId);
            const contact = contract?.contact || p.contact || '—';

            return `<tr data-id="${p.id}" style="${rowStyle}" class="${selected.projects === p.id ? 'selected-row' : ''}">
                <td style="padding:12px 16px;">
                    <div style="font-size:11px;color:#6b7280;font-weight:600;">${UI.escape(p.id)}</div>
                    <div style="font-weight:700;color:#111827;font-size:13px;">${UI.escape(p.name)}</div>
                </td>
                <td style="padding:12px 16px;font-weight:600;">${UI.escape(p.company)}</td>
                <td style="padding:12px 16px;font-size:12px;color:#6b7280;">${UI.escape(contact)}</td>
                <td style="padding:12px 16px;">${staffChips(p.id, p.leader)}</td>
                <td style="padding:12px 16px;font-size:12px;">${UI.escape(p.serviceLine)}</td>
                <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#059669;">${UI.formatNumber(p.budget)}</td>
                <td style="padding:12px 16px;font-size:12px;">${p.start}</td>
                <td style="padding:12px 16px;font-size:12px;${isLate ? 'color:#dc2626;font-weight:700;' : ''}">${p.end}</td>
                <td style="padding:12px 16px;">${progressBar(p.progress)}</td>
                <td style="padding:12px 16px;">${projectStatusBadge(status)}</td>
                <td style="padding:12px 16px;font-size:12px;color:#6b7280;">${UI.escape(p.desc || '—')}</td>
            </tr>`;
        }).join('');

        bindRowToggle(tbody, 'projects');

        // Populate filters
        const companies = [...new Set(MockStore.getProjects().map(p => p.company).filter(Boolean))];
        const services  = [...new Set(MockStore.getProjects().map(p => p.serviceLine).filter(Boolean))];
        const compSel = $('filterProjectCompany');
        const svcSel  = $('filterProjectService');
        if (compSel && compSel.options.length <= 1) {
            companies.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; compSel.appendChild(o); });
        }
        if (svcSel && svcSel.options.length <= 1) {
            services.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; svcSel.appendChild(o); });
        }
        applyFilter('projects');
    }

    function renderActive() {
        if (activeTab === 'customers') renderCustomers();
        else if (activeTab === 'contracts') renderContracts();
        else if (activeTab === 'projects') renderProjects();
    }


    // ── Filter logic ─────────────────────────────────────────────────────────
    function applyFilter(view) {
        const v = views[view];
        if (!v) return;
        const term = (v.querySelector('.search-box input')?.value || '').toLowerCase();

        if (view === 'customers') {
            const country = ($('filterCustomerCountry')?.value || '').toLowerCase();
            const status  = ($('filterCustomerStatus')?.value || '').toLowerCase();
            tables.customers.querySelectorAll('tbody tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                const matchSearch  = !term    || tr.textContent.toLowerCase().includes(term);
                const matchCountry = !country || (cells[5]?.textContent || '').toLowerCase().includes(country);
                const matchStatus  = !status  || (cells[6]?.textContent || '').toLowerCase().includes(status);
                tr.style.display = matchSearch && matchCountry && matchStatus ? '' : 'none';
            });
        } else if (view === 'contracts') {
            const status = ($('filterContractStatus')?.value || '').toLowerCase();
            const ot     = $('filterContractOt')?.value || '';
            tables.contracts.querySelectorAll('tbody tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                const rowOt     = (cells[10]?.textContent || '').toLowerCase();
                const rowStatus = (cells[12]?.textContent || '').toLowerCase();
                const matchSearch = !term   || tr.textContent.toLowerCase().includes(term);
                const matchStatus = !status || rowStatus.includes(status);
                const matchOt     = !ot     || (ot === 'ot' ? rowOt.includes('có') : rowOt.includes('không'));
                tr.style.display = matchSearch && matchStatus && matchOt ? '' : 'none';
            });
        } else if (view === 'projects') {
            const company = ($('filterProjectCompany')?.value || '').toLowerCase();
            const service = ($('filterProjectService')?.value || '').toLowerCase();
            const status  = ($('filterProjectStatus')?.value || '').toLowerCase();
            tables.projects.querySelectorAll('tbody tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                const rowCompany = (cells[1]?.textContent || '').toLowerCase();
                const rowService = (cells[4]?.textContent || '').toLowerCase();
                const rowStatus  = (cells[9]?.textContent || '').toLowerCase();
                const matchSearch  = !term    || tr.textContent.toLowerCase().includes(term);
                const matchCompany = !company || rowCompany.includes(company);
                const matchService = !service || rowService.includes(service);
                const matchStatus  = !status  || rowStatus.includes(status);
                tr.style.display = matchSearch && matchCompany && matchService && matchStatus ? '' : 'none';
            });
        }
    }

    Object.keys(views).forEach(v => {
        views[v]?.querySelector('.search-box input')?.addEventListener('input', () => applyFilter(v));
    });
    ['filterCustomerCountry','filterCustomerStatus'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('customers')));
    ['filterContractStatus','filterContractOt'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('contracts')));
    $('sortContracts')?.addEventListener('change', () => renderContracts());
    ['filterProjectCompany','filterProjectService','filterProjectStatus'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('projects')));

    const open  = (m) => UI.openModal(m);
    const close = (m) => UI.closeModal(m);


    // ── Customer CRUD ────────────────────────────────────────────────────────
    function fillCustomer(c = {}) {
        $('opCustCompany').value = c.company || '';
        $('opCustContact').value = c.contact || '';
        $('opCustEmail').value   = c.email   || '';
        $('opCustPhone').value   = c.phone   || '';
        $('opCustCountry').value = c.country || 'Việt Nam';
        $('opCustStatus').value  = c.status  || 'TIỀM NĂNG';
    }

    $('openAddCustomerModalBtn')?.addEventListener('click', () => {
        editing.customers = false;
        fillCustomer({});
        modals.customer.querySelector('h3').innerHTML = '<i class="fa-solid fa-plus" style="color:#0078d4;margin-right:8px;"></i> THÊM KHÁCH HÀNG MỚI';
        // Ẩn trạng thái — hệ thống tự gán khi tạo mới
        const sw = $('opCustStatusWrap');
        if (sw) sw.style.display = 'none';
        open(modals.customer);
    });
    $('openEditCustomerModalBtn')?.addEventListener('click', () => {
        if (!selected.customers) return showToast('Lỗi', 'Vui lòng chọn khách hàng.', 'error');
        editing.customers = true;
        fillCustomer(getItem('customers', selected.customers));
        modals.customer.querySelector('h3').innerHTML = '<i class="fa-regular fa-pen-to-square" style="color:#E20015;margin-right:8px;"></i> SỬA KHÁCH HÀNG';
        // Hiện trạng thái khi sửa
        const sw = $('opCustStatusWrap');
        if (sw) sw.style.display = 'block';
        open(modals.customer);
    });
    $('deleteCustomerBtn')?.addEventListener('click', () => {
        if (!selected.customers) return showToast('Lỗi', 'Vui lòng chọn khách hàng.', 'error');
        const cust = getItem('customers', selected.customers);
        if (!cust || cust.status !== 'ĐANG ĐÀM PHÁN') {
            return showToast('Không thể xóa', 'Chỉ được xóa khách hàng có trạng thái "Đang đàm phán".', 'error');
        }
        if (confirm('Xóa khách hàng này?')) {
            MockStore.deleteCustomers([selected.customers]);
            clearSelection('customers');
            renderCustomers();
            showToast('Thành công', 'Đã xóa khách hàng.');
        }
    });
    modals.customer.querySelector('.btn-update')?.addEventListener('click', () => {
        if (!validateForm(modals.customer)) return;
        const payload = {
            company: $('opCustCompany').value.trim(),
            contact: $('opCustContact').value.trim(),
            email:   $('opCustEmail').value.trim(),
            phone:   $('opCustPhone').value.trim(),
            country: $('opCustCountry').value,
            status:  editing.customers ? $('opCustStatus').value : 'ĐANG ĐÀM PHÁN'
        };
        if (editing.customers) {
            MockStore.updateCustomer(selected.customers, payload);
            showToast('Thành công', 'Đã cập nhật khách hàng.');
        } else {
            MockStore.addCustomer(payload);
            showToast('Thành công', 'Đã thêm khách hàng.');
        }
        close(modals.customer);
        renderCustomers();
    });


    // ── Contract CRUD ────────────────────────────────────────────────────────
    $('openAddContractModalBtn')?.addEventListener('click', () => {
        editing.contracts = false;
        refreshContractCustomers();
        refreshContractServiceLines();
        open(modals.contract);
    });
    $('editContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');
        editing.contracts = true;
        refreshContractCustomers();
        refreshContractServiceLines();
        const c = getItem('contracts', selected.contracts);
        $('opContractCustomer').value = c.customerId || '';
        $('opContractStart').value    = c.start      || '';
        $('opContractEnd').value      = c.end        || '';
        $('opContractService').value  = c.serviceLine|| '';
        $('opContractValue').value    = c.value      || '';
        if ($('opContractStatus')) $('opContractStatus').value = c.status || 'Có hiệu lực';
        open(modals.contract);
    });
    $('renewContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');
        open(modals.renew);
    });
    $('deleteContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');
        const contract = getItem('contracts', selected.contracts);
        if (!contract) return;
        if (computeContractStatus(contract) !== 'Hết hạn') {
            return showToast('Không thể xóa', 'Chỉ được xóa hợp đồng có trạng thái "Hết hạn".', 'error');
        }
        if (confirm('Xóa hợp đồng này?')) {
            MockStore.deleteContracts([selected.contracts]);
            clearSelection('contracts');
            renderContracts();
            showToast('Thành công', 'Đã xóa hợp đồng.');
        }
    });
    modals.contract.querySelector('.btn-update')?.addEventListener('click', () => {
        if (!validateForm(modals.contract)) return;
        const custId = $('opContractCustomer').value;
        const cust   = MockStore.getCustomers().find(c => c.id === custId);
        const payload = {
            customerId:  custId,
            company:     cust?.company  || '',
            contact:     cust?.contact  || '',
            email:       cust?.email    || '',
            phone:       cust?.phone    || '',
            serviceLine: $('opContractService').value,
            value:       parseInt($('opContractValue').value.replace(/\D/g, '')) || 0,
            start:       $('opContractStart').value,
            end:         $('opContractEnd').value,
            project:     'Dự án liên kết',
            ot:          modals.contract.querySelector('input[type=checkbox]')?.checked || false,
            signed:      true
        };
        // Tính trạng thái tự động, giữ "Đã gia hạn" nếu đang sửa và đã gia hạn
        const existing = editing.contracts ? getItem('contracts', selected.contracts) : null;
        payload.status = (existing?.status === 'Đã gia hạn') ? 'Đã gia hạn' : computeContractStatus(payload);
        if (editing.contracts) {
            MockStore.updateContract(selected.contracts, payload);
            showToast('Thành công', 'Đã cập nhật hợp đồng.');
        } else {
            MockStore.addContract(payload);
            showToast('Thành công', 'Đã tạo hợp đồng.');
        }
        close(modals.contract);
        renderContracts();
    });
    $('confirmRenewBtn')?.addEventListener('click', () => {
        if (selected.contracts) {
            MockStore.updateContract(selected.contracts, { status: 'Đã gia hạn', end: '2026-12-31' });
            showToast('Thành công', 'Đã gia hạn hợp đồng.');
        }
        close(modals.renew);
        renderContracts();
    });


    // ── Project Modal: populate contract dropdown ────────────────────────────
    function refreshProjectContracts() {
        const sel = $('opProjContract');
        if (!sel) return;
        const validStatuses = ['Có hiệu lực', 'Sắp hết hạn'];
        const active = MockStore.getContracts().filter(c => validStatuses.includes(c.status));
        sel.innerHTML = '<option value="">-- Chọn hợp đồng đang hiệu lực --</option>' +
            active.map(c => `<option value="${c.id}">${UI.escape(c.id)} — ${UI.escape(c.company)}</option>`).join('');
    }

    // Auto-fill thông tin từ hợp đồng khi chọn
    function bindContractAutoFill() {
        const sel = $('opProjContract');
        if (!sel) return;
        sel.addEventListener('change', () => {
            const contractId = sel.value;
            const contract   = MockStore.getContracts().find(c => c.id === contractId);
            if (contract) {
                $('opProjCustomerDisplay').textContent = contract.company || '—';
                $('opProjServiceDisplay').textContent  = contract.serviceLine || '—';
                $('opProjBudgetDisplay').textContent   = UI.formatNumber ? UI.formatNumber(contract.value) : contract.value;
                $('opProjOtDisplay').textContent       = contract.ot ? 'Có OT' : 'Không OT';
                $('opProjContractRange').textContent   = `${contract.start} → ${contract.end}`;
                // Đặt mặc định thời gian dự án = thời gian hợp đồng
                if (!$('opProjStart').value) $('opProjStart').value = contract.start;
                if (!$('opProjEnd').value)   $('opProjEnd').value   = contract.end;
                $('opProjStart').min = contract.start;
                $('opProjStart').max = contract.end;
                $('opProjEnd').min   = contract.start;
                $('opProjEnd').max   = contract.end;
            } else {
                $('opProjCustomerDisplay').textContent = '—';
                $('opProjServiceDisplay').textContent  = '—';
                $('opProjBudgetDisplay').textContent   = '—';
                $('opProjOtDisplay').textContent       = '—';
                $('opProjContractRange').textContent   = '—';
            }
            validateProjectDates();
        });
    }

    // Validate thời gian dự án nằm trong hợp đồng
    function validateProjectDates() {
        const contractId = $('opProjContract')?.value;
        const contract   = MockStore.getContracts().find(c => c.id === contractId);
        const errEl      = $('opProjDateError');
        if (!contract || !errEl) return true;

        const pStart = $('opProjStart')?.value;
        const pEnd   = $('opProjEnd')?.value;
        if (!pStart || !pEnd) return true;

        const cStart = new Date(contract.start);
        const cEnd   = new Date(contract.end);
        const dStart = new Date(pStart);
        const dEnd   = new Date(pEnd);

        const valid = dStart >= cStart && dEnd <= cEnd && dStart <= dEnd;
        errEl.style.display = valid ? 'none' : 'block';
        return valid;
    }

    $('opProjStart')?.addEventListener('change', validateProjectDates);
    $('opProjEnd')?.addEventListener('change', validateProjectDates);


    // ── Cập nhật ô phân công trong modal dự án ───────────────────────────────
    function renderTempStaffChips() {
        const container = $('opProjStaffList');
        if (!container) return;
        if (tempStaffAssignments.length === 0) {
            container.innerHTML = '<span style="color:#9ca3af;font-size:13px;font-style:italic;">Chưa phân công nhân sự...</span>';
            return;
        }
        container.innerHTML = tempStaffAssignments.map((a, idx) => `
            <span style="display:inline-flex;align-items:center;gap:4px;
                background:${a.isLeader ? '#eff6ff' : '#f3f4f6'};
                border:1px solid ${a.isLeader ? '#bfdbfe' : '#e5e7eb'};
                border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;
                color:${a.isLeader ? '#1d4ed8' : '#374151'};">
                ${a.isLeader ? '<i class="fa-solid fa-crown" style="font-size:9px;color:#f59e0b;"></i>' : ''}
                ${UI.escape(a.name)}
                <span style="color:#9ca3af;font-size:10px;">${a.percent}%</span>
                <i class="fa-solid fa-xmark" data-idx="${idx}" style="cursor:pointer;color:#9ca3af;font-size:10px;margin-left:2px;" title="Xóa"></i>
            </span>`).join('');

        container.querySelectorAll('.fa-xmark[data-idx]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                tempStaffAssignments.splice(idx, 1);
                renderTempStaffChips();
            });
        });
    }

    // ── Modal phân công nhân sự ──────────────────────────────────────────────
    let staffAssignTemp = {}; // {staffId: {checked, percent}}

    function renderStaffAssignTable(filter = '') {
        const tbody = $('staffAssignTableBody');
        if (!tbody) return;
        const staff = MockStore.getStaff().filter(s => {
            if (!filter) return true;
            const q = filter.toLowerCase();
            return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q);
        });

        tbody.innerHTML = staff.map(s => {
            const cur = staffAssignTemp[s.id] || { checked: false, percent: 0 };
            // Tổng workload hiện tại trên tất cả dự án
            const totalWorkload = s.workload || 0;
            const newTotal = totalWorkload + (cur.checked ? cur.percent : 0);
            const overLimit = newTotal > 120;
            const workloadColor = totalWorkload >= 100 ? '#dc2626' : totalWorkload >= 80 ? '#d97706' : '#16a34a';

            return `<tr style="border-bottom:1px solid #f0f0f0;${cur.checked ? 'background:#f0f7ff;' : ''}">
                <td style="padding:12px 16px;text-align:center;">
                    <input type="checkbox" data-staff-id="${s.id}" class="staff-assign-check"
                        ${cur.checked ? 'checked' : ''}
                        style="width:16px;height:16px;cursor:pointer;accent-color:#0078d4;">
                </td>
                <td style="padding:12px 16px;">
                    <div style="font-size:11px;color:#6b7280;font-weight:600;">${UI.escape(s.id)}</div>
                    <div style="font-weight:700;font-size:13px;">${UI.escape(s.name)}</div>
                </td>
                <td style="padding:12px 16px;font-size:12px;color:#374151;">${UI.escape(s.title || '—')}</td>
                <td style="padding:12px 16px;font-size:12px;color:#374151;">${UI.escape(s.team || '—')}</td>
                <td style="padding:12px 16px;text-align:center;">
                    <span style="font-size:12px;font-weight:700;color:${workloadColor};">${totalWorkload}%</span>
                </td>
                <td style="padding:12px 16px;text-align:center;">
                    <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
                        <button type="button" data-staff-id="${s.id}" data-action="dec"
                            style="width:24px;height:24px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-weight:700;font-size:14px;line-height:1;">−</button>
                        <input type="number" data-staff-id="${s.id}" class="staff-percent-input"
                            value="${cur.percent}" min="0" max="120" step="5"
                            style="width:52px;text-align:center;border:1px solid ${overLimit ? '#fca5a5' : '#ddd'};
                            border-radius:4px;padding:4px;font-size:13px;font-weight:700;
                            color:${overLimit ? '#dc2626' : '#111827'};background:${overLimit ? '#fff5f5' : 'white'};">
                        <button type="button" data-staff-id="${s.id}" data-action="inc"
                            style="width:24px;height:24px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-weight:700;font-size:14px;line-height:1;">+</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        // Bind checkbox
        tbody.querySelectorAll('.staff-assign-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const sid = cb.dataset.staffId;
                if (!staffAssignTemp[sid]) staffAssignTemp[sid] = { checked: false, percent: 20 };
                staffAssignTemp[sid].checked = cb.checked;
                updateStaffAssignCount();
                renderStaffAssignTable($('staffAssignSearch')?.value || '');
            });
        });

        // Bind +/- buttons
        tbody.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const sid    = btn.dataset.staffId;
                const action = btn.dataset.action;
                if (!staffAssignTemp[sid]) staffAssignTemp[sid] = { checked: false, percent: 0 };
                let val = staffAssignTemp[sid].percent || 0;
                val = action === 'inc' ? Math.min(120, val + 5) : Math.max(0, val - 5);
                staffAssignTemp[sid].percent = val;
                renderStaffAssignTable($('staffAssignSearch')?.value || '');
            });
        });

        // Bind input trực tiếp
        tbody.querySelectorAll('.staff-percent-input').forEach(inp => {
            inp.addEventListener('change', () => {
                const sid = inp.dataset.staffId;
                if (!staffAssignTemp[sid]) staffAssignTemp[sid] = { checked: false, percent: 0 };
                staffAssignTemp[sid].percent = Math.min(120, Math.max(0, parseInt(inp.value) || 0));
                renderStaffAssignTable($('staffAssignSearch')?.value || '');
            });
        });
    }

    function updateStaffAssignCount() {
        const count = Object.values(staffAssignTemp).filter(v => v.checked).length;
        const el = $('staffAssignCount');
        if (el) el.textContent = `Đã chọn: ${count} nhân viên`;
    }


    // ── Mở modal phân công ───────────────────────────────────────────────────
    $('openStaffAssignBtn')?.addEventListener('click', () => {
        // Khởi tạo staffAssignTemp từ tempStaffAssignments hiện tại
        staffAssignTemp = {};
        tempStaffAssignments.forEach(a => {
            staffAssignTemp[a.staffId] = { checked: true, percent: a.percent };
        });
        renderStaffAssignTable();
        updateStaffAssignCount();
        open(modals.staffAssign);
    });

    $('staffAssignSearch')?.addEventListener('input', (e) => {
        renderStaffAssignTable(e.target.value);
    });

    // Lưu phân công
    $('saveStaffAssignBtn')?.addEventListener('click', () => {
        // Kiểm tra tổng workload không vượt 120%
        const staff = MockStore.getStaff();
        let overLimitNames = [];
        Object.entries(staffAssignTemp).forEach(([sid, val]) => {
            if (!val.checked) return;
            const s = staff.find(x => x.id === sid);
            if (!s) return;
            const total = (s.workload || 0) + val.percent;
            if (total > 120) overLimitNames.push(`${s.name} (${total}%)`);
        });

        if (overLimitNames.length > 0) {
            showToast('Lỗi phân bổ', `Tổng mức độ tham gia vượt 120%: ${overLimitNames.join(', ')}`, 'error');
            return;
        }

        // Cập nhật tempStaffAssignments
        const selected_staff = Object.entries(staffAssignTemp)
            .filter(([, v]) => v.checked && v.percent > 0)
            .map(([sid, v], idx) => {
                const s = staff.find(x => x.id === sid);
                return {
                    staffId:  sid,
                    name:     s?.name  || sid,
                    title:    s?.title || '',
                    team:     s?.team  || '',
                    percent:  v.percent,
                    isLeader: idx === 0 // Người đầu tiên được chọn là leader
                };
            });

        // Nếu có người đã là leader trước đó, giữ nguyên
        if (tempStaffAssignments.length > 0) {
            const prevLeader = tempStaffAssignments.find(a => a.isLeader);
            if (prevLeader) {
                selected_staff.forEach(a => { a.isLeader = a.staffId === prevLeader.staffId; });
                if (!selected_staff.some(a => a.isLeader) && selected_staff.length > 0) {
                    selected_staff[0].isLeader = true;
                }
            }
        }

        tempStaffAssignments = selected_staff;
        renderTempStaffChips();
        close(modals.staffAssign);
        showToast('Thành công', `Đã phân công ${selected_staff.length} nhân viên.`);
    });

    $('cancelStaffAssignBtn')?.addEventListener('click', () => close(modals.staffAssign));
    $('closeStaffAssignModal')?.addEventListener('click', () => close(modals.staffAssign));
    modals.staffAssign?.addEventListener('click', e => { if (e.target === modals.staffAssign) close(modals.staffAssign); });


    // ── Project CRUD ─────────────────────────────────────────────────────────
    function resetProjectModal() {
        $('opProjName').value = '';
        $('opProjContract').value = '';
        $('opProjStart').value = '';
        $('opProjEnd').value = '';
        $('opProjStart').removeAttribute('min');
        $('opProjStart').removeAttribute('max');
        $('opProjEnd').removeAttribute('min');
        $('opProjEnd').removeAttribute('max');
        $('opProjCustomerDisplay').textContent = '—';
        $('opProjServiceDisplay').textContent  = '—';
        $('opProjBudgetDisplay').textContent   = '—';
        $('opProjOtDisplay').textContent       = '—';
        $('opProjContractRange').textContent   = '—';
        $('opProjDateError').style.display     = 'none';
        $('opProjFileName').innerHTML          = '<i class="fa-regular fa-file-lines"></i> Chọn tệp đính kèm...';
        tempStaffAssignments = [];
        renderTempStaffChips();
    }

    $('openAddProjectModalBtn')?.addEventListener('click', () => {
        editing.projects = false;
        refreshProjectContracts();
        resetProjectModal();
        $('projectModalTitle').innerHTML = '<i class="fa-solid fa-plus" style="margin-right:8px;"></i> TẠO DỰ ÁN MỚI';
        open(modals.project);
    });

    $('editProjectBtn')?.addEventListener('click', () => {
        if (!selected.projects) return showToast('Lỗi', 'Vui lòng chọn dự án.', 'error');
        const p = getItem('projects', selected.projects);
        if (!p) return;

        // Chỉ cho sửa khi chưa hoàn thành
        const status = computeProjectStatus(p);
        if (status === 'Hoàn thành') {
            return showToast('Không thể sửa', 'Dự án đã hoàn thành không thể chỉnh sửa.', 'error');
        }

        editing.projects = true;
        refreshProjectContracts();
        resetProjectModal();

        $('opProjName').value = p.name || '';
        if (p.contractId) $('opProjContract').value = p.contractId;

        // Trigger auto-fill
        const contract = MockStore.getContracts().find(c => c.id === p.contractId);
        if (contract) {
            $('opProjCustomerDisplay').textContent = contract.company || '—';
            $('opProjServiceDisplay').textContent  = contract.serviceLine || '—';
            $('opProjBudgetDisplay').textContent   = UI.formatNumber ? UI.formatNumber(contract.value) : contract.value;
            $('opProjOtDisplay').textContent       = contract.ot ? 'Có OT' : 'Không OT';
            $('opProjContractRange').textContent   = `${contract.start} → ${contract.end}`;
            $('opProjStart').min = contract.start;
            $('opProjStart').max = contract.end;
            $('opProjEnd').min   = contract.start;
            $('opProjEnd').max   = contract.end;
        }
        $('opProjStart').value = p.start || '';
        $('opProjEnd').value   = p.end   || '';

        // Load nhân sự đã phân công
        const assignments = MockStore.getProjectAssignments ? MockStore.getProjectAssignments(p.id) : [];
        tempStaffAssignments = assignments.map(a => ({ ...a }));
        renderTempStaffChips();

        $('projectModalTitle').innerHTML = '<i class="fa-regular fa-pen-to-square" style="margin-right:8px;"></i> SỬA DỰ ÁN';
        open(modals.project);
    });

    $('deleteProjectBtn')?.addEventListener('click', () => {
        if (!selected.projects) return showToast('Lỗi', 'Vui lòng chọn dự án.', 'error');
        const p = getItem('projects', selected.projects);
        if (!p) return;
        const status = computeProjectStatus(p);
        if (status !== 'Hoàn thành') {
            return showToast('Không thể xóa', 'Chỉ được xóa dự án đã hoàn thành.', 'error');
        }
        if (confirm(`Xóa dự án "${p.name}"?`)) {
            MockStore.deleteProjects([selected.projects]);
            if (MockStore.deleteProjectAssignments) MockStore.deleteProjectAssignments(selected.projects);
            clearSelection('projects');
            renderProjects();
            showToast('Thành công', 'Đã xóa dự án.');
        }
    });


    // Lưu dự án
    $('saveProjectBtn')?.addEventListener('click', () => {
        const name       = $('opProjName')?.value.trim();
        const contractId = $('opProjContract')?.value;
        const pStart     = $('opProjStart')?.value;
        const pEnd       = $('opProjEnd')?.value;

        if (!name) {
            showToast('Lỗi', 'Vui lòng nhập tên dự án.', 'error');
            return;
        }
        if (!contractId) {
            showToast('Lỗi', 'Vui lòng chọn hợp đồng.', 'error');
            return;
        }
        if (!pStart || !pEnd) {
            showToast('Lỗi', 'Vui lòng nhập thời gian thực hiện.', 'error');
            return;
        }
        if (!validateProjectDates()) {
            showToast('Lỗi', 'Thời gian dự án phải nằm trong phạm vi hợp đồng.', 'error');
            return;
        }

        const contract = MockStore.getContracts().find(c => c.id === contractId);
        const payload = {
            name,
            contractId,
            customerId:  contract?.customerId  || '',
            company:     contract?.company     || '',
            contact:     contract?.contact     || '',
            serviceLine: contract?.serviceLine || '',
            budget:      contract?.value       || 0,
            ot:          contract?.ot          || false,
            start:       pStart,
            end:         pEnd,
            desc:        '',
            progress:    editing.projects ? (getItem('projects', selected.projects)?.progress || 0) : 0,
            status:      'Đang triển khai',
            revenue:     editing.projects ? (getItem('projects', selected.projects)?.revenue || 0) : 0,
            leader:      tempStaffAssignments.find(a => a.isLeader)?.name || ''
        };

        let projectId;
        if (editing.projects) {
            MockStore.updateProject(selected.projects, payload);
            projectId = selected.projects;
            showToast('Thành công', 'Đã cập nhật dự án.');
        } else {
            const newProj = MockStore.addProject(payload);
            projectId = newProj.id;
            showToast('Thành công', 'Đã tạo dự án mới.');
        }

        // Lưu phân công nhân sự
        if (MockStore.setProjectAssignments) {
            MockStore.setProjectAssignments(projectId, tempStaffAssignments);
        }

        close(modals.project);
        renderProjects();
    });

    // File đính kèm
    $('opProjFileArea')?.addEventListener('click', () => $('opProjFile')?.click());
    $('opProjFile')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            $('opProjFileName').innerHTML = `<i class="fa-regular fa-file-lines"></i> ${UI.escape(file.name)}`;
        }
    });

    // ── Modal close buttons ──────────────────────────────────────────────────
    document.querySelectorAll('#closeCustomerModal, #cancelCustomerBtn').forEach(b =>
        b?.addEventListener('click', () => close(modals.customer)));
    document.querySelectorAll('#closeContractModal, #cancelContractBtn').forEach(b =>
        b?.addEventListener('click', () => close(modals.contract)));
    document.querySelectorAll('#closeProjectModal, #cancelProjectBtn').forEach(b =>
        b?.addEventListener('click', () => close(modals.project)));
    document.querySelectorAll('#cancelRenewBtn').forEach(b =>
        b?.addEventListener('click', () => close(modals.renew)));

    Object.values(modals).forEach(m => {
        m?.addEventListener('click', e => { if (e.target === m) close(m); });
    });
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const m = btn.closest('.modal-overlay');
            if (m) close(m);
        });
    });

    // ── Init ─────────────────────────────────────────────────────────────────
    bindContractAutoFill();
    refreshContractCustomers();
    renderActive();

    // Re-render khi có file đính kèm mới
    document.addEventListener('contractAttachUpdated', () => renderContracts());
});

// ── Contract Attachment: Upload & View (global scope) ────────────────────────
let _contractAttachTargetId = null;

window.contractAttachUpload = function(contractId) {
    _contractAttachTargetId = contractId;
    const input = document.getElementById('contractFileInput');
    if (input) { input.value = ''; input.click(); }
};

window.contractAttachView = function(contractId) {
    const attachKey = `contract_attach_${contractId}`;
    let meta;
    try { meta = JSON.parse(localStorage.getItem(attachKey)); } catch { meta = null; }
    if (!meta || !meta.data) return showToast('Thông báo', 'Không tìm thấy file đính kèm.', 'error');

    // Tạo blob URL và mở tab mới
    const byteStr = atob(meta.data.split(',')[1]);
    const ab = new ArrayBuffer(byteStr.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    const blob = new Blob([ab], { type: meta.type });
    const url = URL.createObjectURL(blob);

    // PDF/ảnh → mở tab; các loại khác → tải về
    if (meta.type === 'application/pdf' || meta.type.startsWith('image/')) {
        window.open(url, '_blank');
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = meta.name;
        a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('contractFileInput');
    if (!fileInput) return;
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !_contractAttachTargetId) return;

        // Giới hạn 10MB
        if (file.size > 10 * 1024 * 1024) {
            showToast('Lỗi', 'File quá lớn. Vui lòng chọn file dưới 10MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const meta = { name: file.name, type: file.type, size: file.size, data: ev.target.result };
            try {
                localStorage.setItem(`contract_attach_${_contractAttachTargetId}`, JSON.stringify(meta));
                showToast('Thành công', `Đã đính kèm "${file.name}" vào hợp đồng.`);
                // Re-render bảng hợp đồng
                const contractsTable = document.getElementById('contractsTable');
                if (contractsTable) {
                    // Trigger re-render thông qua event
                    document.dispatchEvent(new CustomEvent('contractAttachUpdated'));
                }
            } catch (err) {
                showToast('Lỗi', 'Không thể lưu file. Dung lượng localStorage có thể đã đầy.', 'error');
            }
        };
        reader.readAsDataURL(file);
    });
});


