/**
 * Vận hành — 4 tab: Khách hàng, Hợp đồng, Dự án, Nguồn lực
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
        project: document.getElementById('projectModal')
    };

    const $ = (id) => document.getElementById(id);

    let activeTab = 'customers';
    const selected = { customers: null, contracts: null, projects: null };
    const editing = { customers: false, contracts: false, projects: false };

    const customerStatuses = ['TIỀM NĂNG', 'ĐANG ĐÀM PHÁN', 'ĐÃ CÓ DỰ ÁN', 'ĐÃ DEAL HỢP ĐỒNG'];

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
        statusWrap.className = 'form-group mb-15';
        statusWrap.innerHTML = `<label>Trạng thái <span class="required-asterisk">*</span></label>
            <select id="opCustStatus" class="hr-form-select">${customerStatuses.map(s => `<option value="${s}">${s}</option>`).join('')}</select>`;
        body.appendChild(statusWrap);
    }

    function wireContractModal() {
        const m = modals.contract;
        const body = m.querySelector('.modal-body');
        // Gán id cho select khách hàng (select đầu tiên, chưa có id)
        const selCust = body.querySelector('select:not([id])');
        if (selCust) selCust.id = 'opContractCustomer';
        const inputs = body.querySelectorAll('input.bg-white-input');
        if (inputs[0]) { inputs[0].type = 'date'; inputs[0].id = 'opContractStart'; }
        if (inputs[1]) { inputs[1].type = 'date'; inputs[1].id = 'opContractEnd'; }
        if (inputs[2]) inputs[2].id = 'opContractService';
        if (inputs[3]) inputs[3].id = 'opContractValue';
        // opContractStatus đã có id trong HTML, không cần wire thêm
    }

    function wireProjectModal() {
        const body = modals.project.querySelector('.modal-body');
        // Chỉ wire các input text, không wire select có id sẵn
        const inputs = body.querySelectorAll('input.bg-white-input');
        const ids = ['opProjName', 'opProjStart', 'opProjEnd', 'opProjService', 'opProjBudget', 'opProjLeader'];
        let di = 0;
        inputs.forEach(inp => {
            if (ids[di]) {
                inp.id = ids[di];
                if (ids[di] === 'opProjStart' || ids[di] === 'opProjEnd') inp.type = 'date';
            }
            di++;
        });
        // Wire select hợp đồng và khách hàng (chưa có id)
        const selects = body.querySelectorAll('select:not([id])');
        if (selects[0]) selects[0].id = 'opProjContract';
        if (selects[1]) selects[1].id = 'opProjCustomer';
        // opProjectStatus đã có id trong HTML, không cần wire thêm
    }

    wireCustomerModal();
    wireContractModal();
    wireProjectModal();

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

    // ── Render helpers ───────────────────────────────────────────────────────
    function badge(view, row) {
        return UI.badge(row.status);
    }

    function getItem(view, id) {
        const fn = {
            customers: () => MockStore.getCustomers().find(c => c.id === id),
            contracts: () => MockStore.getContracts().find(c => c.id === id),
            projects: () => MockStore.getProjects().find(p => p.id === id)
        };
        return fn[view]?.();
    }

    // ── Row click: chọn / bỏ chọn khi click lại ─────────────────────────────
    function bindRowToggle(tbody, view) {
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selected[view] === id) {
                    // Bỏ chọn
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

    // ── Render functions ─────────────────────────────────────────────────────
    function renderCustomers() {
        const tbody = tables.customers.querySelector('tbody');
        tbody.innerHTML = MockStore.getCustomers().map((c, i) => `
            <tr data-id="${c.id}" style="background:${i % 2 ? '#f8f9fa' : 'white'};cursor:pointer;" class="${selected.customers === c.id ? 'selected-row' : ''}">
                <td style="color:#0056b3;font-weight:800;padding:16px;">${UI.escape(c.id)}</td>
                <td style="font-weight:700;padding:16px;">${UI.escape(c.company)}</td>
                <td style="padding:16px;">${UI.escape(c.contact)}</td>
                <td style="padding:16px;">${UI.escape(c.email)}</td>
                <td style="padding:16px;">${UI.escape(c.phone)}</td>
                <td style="padding:16px;">${UI.escape(c.country)}</td>
                <td style="padding:16px;">${badge('customers', c)}</td>
            </tr>`).join('');
        bindRowToggle(tbody, 'customers');
        applyFilter('customers');
    }

    function renderContracts() {
        const tbody = tables.contracts.querySelector('tbody');
        tbody.innerHTML = MockStore.getContracts().map(c => {
            const alertStatuses = ['Sắp hết hạn', 'Hết hạn', 'Quá hạn'];
            const alert = alertStatuses.includes(c.status) ? ' row-alert' : '';
            return `<tr data-id="${c.id}" style="cursor:pointer;" class="${selected.contracts === c.id ? 'selected-row' : ''}${alert}">
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
                <td>${badge('contracts', c)}</td>
            </tr>`;
        }).join('');
        bindRowToggle(tbody, 'contracts');
        applyFilter('contracts');
    }

    function renderProjects() {
        const tbody = tables.projects.querySelector('tbody');
        tbody.innerHTML = MockStore.getProjects().map(p => {
            const alertStatuses = ['Tạm dừng', 'Đã hủy', 'Quá hạn'];
            const alert = alertStatuses.includes(p.status) ? ' row-alert' : '';
            return `<tr data-id="${p.id}" style="cursor:pointer;" class="${selected.projects === p.id ? 'selected-row' : ''}${alert}">
                <td class="name-col">${UI.escape(p.name)}</td>
                <td>${UI.escape(p.company)}</td>
                <td>${UI.escape(p.company)}</td>
                <td>${UI.escape(p.leader)}</td>
                <td>${UI.escape(p.serviceLine)}</td>
                <td>${UI.formatNumber(p.budget)}</td>
                <td>${p.start}</td>
                <td>${p.end}</td>
                <td>${UI.escape(p.desc || '')}</td>
                <td>${p.progress}%</td>
                <td>${badge('projects', p)}</td>
            </tr>`;
        }).join('');
        bindRowToggle(tbody, 'projects');
        // Populate company & service filters
        const companies = [...new Set(MockStore.getProjects().map(p => p.company).filter(Boolean))];
        const services = [...new Set(MockStore.getProjects().map(p => p.serviceLine).filter(Boolean))];
        const compSel = $('filterProjectCompany');
        const svcSel = $('filterProjectService');
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
            const status = ($('filterCustomerStatus')?.value || '').toLowerCase();
            tables.customers.querySelectorAll('tbody tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                const rowCountry = (cells[5]?.textContent || '').toLowerCase();
                const rowStatus = (cells[6]?.textContent || '').toLowerCase();
                const matchSearch = !term || tr.textContent.toLowerCase().includes(term);
                const matchCountry = !country || rowCountry.includes(country);
                const matchStatus = !status || rowStatus.includes(status);
                tr.style.display = matchSearch && matchCountry && matchStatus ? '' : 'none';
            });
        } else if (view === 'contracts') {
            const status = ($('filterContractStatus')?.value || '').toLowerCase();
            const ot = $('filterContractOt')?.value || '';
            tables.contracts.querySelectorAll('tbody tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                const rowStatus = (cells[12]?.textContent || '').toLowerCase();
                const rowOt = (cells[10]?.textContent || '').toLowerCase();
                const matchSearch = !term || tr.textContent.toLowerCase().includes(term);
                const matchStatus = !status || rowStatus.includes(status);
                const matchOt = !ot || (ot === 'ot' ? rowOt.includes('có') : rowOt.includes('không'));
                tr.style.display = matchSearch && matchStatus && matchOt ? '' : 'none';
            });
        } else if (view === 'projects') {
            const company = ($('filterProjectCompany')?.value || '').toLowerCase();
            const service = ($('filterProjectService')?.value || '').toLowerCase();
            const status = ($('filterProjectStatus')?.value || '').toLowerCase();
            tables.projects.querySelectorAll('tbody tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                const rowCompany = (cells[1]?.textContent || '').toLowerCase();
                const rowService = (cells[4]?.textContent || '').toLowerCase();
                const rowStatus = (cells[10]?.textContent || '').toLowerCase();
                const matchSearch = !term || tr.textContent.toLowerCase().includes(term);
                const matchCompany = !company || rowCompany.includes(company);
                const matchService = !service || rowService.includes(service);
                const matchStatus = !status || rowStatus.includes(status);
                tr.style.display = matchSearch && matchCompany && matchService && matchStatus ? '' : 'none';
            });
        }
    }

    // Bind search inputs
    Object.keys(views).forEach(v => {
        views[v]?.querySelector('.search-box input')?.addEventListener('input', () => applyFilter(v));
    });
    // Bind filter selects
    ['filterCustomerCountry','filterCustomerStatus'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('customers')));
    ['filterContractStatus','filterContractOt'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('contracts')));
    ['filterProjectCompany','filterProjectService','filterProjectStatus'].forEach(id => $(id)?.addEventListener('change', () => applyFilter('projects')));


    const open = (m) => UI.openModal(m);
    const close = (m) => UI.closeModal(m);

    // ── Customer CRUD ────────────────────────────────────────────────────────
    function fillCustomer(c = {}) {
        $('opCustCompany').value = c.company || '';
        $('opCustContact').value = c.contact || '';
        $('opCustEmail').value = c.email || '';
        $('opCustPhone').value = c.phone || '';
        $('opCustCountry').value = c.country || 'Việt Nam';
        $('opCustStatus').value = c.status || 'TIỀM NĂNG';
    }

    $('openAddCustomerModalBtn')?.addEventListener('click', () => {
        editing.customers = false;
        fillCustomer({});
        modals.customer.querySelector('h3').textContent = 'THÊM KHÁCH HÀNG MỚI';
        open(modals.customer);
    });
    $('openEditCustomerModalBtn')?.addEventListener('click', () => {
        if (!selected.customers) return showToast('Lỗi', 'Chọn khách hàng.', 'error');
        editing.customers = true;
        fillCustomer(getItem('customers', selected.customers));
        modals.customer.querySelector('h3').textContent = 'SỬA KHÁCH HÀNG';
        open(modals.customer);
    });
    $('deleteCustomerBtn')?.addEventListener('click', () => {
        if (!selected.customers) return showToast('Lỗi', 'Chọn khách hàng.', 'error');
        if (confirm('Xóa khách hàng?')) {
            MockStore.deleteCustomers([selected.customers]);
            clearSelection('customers');
            renderCustomers();
            showToast('Thành công', 'Đã xóa.');
        }
    });

    modals.customer.querySelector('.btn-update')?.addEventListener('click', () => {
        if (!validateForm(modals.customer)) return;
        const payload = {
            company: $('opCustCompany').value.trim(),
            contact: $('opCustContact').value.trim(),
            email: $('opCustEmail').value.trim(),
            phone: $('opCustPhone').value.trim(),
            country: $('opCustCountry').value,
            status: $('opCustStatus').value
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
        open(modals.contract);
    });
    $('editContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Chọn hợp đồng.', 'error');
        editing.contracts = true;
        refreshContractCustomers();
        const c = getItem('contracts', selected.contracts);
        $('opContractCustomer').value = c.customerId || '';
        $('opContractStart').value = c.start || '';
        $('opContractEnd').value = c.end || '';
        $('opContractService').value = c.serviceLine || '';
        $('opContractValue').value = c.value || '';
        if ($('opContractStatus')) $('opContractStatus').value = c.status || 'Đang hiệu lực';
        open(modals.contract);
    });
    $('renewContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Chọn hợp đồng.', 'error');
        open(modals.renew);
    });
    $('deleteContractBtn')?.addEventListener('click', () => {
        if (!selected.contracts) return showToast('Lỗi', 'Chọn hợp đồng.', 'error');
        if (confirm('Xóa hợp đồng?')) {
            MockStore.deleteContracts([selected.contracts]);
            clearSelection('contracts');
            renderContracts();
            showToast('Thành công', 'Đã xóa.');
        }
    });

    modals.contract.querySelector('.btn-update')?.addEventListener('click', () => {
        if (!validateForm(modals.contract)) return;
        const custId = $('opContractCustomer').value;
        const cust = MockStore.getCustomers().find(c => c.id === custId);
        const payload = {
            customerId: custId,
            company: cust?.company || '',
            contact: cust?.contact || '',
            email: cust?.email || '',
            phone: cust?.phone || '',
            serviceLine: $('opContractService').value,
            value: parseInt($('opContractValue').value.replace(/\D/g, '')) || 0,
            start: $('opContractStart').value,
            end: $('opContractEnd').value,
            project: 'Dự án liên kết',
            ot: modals.contract.querySelector('input[type=checkbox]')?.checked || false,
            signed: true,
            status: $('opContractStatus')?.value || 'Đang hiệu lực'
        };
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

    modals.renew?.querySelector('.btn-update, #confirmRenewBtn')?.addEventListener('click', () => {
        if (selected.contracts) {
            MockStore.updateContract(selected.contracts, { status: 'Đã gia hạn', end: '2026-12-31' });
            showToast('Thành công', 'Đã gia hạn hợp đồng.');
        }
        close(modals.renew);
        renderContracts();
    });

    // ── Project CRUD ─────────────────────────────────────────────────────────
    $('openAddProjectModalBtn')?.addEventListener('click', () => {
        editing.projects = false;
        open(modals.project);
    });
    $('editProjectBtn')?.addEventListener('click', () => {
        if (!selected.projects) return showToast('Lỗi', 'Chọn dự án.', 'error');
        editing.projects = true;
        const p = getItem('projects', selected.projects);
        $('opProjName').value = p.name || '';
        $('opProjCustomer').value = p.company || '';
        $('opProjBudget').value = p.budget || '';
        $('opProjLeader').value = p.leader || '';
        $('opProjService').value = p.serviceLine || '';
        if ($('opProjectStatus')) $('opProjectStatus').value = p.status || 'Đang triển khai';
        open(modals.project);
    });
    $('deleteProjectBtn')?.addEventListener('click', () => {
        if (!selected.projects) return showToast('Lỗi', 'Chọn dự án.', 'error');
        if (confirm('Xóa dự án?')) {
            MockStore.deleteProjects([selected.projects]);
            clearSelection('projects');
            renderProjects();
            showToast('Thành công', 'Đã xóa.');
        }
    });

    modals.project.querySelector('.btn-update')?.addEventListener('click', () => {
        const payload = {
            name: $('opProjName')?.value || 'Dự án mới',
            company: $('opProjCustomer')?.value || '',
            leader: $('opProjLeader')?.value || '',
            serviceLine: $('opProjService')?.value || '',
            budget: parseInt($('opProjBudget')?.value?.replace(/\D/g, '')) || 0,
            start: $('opProjStart')?.value || '2025-01-01',
            end: $('opProjEnd')?.value || '2025-12-31',
            desc: '', progress: 10, status: $('opProjectStatus')?.value || 'Đang triển khai', revenue: 0
        };
        if (editing.projects) {
            MockStore.updateProject(selected.projects, payload);
            showToast('Thành công', 'Đã cập nhật dự án.');
        } else {
            MockStore.addProject(payload);
            showToast('Thành công', 'Đã tạo dự án.');
        }
        close(modals.project);
        renderProjects();
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

    // Đóng khi click nền overlay
    Object.values(modals).forEach(m => {
        m?.addEventListener('click', e => { if (e.target === m) close(m); });
    });

    // Đóng khi click icon X (class close-modal)
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const m = btn.closest('.modal-overlay');
            if (m) close(m);
        });
    });

    refreshContractCustomers();
    renderActive();
});
