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
    const coursesTable = document.getElementById('coursesTable');
    const dirControls = document.getElementById('directoryControls');
    const roadControls = document.getElementById('roadmapControls');
    const addModal = document.getElementById('addStaffModal');
    const assignModal = document.getElementById('assignProjectModal');
    const drawer = document.getElementById('hrDrawer');
    const drawerOverlay = document.getElementById('hrDrawerOverlay');

    // Sub-tab elements
    const subtabProgress = document.getElementById('subtabProgress');
    const subtabCourses  = document.getElementById('subtabCourses');
    const progressControls = document.getElementById('progressControls');
    const coursesControls  = document.getElementById('coursesControls');

    let activeRoadmapSubtab = 'progress'; // 'progress' | 'courses'
    let selectedCourseId = null;

    // DM Approval
    const dmTable    = document.getElementById('dmTable');
    const dmControls = document.getElementById('dmControls');
    let selectedDmId = null;

    // Mock data yêu cầu nguồn lực chờ phê duyệt
    const DM_REQUESTS = [
        { id: 'REQ-001', project: 'Precision Sensor Module - V2', projectId: 'PRJ-101', team: 'Team X-Engine', position: 'Senior Embedded Dev', qty: 2, ot: true,  from: '2025-04-01', to: '2025-08-31', status: 'Chờ phê duyệt', note: '' },
        { id: 'REQ-002', project: 'Cloud Infra Platform',          projectId: 'PRJ-102', team: 'Team Cloud',    position: 'DevOps Engineer',      qty: 1, ot: false, from: '2025-05-01', to: '2025-09-30', status: 'Chờ phê duyệt', note: '' },
        { id: 'REQ-003', project: 'Smart Factory IoT',             projectId: 'PRJ-103', team: 'Team BA',       position: 'IoT Engineer',          qty: 2, ot: false, from: '2025-03-01', to: '2025-10-31', status: 'Đang tuyển dụng', note: '' },
        { id: 'REQ-004', project: 'ERP Migration Wave 2',          projectId: 'PRJ-105', team: 'Team BA',       position: 'SAP Consultant',        qty: 3, ot: true,  from: '2025-04-15', to: '2026-01-31', status: 'Chờ phê duyệt', note: '' },
        { id: 'REQ-005', project: 'Automotive ECU Testing',        projectId: 'PRJ-107', team: 'Team X-Engine', position: 'HIL Test Engineer',     qty: 2, ot: true,  from: '2025-02-01', to: '2026-05-31', status: 'Bị từ chối',    note: 'Ngân sách chưa được phê duyệt' },
        { id: 'REQ-006', project: 'Dairy Farm IoT Sensors',        projectId: 'PRJ-106', team: 'Team Cloud',    position: 'Embedded Firmware Dev', qty: 1, ot: false, from: '2025-01-01', to: '2025-09-30', status: 'Cần làm rõ',    note: 'Cần bổ sung mô tả kỹ năng cụ thể' },
    ];

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
        tr.selected td { background: #f0f7ff; }
        tr.selected td:first-child { border-left: 3px solid #0078d4; }
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
            dirControls.style.display  = activeHrTab === 'directory'   ? 'flex' : 'none';
            roadControls.style.display = activeHrTab === 'roadmap'     ? 'flex' : 'none';
            dmControls.style.display   = activeHrTab === 'dm-approval' ? 'flex' : 'none';
            dirTable.style.display     = activeHrTab === 'directory'   ? 'table' : 'none';
            // Khi vào roadmap: hiển thị theo sub-tab hiện tại
            if (activeHrTab === 'roadmap') {
                switchRoadmapSubtab(activeRoadmapSubtab);
            } else {
                roadTable.style.display    = 'none';
                coursesTable.style.display = 'none';
            }
            dmTable.style.display = activeHrTab === 'dm-approval' ? 'table' : 'none';
            selectedId = null;
            applyFilters();
            if (activeHrTab === 'roadmap') applyRoadmapFilters();
            if (activeHrTab === 'dm-approval') renderDmTable();
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

    // ── Sub-tab switching (Lộ trình) ─────────────────────────────────────────
    const COURSES_DATA = [
        { id: 'CRS-001', name: 'Cloud Architecture Fundamentals', category: 'Kỹ thuật', provider: 'AWS Training', duration: '40 giờ', enrolled: 12, status: 'Đang mở' },
        { id: 'CRS-002', name: 'Agile Leadership & Scrum Master', category: 'Quản lý', provider: 'Bosch Academy', duration: '24 giờ', enrolled: 8, status: 'Đang mở' },
        { id: 'CRS-003', name: 'MLOps Fundamentals', category: 'Kỹ thuật', provider: 'Coursera', duration: '60 giờ', enrolled: 5, status: 'Sắp khai giảng' },
        { id: 'CRS-004', name: 'Advanced UI/UX Systems', category: 'Kỹ thuật', provider: 'Interaction Design', duration: '32 giờ', enrolled: 7, status: 'Đang mở' },
        { id: 'CRS-005', name: 'Kubernetes & DevOps Pro', category: 'Kỹ thuật', provider: 'Linux Foundation', duration: '48 giờ', enrolled: 6, status: 'Đang mở' },
        { id: 'CRS-006', name: 'Kỹ năng thuyết trình & giao tiếp', category: 'Kỹ năng mềm', provider: 'Bosch Academy', duration: '16 giờ', enrolled: 15, status: 'Đã kết thúc' },
        { id: 'CRS-007', name: 'React Advanced Patterns', category: 'Kỹ thuật', provider: 'Frontend Masters', duration: '28 giờ', enrolled: 4, status: 'Sắp khai giảng' },
        { id: 'CRS-008', name: 'Project Management Professional', category: 'Quản lý', provider: 'PMI', duration: '36 giờ', enrolled: 9, status: 'Đang mở' },
    ];

    function renderCourses() {
        const tbody = coursesTable.querySelector('tbody');
        const term     = (document.getElementById('courseSearch')?.value || '').toLowerCase();
        const category = document.getElementById('filterCourseCategory')?.value || '';
        const status   = document.getElementById('filterCourseStatus')?.value || '';

        const filtered = COURSES_DATA.filter(c => {
            const matchSearch   = !term     || c.name.toLowerCase().includes(term) || c.provider.toLowerCase().includes(term);
            const matchCategory = !category || c.category === category;
            const matchStatus   = !status   || c.status === status;
            return matchSearch && matchCategory && matchStatus;
        });

        tbody.innerHTML = filtered.map(c => `
            <tr data-id="${c.id}" style="cursor:pointer;" class="${selectedCourseId === c.id ? 'selected-row' : ''}">
                <td class="code-col">${UI.escape(c.id)}</td>
                <td class="name-col">${UI.escape(c.name)}</td>
                <td>${UI.escape(c.category)}</td>
                <td>${UI.escape(c.provider)}</td>
                <td>${UI.escape(c.duration)}</td>
                <td style="font-weight:700;color:var(--bosch-blue);">${c.enrolled}</td>
                <td style="text-align:center;">${UI.badge(c.status)}</td>
            </tr>`).join('');

        // Row click — toggle selection
        const selBadge = document.getElementById('courseSelectionBadge');
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selectedCourseId === id) {
                    // Bỏ chọn
                    selectedCourseId = null;
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    if (selBadge) selBadge.style.display = 'none';
                } else {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    tr.classList.add('selected-row');
                    selectedCourseId = id;
                    const c = COURSES_DATA.find(x => x.id === id);
                    if (selBadge && c) {
                        selBadge.textContent = `Đang chọn: ${c.name}`;
                        selBadge.style.display = 'block';
                    }
                }
            });
        });
    }

    // ── Modal sửa khoá học ───────────────────────────────────────────────────
    const editCourseModal = document.getElementById('editCourseModal');

    function openEditCourseModal() {
        if (!selectedCourseId) {
            showToast('Lỗi', 'Chọn một khoá học trước.', 'error');
            return;
        }
        const c = COURSES_DATA.find(x => x.id === selectedCourseId);
        if (!c) return;
        $('editCourseName').value     = c.name;
        $('editCourseCategory').value = c.category;
        $('editCourseStatus').value   = c.status;
        $('editCourseProvider').value = c.provider;
        $('editCourseDuration').value = c.duration;
        $('editCourseEnrolled').value = c.enrolled;
        editCourseModal?.classList.add('show');
    }

    document.getElementById('editCourseBtn')?.addEventListener('click', openEditCourseModal);
    document.getElementById('closeEditCourseModal')?.addEventListener('click', () => editCourseModal?.classList.remove('show'));
    document.getElementById('cancelEditCourseBtn')?.addEventListener('click', () => editCourseModal?.classList.remove('show'));
    editCourseModal?.addEventListener('click', e => { if (e.target === editCourseModal) editCourseModal.classList.remove('show'); });

    document.getElementById('saveEditCourseBtn')?.addEventListener('click', () => {
        if (!selectedCourseId) return;
        const c = COURSES_DATA.find(x => x.id === selectedCourseId);
        if (!c) return;
        c.name     = $('editCourseName').value.trim() || c.name;
        c.category = $('editCourseCategory').value;
        c.status   = $('editCourseStatus').value;
        c.provider = $('editCourseProvider').value.trim() || c.provider;
        c.duration = $('editCourseDuration').value.trim() || c.duration;
        c.enrolled = parseInt($('editCourseEnrolled').value) || c.enrolled;
        editCourseModal?.classList.remove('show');
        showToast('Thành công', `Đã cập nhật khoá học "${c.name}".`);
        renderCourses();
        // Cập nhật lại selection badge
        const selBadge = document.getElementById('courseSelectionBadge');
        if (selBadge) selBadge.textContent = `Đang chọn: ${c.name}`;
    });

    function switchRoadmapSubtab(tab) {
        activeRoadmapSubtab = tab;
        const isProgress = tab === 'progress';

        subtabProgress?.classList.toggle('active', isProgress);
        subtabCourses?.classList.toggle('active', !isProgress);

        progressControls.style.display = isProgress ? 'block' : 'none';
        coursesControls.style.display  = isProgress ? 'none'  : 'block';

        roadTable.style.display    = isProgress ? 'table' : 'none';
        coursesTable.style.display = isProgress ? 'none'  : 'table';

        if (!isProgress) renderCourses();
    }

    subtabProgress?.addEventListener('click', () => switchRoadmapSubtab('progress'));
    subtabCourses?.addEventListener('click',  () => switchRoadmapSubtab('courses'));

    document.getElementById('courseSearch')?.addEventListener('input', renderCourses);
    document.getElementById('filterCourseCategory')?.addEventListener('change', renderCourses);
    document.getElementById('filterCourseStatus')?.addEventListener('change', renderCourses);

    document.getElementById('addCourseBtn')?.addEventListener('click', () => {
        showToast('Thông tin', 'Chức năng thêm khoá học đang phát triển.', 'error');
    });

    // ── DM Approval ──────────────────────────────────────────────────────────

    // Helper: badge HTML theo status — dùng UI.badge() chuẩn toàn app
    function dmStatusBadge(status) {
        return UI.badge(status);
    }

    function renderDmTable() {
        const tbody = dmTable.querySelector('tbody');
        const term   = (document.getElementById('dmSearch')?.value || '').toLowerCase();
        const team   = document.getElementById('filterDmTeam')?.value || '';
        const status = document.getElementById('filterDmStatus')?.value || '';

        const filtered = DM_REQUESTS.filter(r => {
            const matchSearch = !term   || r.id.toLowerCase().includes(term)
                                        || r.project.toLowerCase().includes(term)
                                        || r.position.toLowerCase().includes(term);
            const matchTeam   = !team   || r.team === team;
            const matchStatus = !status || r.status === status;
            return matchSearch && matchTeam && matchStatus;
        });

        tbody.innerHTML = filtered.map(r => {
            const alertCls = r.status === 'Bị từ chối' ? ' row-alert' : '';
            return `<tr data-id="${r.id}" style="cursor:pointer;" class="${alertCls}">
                <td class="code-col" style="text-align:center;">${UI.escape(r.id)}</td>
                <td><strong>${UI.escape(r.project)}</strong><br><small style="color:#9ca3af;">${UI.escape(r.projectId)}</small></td>
                <td style="text-align:center;">${UI.escape(r.team)}</td>
                <td>${UI.escape(r.position)}</td>
                <td style="font-weight:700;color:var(--bosch-blue);text-align:center;">${r.qty}</td>
                <td style="text-align:center;">${r.ot ? '<span class="badge badge-info">Có OT</span>' : '<span class="badge badge-muted">Không OT</span>'}</td>
                <td style="font-size:12px;text-align:center;">${r.from}<br>${r.to}</td>
                <td style="text-align:center;">${dmStatusBadge(r.status)}${r.note ? `<br><small style="color:#9ca3af;font-size:10px;">${UI.escape(r.note)}</small>` : ''}</td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => openDmDetail(tr.dataset.id));
        });
    }

    // Bind filter/search cho DM
    document.getElementById('dmSearch')?.addEventListener('input', renderDmTable);
    document.getElementById('filterDmTeam')?.addEventListener('change', renderDmTable);
    document.getElementById('filterDmStatus')?.addEventListener('change', renderDmTable);

    // ── Modal chi tiết yêu cầu ───────────────────────────────────────────────
    const dmDetailModal  = document.getElementById('dmDetailModal');
    const dmRejectModal  = document.getElementById('dmRejectModal');
    const dmClarifyModal = document.getElementById('dmClarifyModal');

    function openDmDetail(id) {
        const req = DM_REQUESTS.find(x => x.id === id);
        if (!req) return;
        selectedDmId = id;

        document.getElementById('dmDetailReqId').textContent  = `Chi tiết yêu cầu — ${req.id}`;
        document.getElementById('dmDetailStatusRow').innerHTML = dmStatusBadge(req.status);
        document.getElementById('dmDetailProject').value   = `${req.project} (${req.projectId})`;
        document.getElementById('dmDetailTeam').value      = req.team;
        document.getElementById('dmDetailPosition').value  = req.position;
        document.getElementById('dmDetailQty').value       = `${req.qty} người`;
        document.getElementById('dmDetailDate').value      = `${req.from} → ${req.to}`;
        document.getElementById('dmDetailOt').innerHTML    = req.ot
            ? '<span class="badge badge-info">Có OT</span>'
            : '<span class="badge badge-muted">Không OT</span>';

        const noteRow  = document.getElementById('dmDetailNoteRow');
        const noteArea = document.getElementById('dmDetailNote');
        if (req.note) {
            noteRow.style.display  = 'block';
            noteArea.value = req.note;
        } else {
            noteRow.style.display = 'none';
        }

        // Render action buttons dựa theo trạng thái
        const actionsEl = document.getElementById('dmDetailActions');
        const approvable = ['Chờ phê duyệt', 'Bị từ chối', 'Cần làm rõ'];
        const canReject  = ['Chờ phê duyệt', 'Cần làm rõ'];
        const canClarify = ['Chờ phê duyệt', 'Bị từ chối'];

        let btns = '';
        if (approvable.includes(req.status)) {
            btns += `<button class="btn-action" id="dmDetailApproveBtn"
                style="background:#16a34a;color:#fff;border:none;">
                <i class="fa-solid fa-check"></i> Phê duyệt
            </button>`;
        }
        if (canClarify.includes(req.status)) {
            btns += `<button class="btn-action outline-yellow-btn" id="dmDetailClarifyBtn"
                style="border-color:#0078d4;color:#0078d4;">
                <i class="fa-solid fa-circle-question"></i> Yêu cầu làm rõ
            </button>`;
        }
        if (canReject.includes(req.status)) {
            btns += `<button class="btn-action" id="dmDetailRejectBtn"
                style="background:#fff;color:#c0152a;border:1px solid #fca5a5;">
                <i class="fa-solid fa-xmark"></i> Từ chối
            </button>`;
        }
        btns += `<button class="btn-secondary" id="dmDetailCloseBtn" style="margin-left:auto;">Đóng</button>`;
        actionsEl.innerHTML = btns;

        // Bind nút trong modal chi tiết
        document.getElementById('dmDetailApproveBtn')?.addEventListener('click', () => {
            req.status = 'Đang tuyển dụng';
            req.note = '';
            dmDetailModal.classList.remove('show');
            showToast('Thành công', `Đã phê duyệt ${req.id}. Trạng thái: Đang tuyển dụng.`);
            renderDmTable();
        });

        document.getElementById('dmDetailClarifyBtn')?.addEventListener('click', () => {
            dmDetailModal.classList.remove('show');
            document.getElementById('dmClarifyReqId').textContent = req.id;
            document.getElementById('dmClarifyNote').value = '';
            updateClarifyBtn();
            dmClarifyModal.classList.add('show');
        });

        document.getElementById('dmDetailRejectBtn')?.addEventListener('click', () => {
            dmDetailModal.classList.remove('show');
            document.getElementById('dmRejectReqId').textContent = req.id;
            document.getElementById('dmRejectReason').value = '';
            updateRejectBtn();
            dmRejectModal.classList.add('show');
        });

        document.getElementById('dmDetailCloseBtn')?.addEventListener('click', () => {
            dmDetailModal.classList.remove('show');
        });

        dmDetailModal.classList.add('show');
    }

    document.getElementById('closeDmDetailModal')?.addEventListener('click', () => dmDetailModal?.classList.remove('show'));
    dmDetailModal?.addEventListener('click', e => { if (e.target === dmDetailModal) dmDetailModal.classList.remove('show'); });

    // ── Modal Từ chối — validation 10 ký tự ─────────────────────────────────
    function updateRejectBtn() {
        const val = document.getElementById('dmRejectReason')?.value || '';
        const btn = document.getElementById('saveDmRejectBtn');
        const counter = document.getElementById('dmRejectCharCount');
        const len = val.trim().length;
        if (counter) counter.textContent = `${len} / 10 ký tự tối thiểu`;
        if (btn) {
            const ok = len >= 10;
            btn.disabled = !ok;
            btn.style.opacity = ok ? '1' : '.5';
            btn.style.cursor  = ok ? 'pointer' : 'not-allowed';
        }
    }

    document.getElementById('dmRejectReason')?.addEventListener('input', updateRejectBtn);
    document.getElementById('closeDmRejectModal')?.addEventListener('click', () => dmRejectModal?.classList.remove('show'));
    document.getElementById('cancelDmRejectBtn')?.addEventListener('click', () => dmRejectModal?.classList.remove('show'));
    dmRejectModal?.addEventListener('click', e => { if (e.target === dmRejectModal) dmRejectModal.classList.remove('show'); });

    document.getElementById('saveDmRejectBtn')?.addEventListener('click', () => {
        const reason = document.getElementById('dmRejectReason').value.trim();
        if (reason.length < 10) { showToast('Lỗi', 'Lý do từ chối phải có ít nhất 10 ký tự.', 'error'); return; }
        const req = DM_REQUESTS.find(x => x.id === selectedDmId);
        if (!req) return;
        req.status = 'Bị từ chối';
        req.note = reason;
        dmRejectModal.classList.remove('show');
        showToast('Đã từ chối', `Yêu cầu ${req.id} bị từ chối.`);
        renderDmTable();
    });

    // ── Modal Làm rõ — validation 10 ký tự ──────────────────────────────────
    function updateClarifyBtn() {
        const val = document.getElementById('dmClarifyNote')?.value || '';
        const btn = document.getElementById('saveDmClarifyBtn');
        const counter = document.getElementById('dmClarifyCharCount');
        const len = val.trim().length;
        if (counter) counter.textContent = `${len} / 10 ký tự tối thiểu`;
        if (btn) {
            const ok = len >= 10;
            btn.disabled = !ok;
            btn.style.opacity = ok ? '1' : '.5';
            btn.style.cursor  = ok ? 'pointer' : 'not-allowed';
        }
    }

    document.getElementById('dmClarifyNote')?.addEventListener('input', updateClarifyBtn);
    document.getElementById('closeDmClarifyModal')?.addEventListener('click', () => dmClarifyModal?.classList.remove('show'));
    document.getElementById('cancelDmClarifyBtn')?.addEventListener('click', () => dmClarifyModal?.classList.remove('show'));
    dmClarifyModal?.addEventListener('click', e => { if (e.target === dmClarifyModal) dmClarifyModal.classList.remove('show'); });

    document.getElementById('saveDmClarifyBtn')?.addEventListener('click', () => {
        const note = document.getElementById('dmClarifyNote').value.trim();
        if (note.length < 10) { showToast('Lỗi', 'Nội dung làm rõ phải có ít nhất 10 ký tự.', 'error'); return; }
        const req = DM_REQUESTS.find(x => x.id === selectedDmId);
        if (!req) return;
        req.status = 'Cần làm rõ';
        req.note = note;
        dmClarifyModal.classList.remove('show');
        showToast('Đã gửi', `Yêu cầu ${req.id} trả về Leader để làm rõ.`);
        renderDmTable();
    });

    function renderDirectory() {
        const tbody = dirTable.querySelector('tbody');
        const all = MockStore.getStaff();

        // Populate dynamic filters
        const groupSel = document.getElementById('filterStaffGroup');
        const teamSel = document.getElementById('filterStaffTeam');
        const projSel = document.getElementById('filterStaffProject');
        
        if (groupSel && groupSel.options.length <= 1) {
            const groups = [...new Set(all.map(s => s.group).filter(Boolean))].sort();
            groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = `Group ${g}`;
                groupSel.appendChild(opt);
            });
        }
        if (teamSel && teamSel.options.length <= 1) {
            const teams = [...new Set(all.map(s => s.team).filter(Boolean))].sort();
            teams.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                teamSel.appendChild(opt);
            });
        }
        if (projSel && projSel.options.length <= 1) {
            const projs = [...new Set(all.map(s => s.project).filter(Boolean))].sort();
            projs.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                projSel.appendChild(opt);
            });
        }

        tbody.innerHTML = all
            .map(
                (s) => {
                    const alert = s.workload >= 90 ? ' row-alert' : '';
                    return `
            <tr data-id="${s.id}" class="${selectedId === s.id ? 'selected' : ''}${alert}" style="cursor:pointer;">
                <td class="code-col" style="text-align:center;">${UI.escape(s.id)}</td>
                <td class="name-col">${UI.escape(s.name)}</td>
                <td class="role-col">${UI.escape(s.title)}</td>
                <td class="project-col">${UI.escape(s.project)}</td>
                <td>${workloadRow(s)}</td>
            </tr>`;
                }
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
        return UI.badge(status);
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
                <td class="code-col" style="text-align:center;">${UI.escape(r.id)}</td>
                <td class="name-col">${UI.escape(r.name)}</td>
                <td class="role-col">${UI.escape(r.title)}</td>
                <td>${UI.escape(r.course)}</td>
                <td style="text-align:center;">${roadmapStatusBadge(r.status)}</td>
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
        const status = document.getElementById('roadFilterStatus')?.value || '';
        const term = (roadControls?.querySelector('.search-box input')?.value || '').toLowerCase();
        roadTable.querySelectorAll('tbody tr').forEach((tr) => {
            const text = tr.textContent.toLowerCase();
            const matchSearch = !term || text.includes(term);
            const cells = tr.querySelectorAll('td');
            const rowStatus = cells[4]?.textContent || '';
            const matchStatus = !status || rowStatus.includes(status);
            tr.style.display = matchSearch && matchStatus ? '' : 'none';
        });
    }

    function applyFilters() {
        const active = dirTable.style.display !== 'none' ? dirTable : roadTable;
        const controls = active === dirTable ? dirControls : roadControls;
        const term = (controls?.querySelector('.search-box input')?.value || '').toLowerCase();
        
        if (active === dirTable) {
            const group = document.getElementById('filterStaffGroup')?.value || '';
            const team = document.getElementById('filterStaffTeam')?.value || '';
            const project = document.getElementById('filterStaffProject')?.value || '';
            const workloadVal = document.getElementById('filterStaffWorkload')?.value || '';
            
            const staffList = MockStore.getStaff();
            
            active.querySelectorAll('tbody tr').forEach((tr) => {
                const id = tr.dataset.id;
                const s = staffList.find(x => x.id === id);
                if (!s) {
                    tr.style.display = 'none';
                    return;
                }
                
                const matchSearch = !term || s.id.toLowerCase().includes(term) || s.name.toLowerCase().includes(term) || s.title.toLowerCase().includes(term) || s.project.toLowerCase().includes(term);
                const matchGroup = !group || s.group === group;
                const matchTeam = !team || s.team === team;
                const matchProject = !project || s.project === project;
                
                let matchWorkload = true;
                if (workloadVal === 'low') matchWorkload = s.workload < 50;
                else if (workloadVal === 'stable') matchWorkload = s.workload >= 50 && s.workload < 75;
                else if (workloadVal === 'high') matchWorkload = s.workload >= 75 && s.workload < 90;
                else if (workloadVal === 'overloaded') matchWorkload = s.workload >= 90;
                
                tr.style.display = (matchSearch && matchGroup && matchTeam && matchProject && matchWorkload) ? '' : 'none';
            });
        } else {
            active.querySelectorAll('tbody tr').forEach((tr) => {
                tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        }
    }

    dirControls?.querySelector('.search-box input')?.addEventListener('input', applyFilters);
    roadControls?.querySelector('.search-box input')?.addEventListener('input', applyRoadmapFilters);
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
            // Tự thêm vào participation với giá trị mặc định
            if (MockStore.get().participation) {
                MockStore.get().participation.push({
                    staffId: created.id,
                    name: created.name,
                    title: created.title || '',
                    project: created.project || 'Chưa gán',
                    planned: 0,
                    otHours: 0,
                    actual: 0
                });
                MockStore.save();
            }
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
        const from = $('assignDateFrom').value;
        const to = $('assignDateTo').value;

        if (!MockStore.get().assignments) MockStore.get().assignments = [];
        MockStore.get().assignments.push({ staffId: selectedId, project, from, to });
        MockStore.save();
        MockStore.logActivity('Nhân sự', `Gán ${project} cho ${selectedId}`);

        const s = MockStore.getStaff().find((x) => x.id === selectedId);
        if (s) {
            MockStore.updateStaff(selectedId, { project });
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
