/**
 * Ngân sách — 3 tab đầy đủ CRUD / cập nhật
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.MockStore || !window.PageCommon) return;
    PageCommon.injectFormStyles();

    const svView = document.getElementById('serviceLineView');
    const partView = document.getElementById('participationView');
    const revView = document.getElementById('revenueView');
    const slModal = document.getElementById('serviceLineModal');
    const partModal = document.getElementById('participationModal');

    let activeTab = 'serviceLine';
    let selectedSlId = null;
    let selectedPartId = null;
    let editSl = false;

    PageCommon.bindTabs('.bosch-tab', {
        serviceLine: svView,
        participation: partView,
        revenue: revView
    }, (tab) => {
        activeTab = tab;
        renderActive();
    });

    function renderServiceLines() {
        const tbody = svView.querySelector('tbody');
        tbody.innerHTML = MockStore.getServiceLines()
            .map(
                (s) => `
            <tr data-id="${s.id}" style="cursor:pointer;">
                <td class="code-col">${UI.escape(s.id)}</td>
                <td class="name-col">${UI.escape(s.name)}</td>
                <td class="role-col">${UI.escape(s.desc)}</td>
                <td class="value-blue">${UI.formatNumber(s.rate)}</td>
                <td>${s.contracts}</td>
                <td>${s.projects}</td>
                <td><span class="badge ${s.active ? 'badge-success' : 'badge-secondary'}">${s.active ? 'Hoạt động' : 'Ngừng'}</span></td>
                <td><i class="fa-regular fa-pen-to-square edit-icon-btn" data-edit="${s.id}" style="cursor:pointer;"></i></td>
            </tr>`
            )
            .join('');
        PageCommon.bindRowSelect(tbody, (id) => {
            selectedSlId = id;
            PageCommon.showSelectionBadge(svView, `Đang chọn: ${id}`);
        });
        tbody.querySelectorAll('[data-edit]').forEach((icon) => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedSlId = icon.dataset.edit;
                openSlModal(true);
            });
        });
        PageCommon.filterTableRows(svView, svView.querySelector('.search-box input')?.value);
    }

    function renderParticipation() {
        const tbody = partView.querySelector('tbody');
        tbody.innerHTML = MockStore.getParticipation()
            .map(
                (p) => `
            <tr data-id="${p.staffId}" style="cursor:pointer;">
                <td class="code-col">${UI.escape(p.staffId)}</td>
                <td class="name-col">${UI.escape(p.name)}</td>
                <td>${UI.escape(p.title)}</td>
                <td>${UI.escape(p.project)}</td>
                <td class="value-blue">${p.planned}%</td>
                <td class="value-green">${p.otHours}h</td>
                <td>${p.actual}%</td>
            </tr>`
            )
            .join('');
        PageCommon.bindRowSelect(tbody, (id) => {
            selectedPartId = id;
            const p = MockStore.getParticipation().find((x) => x.staffId === id);
            PageCommon.showSelectionBadge(partView, p ? `Đang chọn: ${p.name}` : null);
        });
        PageCommon.filterTableRows(partView, partView.querySelector('.search-box input')?.value);
    }

    function renderRevenue() {
        const tbody = revView.querySelector('tbody');
        tbody.innerHTML = MockStore.getProjects()
            .map(
                (p) => `
            <tr data-id="${p.id}" style="cursor:pointer;">
                <td class="code-col">${UI.escape(p.id)}</td>
                <td class="name-col">${UI.escape(p.name)}</td>
                <td>${UI.escape(p.company)}</td>
                <td><span class="tag-project">${UI.escape(p.serviceLine)}</span></td>
                <td><span class="badge badge-info">${UI.escape(p.status)}</span></td>
                <td>1</td>
                <td class="value-green">${Math.max(1, Math.round((p.revenue || 0) / 1500000))}h</td>
                <td class="value-blue">${UI.formatNumber(p.revenue || 0)}</td>
            </tr>`
            )
            .join('');
        PageCommon.bindRowSelect(tbody, (id) => {
            PageCommon.showSelectionBadge(revView, `Đang chọn: ${id}`);
        });
        PageCommon.filterTableRows(revView, revView.querySelector('.search-box input')?.value);
    }

    function openSlModal(edit) {
        editSl = edit;
        const s = edit ? MockStore.getServiceLines().find((x) => x.id === selectedSlId) : null;
        const inputs = slModal.querySelectorAll('input.custom-input');
        inputs[0].value = s?.name || '';
        slModal.querySelector('textarea').value = s?.desc || '';
        if (inputs[1]) inputs[1].value = s?.rate || '';
        slModal.querySelector('#statusCheck').checked = s ? s.active : true;
        slModal.classList.add('show');
    }

    function openPartModal() {
        const p = MockStore.getParticipation().find((x) => x.staffId === selectedPartId);
        if (!p) return;
        document.getElementById('partStaffName').value = `${p.name} (${p.staffId})`;
        document.getElementById('partPlanned').value = p.planned;
        document.getElementById('partOt').value = p.otHours;
        document.getElementById('partActual').value = p.actual;
        partModal.classList.add('show');
    }

    document.getElementById('openAddServiceLineBtn')?.addEventListener('click', () => {
        selectedSlId = null;
        openSlModal(false);
    });

    svView.querySelectorAll('.btn-action').forEach((btn) => {
        if (btn.textContent.includes('Sửa')) {
            btn.addEventListener('click', () => {
                if (!selectedSlId) return showToast('Lỗi', 'Chọn dòng dịch vụ.', 'error');
                openSlModal(true);
            });
        }
        if (btn.textContent.includes('Xóa')) {
            btn.addEventListener('click', () => {
                if (selectedSlId && confirm('Xóa dòng dịch vụ?')) {
                    MockStore.deleteServiceLines([selectedSlId]);
                    selectedSlId = null;
                    renderServiceLines();
                    showToast('Thành công', 'Đã xóa.');
                }
            });
        }
    });

    partView.querySelectorAll('.btn-action').forEach((btn) => {
        if (btn.textContent.includes('Sửa')) {
            btn.addEventListener('click', () => {
                if (!selectedPartId) return showToast('Lỗi', 'Chọn nhân sự.', 'error');
                openPartModal();
            });
        }
        if (btn.textContent.includes('Cập nhật')) {
            btn.addEventListener('click', () => {
                if (!selectedPartId) return showToast('Lỗi', 'Chọn nhân sự.', 'error');
                openPartModal();
            });
        }
    });

    revView.querySelectorAll('.btn-action').forEach((btn) => {
        if (btn.textContent.includes('Cập nhật')) {
            btn.addEventListener('click', () => {
                MockStore.recalcBudgetFromProjects();
                showToast('Thành công', 'Đã đồng bộ doanh thu từ dự án vận hành.');
                renderRevenue();
                renderParticipation();
            });
        }
    });

    document.getElementById('saveServiceLineBtn')?.addEventListener('click', () => {
        if (!validateForm(slModal)) return;
        const inputs = slModal.querySelectorAll('input.custom-input');
        const payload = {
            name: inputs[0].value.trim(),
            desc: slModal.querySelector('textarea').value.trim(),
            rate: parseInt(inputs[1]?.value.replace(/\D/g, '')) || 1000000,
            active: slModal.querySelector('#statusCheck').checked
        };
        if (editSl && selectedSlId) {
            MockStore.updateServiceLine(selectedSlId, payload);
            showToast('Thành công', 'Đã cập nhật dòng dịch vụ.');
        } else {
            MockStore.addServiceLine({ ...payload, contracts: 0, projects: 0 });
            showToast('Thành công', 'Đã tạo dòng dịch vụ.');
        }
        slModal.classList.remove('show');
        renderServiceLines();
    });

    document.getElementById('savePartModal')?.addEventListener('click', () => {
        if (!validateForm(document.getElementById('participationForm'))) return;
        MockStore.updateParticipation(selectedPartId, {
            planned: parseInt(document.getElementById('partPlanned').value) || 0,
            otHours: parseInt(document.getElementById('partOt').value) || 0,
            actual: parseInt(document.getElementById('partActual').value) || 0
        });
        const s = MockStore.getStaff().find((x) => x.id === selectedPartId);
        if (s) MockStore.updateStaff(selectedPartId, { workload: parseInt(document.getElementById('partActual').value) || 0 });
        partModal.classList.remove('show');
        showToast('Thành công', 'Đã cập nhật mức tham gia.');
        renderParticipation();
    });

    document.getElementById('closeServiceLineModal')?.addEventListener('click', () => slModal.classList.remove('show'));
    document.getElementById('cancelServiceLineBtn')?.addEventListener('click', () => slModal.classList.remove('show'));
    document.getElementById('closePartModal')?.addEventListener('click', () => partModal.classList.remove('show'));
    document.getElementById('cancelPartModal')?.addEventListener('click', () => partModal.classList.remove('show'));

    [svView, partView, revView].forEach((v) => {
        v?.querySelector('.search-box input')?.addEventListener('input', () => {
            if (v === svView) renderServiceLines();
            else if (v === partView) renderParticipation();
            else renderRevenue();
        });
        const badge = v.querySelector('.op-box-actions > div');
        if (badge) badge.classList.add('op-badge-selection');
    });

    function renderActive() {
        if (activeTab === 'serviceLine') renderServiceLines();
        else if (activeTab === 'participation') renderParticipation();
        else renderRevenue();
    }

    renderActive();
});
