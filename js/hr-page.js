/**
 * HR — CRUD nhân sự & lộ trình từ MockStore
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.MockStore) {
        console.error('[HR] MockStore chưa tải');
        return;
    }

    const dirTable = document.getElementById('directoryTable');
    const roadTable = document.getElementById('roadmapTable');
    const dirControls = document.getElementById('directoryControls');
    const roadControls = document.getElementById('roadmapControls');
    const addModal = document.getElementById('addStaffModal');
    const assignModal = document.getElementById('assignProjectModal');
    const drawer = document.getElementById('hrDrawer');
    const drawerOverlay = document.getElementById('hrDrawerOverlay');

    const $ = (id) => document.getElementById(id);

    let editingId = null;
    let selectedId = null;

    const TEAMS = {
        A: ['Team X-Engine', 'Team UI', 'Team Cloud'],
        B: ['Team X-Engine', 'Team Cloud', 'Team BA'],
        C: ['Team UI', 'Team BA', 'Team PM'],
        D: ['Team PM', 'Team BA']
    };

    const MANAGERS = ['Jackson Nguyen', 'Maria Schmidt', 'David Chen', 'Frank Miller'];

    PageCommon.injectFormStyles();
    const style = document.createElement('style');
    style.textContent = `
        tr.selected td { border-top: 1px solid #0078d4; border-bottom: 1px solid #0078d4; }
        #addStaffModal .bosch-modal-content { width: 560px; max-width: 95vw; }
        #addStaffModal .bosch-modal-body { max-height: 70vh; overflow-y: auto; }
    `;
    document.head.appendChild(style);

    const roadmapModal = document.getElementById('roadmapModal');
    let activeHrTab = 'directory';

    function populateGroupOptions() {
        const groupSel = $('staffGroup');
        if (!groupSel) return;
        const groups = MockStore.getOrgGroups();
        groupSel.innerHTML =
            '<option value="">-- Chọn Group --</option>' +
            groups.map((g) => `<option value="${UI.escape(g.id)}">${UI.escape(g.name)}</option>`).join('');
        if (groups.length === 0) {
            ['A', 'B', 'C', 'D'].forEach((g) => {
                groupSel.innerHTML += `<option value="${g}">Group ${g}</option>`;
            });
        }
    }

    function groupLetter(groupKey) {
        const raw = String(groupKey || '').trim();
        if (/^[A-D]$/i.test(raw)) return raw.toUpperCase();
        const m = raw.match(/([A-D])$/i) || raw.match(/group\s*([A-D])/i);
        return m ? m[1].toUpperCase() : 'A';
    }

    function populateTeamOptions(groupKey) {
        const teamSel = $('staffTeam');
        if (!teamSel) return;
        const letter = groupLetter(groupKey);
        const catalog = MockStore.get().teamsCatalog || TEAMS;
        const teams = catalog[letter] || TEAMS[letter] || TEAMS.A;
        teamSel.innerHTML =
            '<option value="">-- Chọn Team --</option>' +
            teams.map((t) => `<option value="${UI.escape(t)}">${UI.escape(t)}</option>`).join('');
    }

    function populateManagerOptions() {
        const mgrSel = $('staffManager');
        if (!mgrSel) return;
        const leads = [...new Set([...MANAGERS, ...MockStore.getStaff().map((s) => s.manager).filter(Boolean)])];
        mgrSel.innerHTML =
            '<option value="">-- Chọn quản lý --</option>' +
            leads.map((m) => `<option value="${UI.escape(m)}">${UI.escape(m)}</option>`).join('');
    }

    function populateAssignProjects() {
        const sel = $('assignProject');
        if (!sel) return;
        sel.innerHTML =
            '<option value="">-- Chọn dự án --</option>' +
            MockStore.getProjects()
                .map((p) => `<option value="${UI.escape(p.name)}">${UI.escape(p.name)}</option>`)
                .join('');
    }

    function resetStaffForm() {
        $('staffFullName').value = '';
        $('staffBirthDate').value = '';
        $('staffTitle').value = '';
        $('staffGroup').value = '';
        populateTeamOptions('');
        $('staffTeam').value = '';
        $('staffManager').value = '';
        addModal.querySelectorAll('.hr-form-input, .hr-form-select').forEach((el) => {
            el.style.borderColor = '';
        });
    }

    function fillStaffForm(s) {
        $('staffFullName').value = s.name || '';
        $('staffBirthDate').value = s.birthDate || '';
        $('staffTitle').value = s.title || '';
        const letter = groupLetter(s.group);
        const groupOpt = $(`staffGroup option[value="g-${letter.toLowerCase()}"]`);
        $('staffGroup').value = groupOpt ? `g-${letter.toLowerCase()}` : $('staffGroup').value;
        populateTeamOptions(letter);
        $('staffTeam').value = s.team || '';
        $('staffManager').value = s.manager || '';
    }

    function readStaffForm() {
        const groupVal = $('staffGroup').value;
        const letter = groupLetter(groupVal || $('staffGroup').selectedOptions[0]?.textContent);
        return {
            name: $('staffFullName').value.trim(),
            birthDate: $('staffBirthDate').value,
            title: $('staffTitle').value,
            group: letter,
            team: $('staffTeam').value,
            manager: $('staffManager').value,
            project: 'Chưa gán dự án',
            workload: 0
        };
    }

    function openAddModal(isEdit = false) {
        populateGroupOptions();
        populateManagerOptions();
        populateTeamOptions();
        if (!isEdit) resetStaffForm();
        addModal.querySelector('h3').textContent = isEdit
            ? 'Sửa thông tin nhân sự'
            : 'Tiếp nhận nhân sự mới';
        $('saveAddModalBtn').textContent = isEdit ? 'Cập nhật' : 'Lưu';
        addModal.classList.add('show');
    }

    function closeAddModal() {
        addModal.classList.remove('show');
        editingId = null;
    }

    $('staffGroup')?.addEventListener('change', (e) => {
        populateTeamOptions(e.target.value || e.target.selectedOptions[0]?.textContent);
        $('staffTeam').value = '';
    });

    document.querySelectorAll('.bosch-tab').forEach((tab) => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.bosch-tab').forEach((t) => t.classList.remove('active'));
            e.target.classList.add('active');
            activeHrTab = e.target.dataset.tab;
            dirControls.style.display = activeHrTab === 'directory' ? 'flex' : 'none';
            roadControls.style.display = activeHrTab === 'roadmap' ? 'flex' : 'none';
            dirTable.style.display = activeHrTab === 'directory' ? 'table' : 'none';
            roadTable.style.display = activeHrTab === 'roadmap' ? 'table' : 'none';
            selectedId = null;
            applyFilters();
            if (activeHrTab === 'roadmap') applyRoadmapFilters();
        });
    });

    function workloadRow(s) {
        const b = UI.workloadBadge(s.workload);
        const col = UI.progressColor(s.workload);
        return `<div class="workload-col">
            <div class="progress-bar-container"><div class="progress-fill ${col}" style="width:${s.workload}%;"></div></div>
            <div class="workload-info"><span class="badge ${b.cls}">${b.text}</span><span class="percent-text">${s.workload}%</span></div>
        </div>`;
    }

    function renderDirectory() {
        const tbody = dirTable.querySelector('tbody');
        const all = MockStore.getStaff();

        tbody.innerHTML = all
            .map(
                (s) => `
            <tr data-id="${s.id}" class="${selectedId === s.id ? 'selected' : ''}" style="cursor:pointer;">
                <td class="code-col">${UI.escape(s.id)}</td>
                <td class="name-col">${UI.escape(s.name)}</td>
                <td class="role-col">${UI.escape(s.title)}</td>
                <td class="project-col">${UI.escape(s.project)}</td>
                <td>${workloadRow(s)}</td>
            </tr>`
            )
            .join('');

        tbody.querySelectorAll('tr').forEach((tr) => {
            tr.addEventListener('click', () => {
                selectedId = tr.dataset.id;
                tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('selected'));
                tr.classList.add('selected');
                openDrawer(selectedId);
            });
        });
    }

    function roadmapStatusBadge(status) {
        if (status === 'Hoàn thành') return 'badge-success';
        if (status === 'Đang học') return 'badge-info';
        return 'badge-warning';
    }

    function renderRoadmap() {
        const tbody = roadTable.querySelector('tbody');
        tbody.innerHTML = MockStore.getRoadmap()
            .map(
                (r) => {
                    // dùng courseId nếu có (entry mới), ngược lại dùng staffId
                    const rowKey = r.courseId || r.id;
                    return `
            <tr data-id="${rowKey}" data-staff-id="${r.id}" style="cursor:pointer;" class="${selectedId === rowKey ? 'selected-row' : ''}">
                <td class="code-col">${UI.escape(r.id)}</td>
                <td class="name-col">${UI.escape(r.name)}</td>
                <td class="role-col">${UI.escape(r.title)}</td>
                <td>${UI.escape(r.level)}</td>
                <td>${UI.escape(r.course)}</td>
                <td style="text-align:center;"><span class="badge ${roadmapStatusBadge(r.status)}">${UI.escape(r.status)}</span></td>
            </tr>`;
                }
            )
            .join('');
        // Bind row click với toggle (click lại để bỏ chọn)
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                const badge = document.getElementById('roadmapSelectionBadge');
                if (selectedId === id) {
                    selectedId = null;
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    if (badge) { badge.classList.remove('visible'); badge.style.display = 'none'; }
                } else {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    tr.classList.add('selected-row');
                    selectedId = id;
                    // Tìm entry theo courseId hoặc staffId
                    const staffId = tr.dataset.staffId;
                    const r = MockStore.getRoadmap().find(x => (x.courseId || x.id) === id) ||
                              MockStore.getRoadmap().find(x => x.id === staffId);
                    if (badge && r) {
                        badge.classList.add('visible');
                        badge.style.display = 'block';
                        badge.textContent = `Đang chọn: ${r.name} — ${r.course}`;
                    }
                }
            });
        });
        applyRoadmapFilters();
    }

    function applyRoadmapFilters() {
        const level = document.getElementById('roadFilterLevel')?.value || '';
        const status = document.getElementById('roadFilterStatus')?.value || '';
        const term = (roadControls?.querySelector('.search-box input')?.value || '').toLowerCase();
        roadTable.querySelectorAll('tbody tr').forEach((tr) => {
            const text = tr.textContent.toLowerCase();
            const matchSearch = !term || text.includes(term);
            const cells = tr.querySelectorAll('td');
            const rowLevel = cells[3]?.textContent || '';
            const rowStatus = cells[5]?.textContent || '';
            const matchLevel = !level || rowLevel.includes(level);
            const matchStatus = !status || rowStatus.includes(status);
            tr.style.display = matchSearch && matchLevel && matchStatus ? '' : 'none';
        });
    }

    function applyFilters() {
        const active = dirTable.style.display !== 'none' ? dirTable : roadTable;
        const controls = active === dirTable ? dirControls : roadControls;
        const term = (controls?.querySelector('.search-box input')?.value || '').toLowerCase();
        active.querySelectorAll('tbody tr').forEach((tr) => {
            tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    }

    dirControls?.querySelector('.search-box input')?.addEventListener('input', applyFilters);
    roadControls?.querySelector('.search-box input')?.addEventListener('input', applyRoadmapFilters);
    document.getElementById('roadFilterLevel')?.addEventListener('change', applyRoadmapFilters);
    document.getElementById('roadFilterStatus')?.addEventListener('change', applyRoadmapFilters);
    dirControls?.querySelectorAll('.hr-select').forEach((sel) =>
        sel.addEventListener('change', applyFilters)
    );

    function openRoadmapModal() {
        if (!selectedId) {
            showToast('Lỗi', 'Chọn một dòng lộ trình trong bảng.', 'error');
            return;
        }
        // Tìm entry theo courseId hoặc staffId
        const r = MockStore.getRoadmap().find(x => (x.courseId || x.id) === selectedId) ||
                  MockStore.getRoadmap().find(x => x.id === selectedId);
        if (!r) return;
        $('roadmapStaffId').value = r.id;
        $('roadmapName').value = r.name;
        $('roadmapTitle').value = r.title;
        $('roadmapLevel').value = r.level || '';
        $('roadmapCourse').value = r.course || '';
        $('roadmapStatus').value = r.status || 'Đang học';
        roadmapModal.classList.add('show');
    }

    document.getElementById('editRoadmapBtn')?.addEventListener('click', openRoadmapModal);

    // ── Thêm khoá học mới ────────────────────────────────────────────────────
    const addRoadmapModal = document.getElementById('addRoadmapModal');

    function openAddRoadmapModal() {
        // Populate staff dropdown
        const staffSel = document.getElementById('newRoadmapStaff');
        if (staffSel) {
            staffSel.innerHTML = '<option value="">-- Chọn nhân viên --</option>' +
                MockStore.getStaff().map(s => `<option value="${s.id}">${UI.escape(s.name)} (${s.id})</option>`).join('');
        }
        document.getElementById('newRoadmapCourse').value = '';
        document.getElementById('newRoadmapLevel').value = 'L2';
        document.getElementById('newRoadmapStatus').value = 'Chưa bắt đầu';
        addRoadmapModal?.classList.add('show');
    }

    document.getElementById('addRoadmapBtn')?.addEventListener('click', openAddRoadmapModal);
    document.getElementById('closeAddRoadmapModal')?.addEventListener('click', () => addRoadmapModal?.classList.remove('show'));
    document.getElementById('cancelAddRoadmapBtn')?.addEventListener('click', () => addRoadmapModal?.classList.remove('show'));
    addRoadmapModal?.addEventListener('click', e => { if (e.target === addRoadmapModal) addRoadmapModal.classList.remove('show'); });

    document.getElementById('saveAddRoadmapBtn')?.addEventListener('click', () => {
        const staffId = document.getElementById('newRoadmapStaff').value;
        const course = document.getElementById('newRoadmapCourse').value.trim();
        const level = document.getElementById('newRoadmapLevel').value;
        const status = document.getElementById('newRoadmapStatus').value;
        if (!staffId) { showToast('Lỗi', 'Vui lòng chọn nhân viên.', 'error'); return; }
        if (!course) { showToast('Lỗi', 'Vui lòng nhập tên khoá học.', 'error'); return; }
        const staff = MockStore.getStaff().find(s => s.id === staffId);
        MockStore.addRoadmap({ id: staffId, courseId: 'c_' + Date.now(), name: staff?.name || '', title: staff?.title || '', level, course, status });
        addRoadmapModal?.classList.remove('show');
        showToast('Thành công', `Đã thêm khoá học "${course}".`);
        renderRoadmap();
    });

    document.getElementById('updateRoadmapStatusBtn')?.addEventListener('click', () => {
        if (!selectedId) {
            showToast('Lỗi', 'Chọn một dòng lộ trình.', 'error');
            return;
        }
        const r = MockStore.getRoadmap().find(x => (x.courseId || x.id) === selectedId) ||
                  MockStore.getRoadmap().find(x => x.id === selectedId);
        if (!r) return;
        const order = ['Chưa bắt đầu', 'Đang học', 'Hoàn thành'];
        const next = order[(order.indexOf(r.status) + 1) % order.length];
        MockStore.updateRoadmap(r.id, { status: next });
        showToast('Thành công', `Trạng thái: ${next}`);
        renderRoadmap();
    });

    document.getElementById('closeRoadmapModal')?.addEventListener('click', () => roadmapModal.classList.remove('show'));
    document.getElementById('cancelRoadmapBtn')?.addEventListener('click', () => roadmapModal.classList.remove('show'));
    roadmapModal?.addEventListener('click', (e) => {
        if (e.target === roadmapModal) roadmapModal.classList.remove('show');
    });

    document.getElementById('saveRoadmapBtn')?.addEventListener('click', () => {
        if (!validateForm(document.getElementById('roadmapForm'))) return;
        const id = $('roadmapStaffId').value;
        const patch = {
            name: $('roadmapName').value.trim(),
            title: $('roadmapTitle').value.trim(),
            level: $('roadmapLevel').value,
            course: $('roadmapCourse').value.trim(),
            status: $('roadmapStatus').value
        };
        MockStore.updateRoadmap(id, patch);
        MockStore.updateStaff(id, { name: patch.name, title: patch.title });
        roadmapModal.classList.remove('show');
        showToast('Thành công', 'Đã lưu lộ trình đào tạo.');
        renderRoadmap();
        renderDirectory();
    });

    function openDrawer(staffId) {
        const s = MockStore.getStaff().find((x) => x.id === staffId);
        if (!s) return;
        const h4 = drawer?.querySelector('.drawer-user-info h4');
        const p = drawer?.querySelector('.drawer-user-info p');
        if (h4) h4.textContent = s.name;
        if (p) p.textContent = `${s.id} · ${s.title}`;
        const timeline = drawer?.querySelector('.timeline-container');
        if (timeline) {
            const assigns = (MockStore.get().assignments || []).filter((a) => a.staffId === staffId);
            timeline.innerHTML =
                assigns
                    .map(
                        (a) => `
                <div class="timeline-item"><div class="timeline-dot"></div>
                <div class="timeline-content"><div class="tl-header"><h6>${UI.escape(a.project)}</h6></div>
                <p class="tl-meta">${a.from} → ${a.to} · ${a.percent}% công suất</p>
                <div class="tl-progress-bar"><div class="tl-progress-fill gray" style="width:${a.percent}%;"></div></div>
                </div></div>`
                    )
                    .join('') || '<p style="padding:16px;color:#666;">Chưa có dự án. Nhấn «Gán dự án mới».</p>';
        }
        const assignee = assignModal?.querySelector('.a-name');
        if (assignee) assignee.textContent = s.name;
        drawer?.classList.add('show');
        drawerOverlay?.classList.add('show');
    }

    drawerOverlay?.addEventListener('click', () => {
        drawer?.classList.remove('show');
        drawerOverlay?.classList.remove('show');
    });

    document.getElementById('openAddModalBtn')?.addEventListener('click', () => {
        editingId = null;
        openAddModal(false);
    });

    document.getElementById('closeAddModal')?.addEventListener('click', closeAddModal);
    document.getElementById('cancelAddBtn')?.addEventListener('click', closeAddModal);
    addModal?.addEventListener('click', (e) => {
        if (e.target === addModal) closeAddModal();
    });

    document.getElementById('saveAddModalBtn')?.addEventListener('click', () => {
        if (!validateForm(document.getElementById('addStaffForm') || addModal)) return;

        const payload = readStaffForm();
        if (editingId) {
            MockStore.updateStaff(editingId, payload);
            MockStore.updateRoadmap(editingId, { name: payload.name, title: payload.title });
            showToast('Thành công', `Đã cập nhật ${payload.name}.`);
            selectedId = editingId;
        } else {
            const created = MockStore.addStaff(payload);
            showToast('Thành công', `Đã thêm ${created.name} (${created.id}).`);
            selectedId = created.id;
        }
        closeAddModal();
        renderDirectory();
        renderRoadmap();
        if (selectedId) openDrawer(selectedId);
    });

    document.querySelectorAll('#directoryControls .btn-action').forEach((btn) => {
        if (btn.id === 'openAddModalBtn') return;
        const text = btn.textContent.trim();
        if (text.includes('Sửa')) {
            btn.addEventListener('click', () => {
                if (!selectedId) {
                    showToast('Lỗi', 'Chọn một dòng trong bảng trước.', 'error');
                    return;
                }
                const s = MockStore.getStaff().find((x) => x.id === selectedId);
                if (!s) return;
                editingId = s.id;
                openAddModal(true);
                fillStaffForm(s);
            });
        }
        if (text.includes('Xóa')) {
            btn.addEventListener('click', () => {
                if (!selectedId) {
                    showToast('Lỗi', 'Chọn nhân sự cần xóa.', 'error');
                    return;
                }
                if (confirm('Xóa nhân sự đã chọn?')) {
                    MockStore.deleteStaff([selectedId]);
                    selectedId = null;
                    drawer?.classList.remove('show');
                    drawerOverlay?.classList.remove('show');
                    showToast('Thành công', 'Đã xóa nhân sự.');
                    renderDirectory();
                    renderRoadmap();
                }
            });
        }
    });

    document.getElementById('openAssignModalBtn')?.addEventListener('click', () => {
        if (!selectedId) {
            showToast('Lỗi', 'Chọn nhân sự trước khi gán dự án.', 'error');
            return;
        }
        populateAssignProjects();
        assignModal?.classList.add('show');
    });
    document.getElementById('closeAssignModal')?.addEventListener('click', () => assignModal?.classList.remove('show'));
    document.getElementById('cancelAssignBtn')?.addEventListener('click', () => assignModal?.classList.remove('show'));

    document.getElementById('saveAssignBtn')?.addEventListener('click', () => {
        if (!selectedId) return;
        if (!validateForm(assignModal)) return;

        const project = $('assignProject').value;
        const percent = parseInt($('assignPercent').value, 10) || 0;
        const from = $('assignDateFrom').value;
        const to = $('assignDateTo').value;

        if (!MockStore.get().assignments) MockStore.get().assignments = [];
        MockStore.get().assignments.push({ staffId: selectedId, project, percent, from, to });
        MockStore.save();
        MockStore.logActivity('Nhân sự', `Gán ${project} cho ${selectedId}`);

        const s = MockStore.getStaff().find((x) => x.id === selectedId);
        if (s) {
            MockStore.updateStaff(selectedId, {
                project,
                workload: Math.min(100, (s.workload || 0) + percent)
            });
        }
        assignModal.classList.remove('show');
        showToast('Thành công', 'Đã gán dự án.');
        renderDirectory();
        openDrawer(selectedId);
    });

    populateGroupOptions();
    populateManagerOptions();
    populateAssignProjects();
    renderDirectory();
    renderRoadmap();
});
