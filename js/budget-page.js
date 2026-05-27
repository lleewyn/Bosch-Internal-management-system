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
        applySlFilter();
    }

    // ── Render: Mức độ tham gia ──────────────────────────────────────────────
    function renderParticipation() {
        // Repopulate project filter mỗi lần render
        const projSel = document.getElementById('filterPartProject');
        if (projSel) {
            const current = projSel.value;
            projSel.innerHTML = '<option value="">Tất cả dự án</option>';
            const projects = [...new Set(MockStore.getParticipation().map(p => p.project).filter(Boolean))];
            projects.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; projSel.appendChild(o); });
            projSel.value = current;
        }
        applyPartFilter();
    }

    // ── Render: Doanh thu dự án ──────────────────────────────────────────────
    function revBadge(status) {
        return UI.badge(status);
    }

    function renderRevenue() {
        // Repopulate company filter mỗi lần render
        const compSel = document.getElementById('filterRevCompany');
        if (compSel) {
            const current = compSel.value;
            compSel.innerHTML = '<option value="">Tất cả công ty</option>';
            const companies = [...new Set(MockStore.getProjects().map(p => p.company).filter(Boolean))];
            companies.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; compSel.appendChild(o); });
            compSel.value = current;
        }
        applyRevFilter();
    }

    // ── Filter logic ─────────────────────────────────────────────────────────
    function applySlFilter() {
        const term   = (svView.querySelector('.search-box input')?.value || '').toLowerCase();
        const status = document.getElementById('filterSlStatus')?.value || '';
        const sort   = document.getElementById('filterSlSort')?.value || '';

        const tbody = svView.querySelector('tbody');
        const items = MockStore.getServiceLines().slice();

        if (sort === 'rate-asc') {
            items.sort((a, b) => a.rate - b.rate);
        } else if (sort === 'rate-desc') {
            items.sort((a, b) => b.rate - a.rate);
        }

        tbody.innerHTML = items.map(s => {
            const alert = !s.active ? ' row-alert' : '';
            return `<tr data-id="${s.id}" style="cursor:pointer;" class="${selectedSlId === s.id ? 'selected-row' : ''}${alert}">
                <td class="code-col" style="text-align:center;">${UI.escape(s.id)}</td>
                <td class="name-col">${UI.escape(s.name)}</td>
                <td class="role-col">${UI.escape(s.desc)}</td>
                <td class="value-blue" style="text-align:center;">${UI.formatNumber(s.rate)}</td>
                <td style="text-align:center;">${s.contracts}</td>
                <td style="text-align:center;">${s.projects}</td>
                <td style="text-align:center;"><span class="badge ${s.active ? 'badge-success' : 'badge-muted'}">${s.active ? 'Hoạt động' : 'Ngừng'}</span></td>
            </tr>`;
        }).join('');

        // Re-bind events after re-render
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', (e) => {
                const id = tr.dataset.id;
                if (selectedSlId === id) { clearSl(); return; }
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                selectedSlId = id;
                showBadge('slSelectionBadge', `Đang chọn: ${id}`);
            });
        });

        const rows = [...tbody.querySelectorAll('tr')];
        rows.forEach(tr => {
            const text = tr.textContent.toLowerCase();
            const rowStatus = tr.querySelector('.badge')?.textContent || '';
            const matchSearch = !term || text.includes(term);
            const matchStatus = !status || rowStatus.includes(status);
            tr.style.display = matchSearch && matchStatus ? '' : 'none';
        });
    }

    function applyPartFilter() {
        const term    = (partView.querySelector('.search-box input')?.value || '').toLowerCase();
        const project = (document.getElementById('filterPartProject')?.value || '').toLowerCase();
        const ot      = document.getElementById('filterPartOt')?.value || '';
        const sort    = document.getElementById('filterPartSort')?.value || '';

        let data = MockStore.getParticipation().slice();
        if (sort === 'actual-desc') data.sort((a, b) => b.actual - a.actual);
        if (sort === 'actual-asc')  data.sort((a, b) => a.actual - b.actual);

        const tbody = partView.querySelector('tbody');
        tbody.innerHTML = data.map(p => {
            const actualCls = p.actual > 100 ? 'val-red' : 'val-green';
            const alert = p.actual > 100 ? ' row-alert' : '';

            // Thanh tiến độ + badge mức độ
            const pct = Math.min(p.actual, 100);
            let barColor, badgeLabel, badgeStyle, rowBg;
            if (p.actual > 90) {
                barColor   = '#dc2626';
                badgeLabel = 'QUÁ TẢI';
                badgeStyle = 'background:#fee2e2;color:#dc2626;';
                rowBg      = 'background:#fff5f5 !important;';
            } else if (p.actual > 70) {
                barColor   = '#f59e0b';
                badgeLabel = 'CAO';
                badgeStyle = 'background:#fef3c7;color:#d97706;';
                rowBg      = '';
            } else {
                barColor   = '#10b981';
                badgeLabel = 'ỔN ĐỊNH';
                badgeStyle = 'background:#d1fae5;color:#059669;';
                rowBg      = '';
            }
            const progressBar = `
                <div style="width:100%;background:#e5e7eb;border-radius:4px;height:6px;margin-bottom:6px;">
                    <div style="width:${pct}%;background:${barColor};height:6px;border-radius:4px;transition:width .3s;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${badgeStyle}">${badgeLabel}</span>
                    <span style="font-size:12px;font-weight:700;color:#374151;">${p.actual}%</span>
                </div>`;

            return `<tr data-id="${p.staffId}" style="cursor:pointer;${rowBg}" class="${selectedPartId === p.staffId ? 'selected-row' : ''}${alert}">
                <td class="code-col" style="text-align:center;">${UI.escape(p.staffId)}</td>
                <td class="name-col">${UI.escape(p.name)}</td>
                <td>${UI.escape(p.title)}</td>
                <td><span class="tag-project">${UI.escape(p.project)}</span></td>
                <td class="value-blue" style="text-align:center;">${p.planned}%</td>
                <td style="text-align:center;">${p.otHours > 0 ? `<span class="value-green">${p.otHours}h</span><span class="ot-highlight">OT</span>` : '—'}</td>
                <td style="padding:10px 16px;min-width:160px;">${progressBar}</td>
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

        tbody.querySelectorAll('tr').forEach(tr => {
            const text = tr.textContent.toLowerCase();
            const rowProject = tr.querySelectorAll('td')[3]?.textContent.toLowerCase() || '';
            const rowOtCell  = tr.querySelectorAll('td')[5]?.textContent || '';
            const hasOt = rowOtCell.includes('h') && !rowOtCell.includes('—');
            const matchSearch  = !term    || text.includes(term);
            const matchProject = !project || rowProject.includes(project);
            const matchOt = !ot || (ot === 'ot' ? hasOt : !hasOt);
            tr.style.display = matchSearch && matchProject && matchOt ? '' : 'none';
        });
    }

    function applyRevFilter() {
        const term    = (revView.querySelector('.search-box input')?.value || '').toLowerCase();
        const status  = (document.getElementById('filterRevStatus')?.value || '').toLowerCase();
        const company = (document.getElementById('filterRevCompany')?.value || '').toLowerCase();
        const sort    = document.getElementById('filterRevSort')?.value || '';

        let data = MockStore.getProjects().slice();
        if (sort === 'revenue-desc') data.sort((a, b) => (b.revenue||0) - (a.revenue||0));
        if (sort === 'revenue-asc')  data.sort((a, b) => (a.revenue||0) - (b.revenue||0));
        if (sort === 'progress-desc') data.sort((a, b) => b.progress - a.progress);
        if (sort === 'progress-asc')  data.sort((a, b) => a.progress - b.progress);

        const tbody = revView.querySelector('tbody');
        tbody.innerHTML = data.map(p => {
            const alertStatuses = ['Tạm dừng', 'Đã hủy'];
            const alert = alertStatuses.includes(p.status) ? ' row-alert' : '';
            return `<tr data-id="${p.id}" style="cursor:pointer;" class="${selectedRevId === p.id ? 'selected-row' : ''}${alert}">
                <td class="code-col" style="text-align:center;">${UI.escape(p.id)}</td>
                <td class="name-col">${UI.escape(p.name)}</td>
                <td>${UI.escape(p.company)}</td>
                <td><span class="tag-project">${UI.escape(p.serviceLine)}</span></td>
                <td style="text-align:center;">${revBadge(p.status)}</td>
                <td style="text-align:center;">${MockStore.getProjectAssignments ? MockStore.getProjectAssignments(p.id).length : 0}</td>
                <td style="text-align:center;">
                    <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                        <div style="width:50px;height:5px;background:#eee;border-radius:3px;overflow:hidden;">
                            <div style="width:${p.progress}%;height:100%;background:${p.progress>=70?'#28a745':'#f58220'};border-radius:3px;"></div>
                        </div>
                        <span style="font-size:12px;font-weight:700;">${p.progress}%</span>
                    </div>
                </td>
                <td class="value-blue" style="text-align:center;">${UI.formatNumber(p.revenue || 0)}</td>
            </tr>`;
        }).join('');

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

        tbody.querySelectorAll('tr').forEach(tr => {
            const text       = tr.textContent.toLowerCase();
            const rowStatus  = tr.querySelectorAll('td')[4]?.textContent.toLowerCase() || '';
            const rowCompany = tr.querySelectorAll('td')[2]?.textContent.toLowerCase() || '';
            const matchSearch  = !term    || text.includes(term);
            const matchStatus  = !status  || rowStatus.includes(status);
            const matchCompany = !company || rowCompany.includes(company);
            tr.style.display = matchSearch && matchStatus && matchCompany ? '' : 'none';
        });
    }

    // Bind search inputs
    svView.querySelector('.search-box input')?.addEventListener('input', applySlFilter);
    partView.querySelector('.search-box input')?.addEventListener('input', applyPartFilter);
    revView.querySelector('.search-box input')?.addEventListener('input', applyRevFilter);

    // Bind filter selects
    ['filterSlStatus','filterSlSort'].forEach(id => document.getElementById(id)?.addEventListener('change', applySlFilter));
    ['filterPartProject','filterPartOt','filterPartSort'].forEach(id => document.getElementById(id)?.addEventListener('change', applyPartFilter));
    ['filterRevStatus','filterRevCompany','filterRevSort'].forEach(id => document.getElementById(id)?.addEventListener('change', applyRevFilter));

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
        const sl = MockStore.getServiceLines().find(x => x.id === selectedSlId);
        if (!sl) return;
        if (sl.active) {
            return showToast('Không thể xóa', 'Chỉ được xóa dòng dịch vụ có trạng thái "Ngừng".', 'error');
        }
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
        partModal.classList.add('show');
    }

    $('editPartBtn')?.addEventListener('click', () => {
        if (!selectedPartId) return showToast('Lỗi', 'Chọn nhân sự trước.', 'error');
        openPartModal();
    });

    $('savePartModal')?.addEventListener('click', () => {
        if (!validateForm(document.getElementById('participationForm'))) return;
        const planned = parseInt($('partPlanned').value) || 0;
        MockStore.updateParticipation(selectedPartId, { planned });
        // Sync workload nhân sự tương ứng
        const p = MockStore.getParticipation().find(x => x.staffId === selectedPartId);
        if (p) MockStore.updateStaff(selectedPartId, { workload: Math.min(100, planned) });
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

    // ── Render active ────────────────────────────────────────────────────────
    function renderActive() {
        if (activeTab === 'serviceLine')   renderServiceLines();
        else if (activeTab === 'participation') renderParticipation();
        else renderRevenue();
    }

    renderActive();
});
