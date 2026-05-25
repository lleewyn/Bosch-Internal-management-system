/**
 * Ngân sách — 3 tab: Dòng dịch vụ, Mức độ tham gia, Doanh thu dự án
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.MockStore || !window.PageCommon) return;
    PageCommon.injectFormStyles();

    const svView   = document.getElementById('serviceLineView');
    const partView = document.getElementById('participationView');
    const revView  = document.getElementById('revenueView');
    const slModal  = document.getElementById('serviceLineModal');
    const partModal = document.getElementById('participationModal');

    const $ = (id) => document.getElementById(id);

    let activeTab     = 'serviceLine';
    let selectedSlId  = null;
    let selectedPartId = null;
    let selectedRevId  = null;
    let editSl = false;

    // ── Tab switching ────────────────────────────────────────────────────────
    PageCommon.bindTabs('.bosch-tab', {
        serviceLine:   svView,
        participation: partView,
        revenue:       revView
    }, (tab) => {
        activeTab = tab;
        renderActive();
    });

    // ── Badge helpers ────────────────────────────────────────────────────────
    function showBadge(badgeId, text) {
        const b = $(badgeId);
        if (!b) return;
        if (text) { b.textContent = text; b.style.display = 'block'; }
        else b.style.display = 'none';
    }

    function clearSl()   { selectedSlId   = null; svView.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected-row')); showBadge('slSelectionBadge',   null); }
    function clearPart() { selectedPartId = null; partView.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected-row')); showBadge('partSelectionBadge', null); }
    function clearRev()  { selectedRevId  = null; revView.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected-row')); showBadge('revSelectionBadge',  null); }

    // ── Render: Dòng dịch vụ ────────────────────────────────────────────────
    function renderServiceLines() {
        const tbody = svView.querySelector('tbody');
        tbody.innerHTML = MockStore.getServiceLines().map(s => `
            <tr data-id="${s.id}" style="cursor:pointer;" class="${selectedSlId === s.id ? 'selected-row' : ''}">
                <td class="code-col">${UI.escape(s.id)}</td>
                <td class="name-col">${UI.escape(s.name)}</td>
                <td class="role-col">${UI.escape(s.desc)}</td>
                <td class="value-blue">${UI.formatNumber(s.rate)}</td>
                <td>${s.contracts}</td>
                <td>${s.projects}</td>
                <td><span class="badge ${s.active ? 'badge-success' : 'badge-secondary'}">${s.active ? 'Hoạt động' : 'Ngừng'}</span></td>
                <td><i class="fa-regular fa-pen-to-square edit-icon-btn" data-edit="${s.id}" style="cursor:pointer;"></i></td>
            </tr>`).join('');

        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', (e) => {
                if (e.target.closest('[data-edit]')) return;
                const id = tr.dataset.id;
                if (selectedSlId === id) { clearSl(); return; }
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                selectedSlId = id;
                showBadge('slSelectionBadge', `Đang chọn: ${id}`);
            });
        });
        tbody.querySelectorAll('[data-edit]').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedSlId = icon.dataset.edit;
                openSlModal(true);
            });
        });
        applySlFilter();
    }

    // ── Render: Mức độ tham gia ──────────────────────────────────────────────
    function renderParticipation() {
        const tbody = partView.querySelector('tbody');
        tbody.innerHTML = MockStore.getParticipation().map(p => {
            const actualCls = p.actual > 100 ? 'val-red' : 'val-green';
            return `<tr data-id="${p.staffId}" style="cursor:pointer;" class="${selectedPartId === p.staffId ? 'selected-row' : ''}">
                <td class="code-col">${UI.escape(p.staffId)}</td>
                <td class="name-col">${UI.escape(p.name)}</td>
                <td>${UI.escape(p.title)}</td>
                <td><span class="tag-project">${UI.escape(p.project)}</span></td>
                <td class="value-blue">${p.planned}%</td>
                <td>${p.otHours > 0 ? `<span class="value-green">${p.otHours}h</span><span class="ot-highlight">OT</span>` : '—'}</td>
                <td><span class="${actualCls}">${p.actual}%</span></td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selectedPartId === id) { clearPart(); return; }
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                selectedPartId = id;
                const p = MockStore.getParticipation().find(x => x.staffId === id);
                showBadge('partSelectionBadge', p ? `Đang chọn: ${p.name}` : null);
            });
        });
        applyPartFilter();
    }

    // ── Render: Doanh thu dự án ──────────────────────────────────────────────
    function revBadge(status) {
        const ok = ['Đang triển khai', 'Hoàn thành'].includes(status);
        const warn = ['Tạm dừng'].includes(status);
        const cls = ok ? 'badge-success' : warn ? 'badge-warning' : 'badge-secondary';
        return `<span class="badge ${cls}">${UI.escape(status)}</span>`;
    }

    function renderRevenue() {
        const tbody = revView.querySelector('tbody');
        tbody.innerHTML = MockStore.getProjects().map(p => `
            <tr data-id="${p.id}" style="cursor:pointer;" class="${selectedRevId === p.id ? 'selected-row' : ''}">
                <td class="code-col">${UI.escape(p.id)}</td>
                <td class="name-col">${UI.escape(p.name)}</td>
                <td>${UI.escape(p.company)}</td>
                <td><span class="tag-project">${UI.escape(p.serviceLine)}</span></td>
                <td>${revBadge(p.status)}</td>
                <td>1</td>
                <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div style="width:50px;height:5px;background:#eee;border-radius:3px;overflow:hidden;">
                            <div style="width:${p.progress}%;height:100%;background:${p.progress>=70?'#28a745':'#f58220'};border-radius:3px;"></div>
                        </div>
                        <span style="font-size:12px;font-weight:700;">${p.progress}%</span>
                    </div>
                </td>
                <td class="value-blue">${UI.formatNumber(p.revenue || 0)}</td>
            </tr>`).join('');

        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selectedRevId === id) { clearRev(); return; }
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                selectedRevId = id;
                const p = MockStore.getProjects().find(x => x.id === id);
                showBadge('revSelectionBadge', p ? `Đang chọn: ${p.name}` : null);
            });
        });
        applyRevFilter();
    }

    // ── Filter logic ─────────────────────────────────────────────────────────
    function applySlFilter() {
        const term = (svView.querySelector('.search-box input')?.value || '').toLowerCase();
        svView.querySelectorAll('tbody tr').forEach(tr => {
            tr.style.display = !term || tr.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    }
    function applyPartFilter() {
        const term = (partView.querySelector('.search-box input')?.value || '').toLowerCase();
        partView.querySelectorAll('tbody tr').forEach(tr => {
            tr.style.display = !term || tr.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    }
    function applyRevFilter() {
        const term = (revView.querySelector('.search-box input')?.value || '').toLowerCase();
        revView.querySelectorAll('tbody tr').forEach(tr => {
            tr.style.display = !term || tr.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    }

    svView.querySelector('.search-box input')?.addEventListener('input', applySlFilter);
    partView.querySelector('.search-box input')?.addEventListener('input', applyPartFilter);
    revView.querySelector('.search-box input')?.addEventListener('input', applyRevFilter);

    // ── Modal: Dòng dịch vụ ──────────────────────────────────────────────────
    function openSlModal(edit) {
        editSl = edit;
        const s = edit ? MockStore.getServiceLines().find(x => x.id === selectedSlId) : null;
        slModal.querySelector('h3').innerHTML = edit
            ? '<i class="fa-regular fa-pen-to-square" style="margin-right:8px;"></i> SỬA DÒNG DỊCH VỤ'
            : '<i class="fa-solid fa-plus" style="margin-right:8px;"></i> TẠO MỚI DÒNG DỊCH VỤ';
        const inputs = slModal.querySelectorAll('input.custom-input');
        inputs[0].value = s?.name || '';
        slModal.querySelector('textarea').value = s?.desc || '';
        if (inputs[1]) inputs[1].value = s?.rate || '';
        slModal.querySelector('#statusCheck').checked = s ? s.active : true;
        slModal.classList.add('show');
    }

    $('openAddServiceLineBtn')?.addEventListener('click', () => { selectedSlId = null; openSlModal(false); });
    $('editServiceLineBtn')?.addEventListener('click', () => {
        if (!selectedSlId) return showToast('Lỗi', 'Chọn dòng dịch vụ trước.', 'error');
        openSlModal(true);
    });
    $('deleteServiceLineBtn')?.addEventListener('click', () => {
        if (!selectedSlId) return showToast('Lỗi', 'Chọn dòng dịch vụ trước.', 'error');
        if (confirm('Xóa dòng dịch vụ đã chọn?')) {
            MockStore.deleteServiceLines([selectedSlId]);
            clearSl();
            renderServiceLines();
            showToast('Thành công', 'Đã xóa dòng dịch vụ.');
        }
    });

    $('saveServiceLineBtn')?.addEventListener('click', () => {
        if (!validateForm(slModal)) return;
        const inputs = slModal.querySelectorAll('input.custom-input');
        const payload = {
            name: inputs[0].value.trim(),
            desc: slModal.querySelector('textarea').value.trim(),
            rate: parseInt((inputs[1]?.value || '').replace(/\D/g, '')) || 1000000,
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

    $('closeServiceLineModal')?.addEventListener('click', () => slModal.classList.remove('show'));
    $('cancelServiceLineBtn')?.addEventListener('click', () => slModal.classList.remove('show'));
    slModal?.addEventListener('click', e => { if (e.target === slModal) slModal.classList.remove('show'); });

    // ── Modal: Mức độ tham gia ───────────────────────────────────────────────
    function openPartModal() {
        const p = MockStore.getParticipation().find(x => x.staffId === selectedPartId);
        if (!p) return;
        $('partStaffName').value = `${p.name} (${p.staffId})`;
        $('partPlanned').value = p.planned;
        $('partOt').value = p.otHours;
        $('partActual').value = p.actual;
        partModal.classList.add('show');
    }

    $('editPartBtn')?.addEventListener('click', () => {
        if (!selectedPartId) return showToast('Lỗi', 'Chọn nhân sự trước.', 'error');
        openPartModal();
    });
    $('updatePartBtn')?.addEventListener('click', () => {
        if (!selectedPartId) return showToast('Lỗi', 'Chọn nhân sự trước.', 'error');
        openPartModal();
    });

    $('savePartModal')?.addEventListener('click', () => {
        if (!validateForm(document.getElementById('participationForm'))) return;
        MockStore.updateParticipation(selectedPartId, {
            planned:  parseInt($('partPlanned').value) || 0,
            otHours:  parseInt($('partOt').value) || 0,
            actual:   parseInt($('partActual').value) || 0
        });
        const s = MockStore.getStaff().find(x => x.id === selectedPartId);
        if (s) MockStore.updateStaff(selectedPartId, { workload: parseInt($('partActual').value) || 0 });
        partModal.classList.remove('show');
        showToast('Thành công', 'Đã cập nhật mức tham gia.');
        renderParticipation();
    });

    $('closePartModal')?.addEventListener('click', () => partModal.classList.remove('show'));
    $('cancelPartModal')?.addEventListener('click', () => partModal.classList.remove('show'));
    partModal?.addEventListener('click', e => { if (e.target === partModal) partModal.classList.remove('show'); });

    // ── Doanh thu: Đồng bộ ──────────────────────────────────────────────────
    $('syncRevenueBtn')?.addEventListener('click', () => {
        MockStore.recalcBudgetFromProjects();
        showToast('Thành công', 'Đã đồng bộ doanh thu từ dự án vận hành.');
        renderRevenue();
        renderParticipation();
    });
    $('editRevenueBtn')?.addEventListener('click', () => {
        if (!selectedRevId) return showToast('Lỗi', 'Chọn dự án trước.', 'error');
        showToast('Thông tin', 'Chỉnh sửa doanh thu qua trang Vận hành → Dự án.', 'error');
    });

    // ── Render active ────────────────────────────────────────────────────────
    function renderActive() {
        if (activeTab === 'serviceLine')   renderServiceLines();
        else if (activeTab === 'participation') renderParticipation();
        else renderRevenue();
    }

    renderActive();
});
