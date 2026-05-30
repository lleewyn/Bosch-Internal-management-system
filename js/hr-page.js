/**
 * HR — 3 tab: Danh sách nhân sự | Lộ trình phát triển | Phê duyệt nguồn lực
 * Kết nối Supabase qua DB service
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.PageCommon) return;
    PageCommon.injectFormStyles();

    const $ = (id) => document.getElementById(id);

    // DOM elements
    const dirTable    = $('directoryTable');
    const roadTable   = $('roadmapTable');
    const dirControls = $('directoryControls');
    const roadControls= $('roadmapControls');
    const dmControls  = $('dmControls');

    let activeHrTab = 'directory';
    let selectedId  = null;
    let selectedRoadId = null;
    let selectedDmId   = null;

    // Data cache
    let _employees  = [];
    let _positions  = [];
    let _jobLevels  = [];
    let _groups     = [];
    let _teams      = [];
    let _subTeams   = [];
    let _studyList  = [];   // employee_study + courses
    let _dmRequests = [];   // project_resource_requests + projects

    function esc(v) {
        return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── Load data ─────────────────────────────────────────────────────────────
    let _assignments = []; // cache project assignments
    let _empOrgs     = []; // cache employee_organizations

    async function loadAll() {
        showLoading('directory');
        const [empRes, posRes, jlRes, grpRes, teamRes, subTeamRes, assignRes, orgRes] = await Promise.all([
            DB.Employees.getAll(),
            DB.Meta.getPositions(),
            window.supabaseClient.from('job_levels').select('jl_id, level_name, level_order').order('level_order'),
            DB.Org.getGroups(),
            DB.Org.getTeams(),
            DB.Org.getSubTeams(),
            window.supabaseClient
                .from('project_assignments')
                .select(`
                    assignment_id, employee_id, allocation_percent,
                    project_resource_requests (
                        project_resource_request_id,
                        projects ( project_id, project_name, project_code )
                    )
                `),
            window.supabaseClient
                .from('employee_organizations')
                .select('employee_id, group_id, team_id, sub_team_id, status')
        ]);
        if (empRes.data)      _employees   = empRes.data;
        if (posRes.data)      _positions   = posRes.data;
        if (jlRes.data)       _jobLevels   = jlRes.data;
        if (grpRes.data)      _groups      = grpRes.data;
        if (teamRes.data)     _teams       = teamRes.data;
        if (subTeamRes.data)  _subTeams    = subTeamRes.data;
        if (assignRes.data)   _assignments = assignRes.data;
        if (orgRes.data)      _empOrgs     = orgRes.data;

        if (empRes.error)    console.error('[HR] employees:', empRes.error);
        if (assignRes.error) console.error('[HR] assignments:', assignRes.error);
        if (orgRes.error)    console.error('[HR] empOrgs:', orgRes.error);

        renderDirectory();
        populateFilters();
    }

    async function loadRoadmap() {
        showLoading('roadmap');
        const res = await window.supabaseClient
            .from('employee_study')
            .select(`
                employee_study_id, status, start_at, completed_at,
                employees ( employee_code, full_name, position_id ),
                training_plan_details (
                    courses ( course_name, duration, certificate )
                )
            `)
            .order('start_at', { ascending: false });

        if (res.error) {
            console.error('[HR] roadmap:', res.error);
            _studyList = [];
        } else {
            _studyList = res.data || [];
        }
        renderRoadmap();
    }

    async function loadDmApproval() {
        showLoading('dm');
        const res = await window.supabaseClient
            .from('project_resource_requests')
            .select(`
                project_resource_request_id, quantity, is_ot, description, status, created_at,
                projects ( project_id, project_code, project_name ),
                positions ( position_id, position_name )
            `)
            .order('created_at', { ascending: false });

        if (res.error) {
            console.error('[HR] dm-approval:', res.error);
            _dmRequests = [];
        } else {
            _dmRequests = res.data || [];
        }

        // Populate filter dự án
        const projSel = $('filterDmProject');
        if (projSel && projSel.options.length <= 1) {
            const seen = new Set();
            _dmRequests.forEach(r => {
                const p = r.projects;
                if (p && !seen.has(p.project_id)) {
                    seen.add(p.project_id);
                    const o = document.createElement('option');
                    o.value = p.project_id; o.textContent = p.project_name;
                    projSel.appendChild(o);
                }
            });
        }

        // Populate filter vị trí
        const posSel = $('filterDmPosition');
        if (posSel && posSel.options.length <= 1) {
            const seen = new Set();
            _dmRequests.forEach(r => {
                const p = r.positions;
                if (p && !seen.has(p.position_id)) {
                    seen.add(p.position_id);
                    const o = document.createElement('option');
                    o.value = p.position_id; o.textContent = p.position_name;
                    posSel.appendChild(o);
                }
            });
        }

        renderDmApproval();
    }

    function showLoading(tab) {
        const map = {
            directory: dirTable,
            roadmap:   roadTable,
            dm:        $('dmTable')
        };
        const t = map[tab];
        const tbody = t?.querySelector('tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#888;">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>Đang tải dữ liệu...</td></tr>`;
    }

    // ── Populate filters ──────────────────────────────────────────────────────
    async function populateFilters() {
        const grpSel = $('filterStaffGroup');
        if (grpSel && grpSel.options.length <= 1) {
            _groups.forEach(g => {
                const o = document.createElement('option');
                o.value = g.group_id; o.textContent = g.group_name;
                grpSel.appendChild(o);
            });
        }
        const teamSel = $('filterStaffTeam');
        if (teamSel && teamSel.options.length <= 1) {
            _teams.forEach(t => {
                const o = document.createElement('option');
                o.value = t.team_id; o.textContent = t.team_name;
                teamSel.appendChild(o);
            });
        }
        // Populate dự án filter — load tất cả projects từ DB
        const projSel = $('filterStaffProject');
        if (projSel && projSel.options.length <= 1) {
            const { data: projData } = await window.supabaseClient
                .from('projects')
                .select('project_id, project_name')
                .order('project_name');
            if (projData) {
                projData.forEach(p => {
                    const o = document.createElement('option');
                    o.value = p.project_id; o.textContent = p.project_name;
                    projSel.appendChild(o);
                });
            }
        }
    }

    // ── TAB 1: Danh sách nhân sự ──────────────────────────────────────────────
    function workloadBar(pct) {
        const v = Math.min(120, Math.max(0, pct || 0));
        let cls, badgeCls, badgeText;

        if (v > 90)      { cls = 'red';    badgeCls = 'badge-danger';  badgeText = 'QUÁ TẢI'; }
        else if (v > 70) { cls = 'orange'; badgeCls = 'badge-warning'; badgeText = 'CAO'; }
        else if (v > 30) { cls = 'green';  badgeCls = 'badge-success'; badgeText = 'ỔN ĐỊNH'; }
        else             { cls = 'yellow'; badgeCls = 'badge-info';    badgeText = 'THẤP'; }

        return `<div class="workload-col">
            <div class="progress-bar-container">
                <div class="progress-fill ${cls}" style="width:${Math.min(v,100)}%;"></div>
            </div>
            <div class="workload-info">
                <span class="badge ${badgeCls}">${badgeText}</span>
                <span class="percent-text${v>90?' red-text':''}">${v}%</span>
            </div>
        </div>`;
    }

    function renderDirectory() {
        const tbody = dirTable?.querySelector('tbody');
        if (!tbody) return;

        const search      = (dirControls?.querySelector('.search-box input')?.value || '').toLowerCase();
        const grpVal      = $('filterStaffGroup')?.value    || '';
        const teamVal     = $('filterStaffTeam')?.value     || '';
        const projVal     = $('filterStaffProject')?.value  || '';
        const workloadVal = $('filterStaffWorkload')?.value || '';

        let data = _employees.slice();

        // Filter search
        if (search) data = data.filter(e =>
            (e.full_name||'').toLowerCase().includes(search) ||
            (e.employee_code||'').toLowerCase().includes(search)
        );

        // Filter Group
        if (grpVal) data = data.filter(e =>
            _empOrgs.some(o => o.employee_id === e.employee_id && o.group_id === grpVal)
        );

        // Filter Team
        if (teamVal) data = data.filter(e =>
            _empOrgs.some(o => o.employee_id === e.employee_id && o.team_id === teamVal)
        );

        // Filter Dự án
        if (projVal) data = data.filter(e =>
            _assignments.some(a =>
                a.employee_id === e.employee_id &&
                a.project_resource_requests?.projects?.project_id === projVal
            )
        );

        // Filter Workload
        if (workloadVal) data = data.filter(e => {
            const totalPct = _assignments
                .filter(a => a.employee_id === e.employee_id)
                .reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);
            if (workloadVal === 'low')        return totalPct >= 0  && totalPct <= 30;
            if (workloadVal === 'stable')     return totalPct >= 31 && totalPct <= 70;
            if (workloadVal === 'high')       return totalPct >= 71 && totalPct <= 90;
            if (workloadVal === 'overloaded') return totalPct > 90;
            return true;
        });

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#888;">Không có nhân sự phù hợp</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(e => {
            const posName = e.positions?.position_name
                || _positions.find(p => p.position_id === e.position_id)?.position_name || '—';
            const lvlName = e.job_levels?.level_name || '';

            // Lấy assignments của nhân viên này
            const empAssignments = _assignments.filter(a => a.employee_id === e.employee_id);
            const totalPct = empAssignments.reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);

            // Render cột team dự án
            let projectCol = '—';
            if (empAssignments.length > 0) {
                projectCol = empAssignments.map(a => {
                    const proj = a.project_resource_requests?.projects;
                    return proj ? `<div style="margin-bottom:2px;">${esc(proj.project_name)}</div>` : '';
                }).join('');
            }

            return `<tr data-id="${e.employee_id}" style="cursor:pointer;" class="${selectedId===e.employee_id?'selected-row':''}">
                <td class="code-col" style="text-align:center;">${esc(e.employee_code)}</td>
                <td class="name-col">${esc(e.full_name)}</td>
                <td class="role-col">${esc(posName)}${lvlName?` <span style="font-size:10px;color:#9ca3af;">(${esc(lvlName)})</span>`:''}
                </td>
                <td class="project-col">${projectCol}</td>
                <td>${workloadBar(totalPct)}</td>
            </tr>`;
        }).join('');

        const selBadge = $('staffSelectionBadge');
        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                if (selectedId === id) {
                    selectedId = null;
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    if (selBadge) selBadge.style.display = 'none';
                } else {
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    tr.classList.add('selected-row');
                    selectedId = id;
                    const emp = _employees.find(x => x.employee_id === id);
                    if (selBadge && emp) {
                        selBadge.textContent = `Đang chọn: ${emp.full_name}`;
                        selBadge.style.display = 'block';
                    }
                }
            });
        });
    }

    // ── TAB 2: Lộ trình phát triển ────────────────────────────────────────────
    function studyStatusBadge(status) {
        const map = {
            not_started: ['badge-muted',   'Chưa bắt đầu'],
            in_progress: ['badge-info',    'Đang học'],
            completed:   ['badge-success', 'Hoàn thành'],
            cancelled:   ['badge-danger',  'Đã hủy']
        };
        const [cls, label] = map[status] || ['badge-muted', status || '—'];
        return `<span class="badge ${cls}">${label}</span>`;
    }

    function renderRoadmap() {
        const tbody = roadTable?.querySelector('tbody');
        if (!tbody) return;

        const search = ($('roadProgressSearch')?.value || '').toLowerCase();
        const statusFilter = $('roadFilterStatus')?.value || '';

        // Map label → DB value
        const statusLabelToDb = { 'Chưa bắt đầu': 'not_started', 'Đang học': 'in_progress', 'Hoàn thành': 'completed' };

        let data = _studyList.slice();
        if (search) data = data.filter(s =>
            (s.employees?.full_name||'').toLowerCase().includes(search) ||
            (s.employees?.employee_code||'').toLowerCase().includes(search)
        );
        if (statusFilter) {
            const dbVal = statusLabelToDb[statusFilter] || statusFilter;
            data = data.filter(s => s.status === dbVal);
        }

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#888;">Không có dữ liệu lộ trình</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(s => {
            const emp     = s.employees || {};
            const course  = s.training_plan_details?.courses || {};
            const posName = _positions.find(p => p.position_id === emp.position_id)?.position_name || '—';
            return `<tr data-id="${s.employee_study_id}" style="cursor:pointer;" class="${selectedRoadId===s.employee_study_id?'selected-row':''}">
                <td class="code-col" style="text-align:center;">${esc(emp.employee_code)}</td>
                <td class="name-col">${esc(emp.full_name)}</td>
                <td class="role-col">${esc(posName)}</td>
                <td class="course-col">
                    <div style="font-weight:600;">${esc(course.course_name || '—')}</div>
                    ${course.duration ? `<div style="font-size:11px;color:#9ca3af;">${course.duration} giờ${course.certificate ? ' · ' + esc(course.certificate) : ''}</div>` : ''}
                </td>
                <td style="text-align:center;">${studyStatusBadge(s.status)}</td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                if (selectedRoadId === id) {
                    selectedRoadId = null;
                } else {
                    tr.classList.add('selected-row');
                    selectedRoadId = id;
                }
            });
        });
    }

    // ── TAB 3: Phê duyệt nguồn lực ───────────────────────────────────────────
    function dmStatusBadge(hasOt) {
        return hasOt
            ? '<span class="badge badge-info">Có OT</span>'
            : '<span class="badge badge-muted">Không OT</span>';
    }

    function dmRequestStatusBadge(status) {
        const map = {
            'pending':       { cls: 'badge-warning', text: 'CHỜ PHÊ DUYỆT' },
            'approved':      { cls: 'badge-success', text: 'ĐÃ DUYỆT' },
            'rejected':      { cls: 'badge-danger',  text: 'TỪ CHỐI' },
            'clarification': { cls: 'badge-info',    text: 'CẦN LÀM RÕ' },
            'recruiting':    { cls: 'badge-success', text: 'ĐANG TUYỂN' },
            'fulfilled':     { cls: 'badge-success', text: 'ĐÃ ĐÁP ỨNG' },
        };
        const s = map[status] || { cls: 'badge-warning', text: 'CHỜ PHÊ DUYỆT' };
        return `<span class="badge ${s.cls}">${s.text}</span>`;
    }

    function renderDmApproval() {
        // Dùng bảng đã có sẵn trong HTML
        const dmTable = $('dmTable');
        const tbody = dmTable?.querySelector('tbody');
        if (!tbody) return;

        const search      = ($('dmSearch')?.value      || '').toLowerCase();
        const projFilter  = $('filterDmProject')?.value  || '';
        const posFilter   = $('filterDmPosition')?.value || '';

        let data = _dmRequests.slice();
        if (search) data = data.filter(r =>
            (r.projects?.project_name||'').toLowerCase().includes(search) ||
            (r.projects?.project_code||'').toLowerCase().includes(search) ||
            (r.positions?.position_name||'').toLowerCase().includes(search)
        );
        if (projFilter) data = data.filter(r => r.projects?.project_id === projFilter);
        if (posFilter)  data = data.filter(r => r.positions?.position_id === posFilter);

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#888;">Không có yêu cầu nguồn lực</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => {
            const proj = r.projects  || {};
            const pos  = r.positions || {};
            const date = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—';
            return `<tr data-id="${r.project_resource_request_id}" style="cursor:pointer;" class="${selectedDmId===r.project_resource_request_id?'selected-row':''}">
                <td class="code-col" style="text-align:center;" title="${esc(r.project_resource_request_id)}">YC-${esc(r.project_resource_request_id?.slice(-6).toUpperCase())}</td>
                <td>
                    <div style="font-weight:700;">${esc(proj.project_name || '—')}</div>
                    <div style="font-size:11px;color:#9ca3af;">${esc(proj.project_code || '')}</div>
                </td>
                <td style="text-align:center;">—</td>
                <td>${esc(pos.position_name || '—')}</td>
                <td style="text-align:center;font-weight:700;color:var(--bosch-blue);">${r.quantity}</td>
                <td style="text-align:center;">${dmStatusBadge(r.is_ot)}</td>
                <td style="text-align:center;font-size:12px;">${date}</td>
                <td style="text-align:center;">${dmRequestStatusBadge(r.status)}</td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = tr.dataset.id;
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                selectedDmId = selectedDmId === id ? null : id;
                if (selectedDmId) {
                    tr.classList.add('selected-row');
                    openDmDetail(id);
                }
            });
        });
    }

    function openDmDetail(id) {
        const r = _dmRequests.find(x => x.project_resource_request_id === id);
        if (!r) return;

        const proj = r.projects  || {};
        const pos  = r.positions || {};
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—';

        // Điền thông tin vào modal
        const titleEl = $('dmDetailReqId');
        if (titleEl) titleEl.textContent = `Chi tiết yêu cầu — YC-${r.project_resource_request_id?.slice(-6).toUpperCase()}`;

        if ($('dmDetailProject'))  $('dmDetailProject').value  = proj.project_name || '—';
        if ($('dmDetailTeam'))     $('dmDetailTeam').value     = '—';
        if ($('dmDetailPosition')) $('dmDetailPosition').value = pos.position_name || '—';
        if ($('dmDetailQty'))      $('dmDetailQty').value      = r.quantity || '—';
        if ($('dmDetailDate'))     $('dmDetailDate').value     = date;

        const otEl = $('dmDetailOt');
        if (otEl) otEl.innerHTML = r.is_ot
            ? '<span class="badge badge-info">Có OT</span>'
            : '<span class="badge badge-muted">Không OT</span>';

        // Ghi chú
        const noteRow = $('dmDetailNoteRow');
        const noteEl  = $('dmDetailNote');
        if (r.description) {
            if (noteRow) noteRow.style.display = 'block';
            if (noteEl)  noteEl.value = r.description;
        } else {
            if (noteRow) noteRow.style.display = 'none';
        }

        // Badge trạng thái
        const statusRow = $('dmDetailStatusRow');
        if (statusRow) statusRow.innerHTML = '<span class="badge badge-warning" style="font-size:13px;padding:6px 14px;">Chờ phê duyệt</span>';

        // Nút hành động — GM và DM mới thao tác được, DH chỉ xem
        const role = window.AppRouter?.getCurrentRole();
        const canEdit = role === 'DM' || role === 'GM';
        const actionsEl = $('dmDetailActions');
        if (actionsEl) {
            actionsEl.innerHTML = `
                <button type="button" class="btn-secondary" id="dmDetailCloseBtn">Đóng</button>
                ${canEdit ? `
                <button type="button" class="btn-action" id="dmDetailClarifyBtn"
                    style="background:white;color:#0078d4;border:1px solid #0078d4;padding:8px 16px;border-radius:4px;font-weight:700;cursor:pointer;">
                    <i class="fa-solid fa-circle-question" style="margin-right:6px;"></i>Yêu cầu làm rõ
                </button>
                <button type="button" class="btn-action red-btn" id="dmDetailRejectBtn"
                    style="border:none;padding:8px 16px;border-radius:4px;font-weight:700;cursor:pointer;">
                    <i class="fa-solid fa-xmark" style="margin-right:6px;"></i>Từ chối
                </button>
                <button type="button" class="btn-primary" id="dmDetailApproveBtn">
                    <i class="fa-solid fa-check" style="margin-right:6px;"></i>Phê duyệt
                </button>` : ''}`;

            $('dmDetailCloseBtn')?.addEventListener('click', () => $('dmDetailModal')?.classList.remove('show'));

            $('dmDetailApproveBtn')?.addEventListener('click', async () => {
                const { error } = await window.supabaseClient
                    .from('project_resource_requests')
                    .update({ status: 'approved', updated_at: new Date().toISOString() })
                    .eq('project_resource_request_id', r.project_resource_request_id);

                if (error) { showToast('Lỗi', error.message, 'error'); return; }

                await DB.Logs.addAuditLog({
                    action_type: 'UPDATE',
                    table_name:  'project_resource_requests',
                    record_id:   r.project_resource_request_id,
                    new_value:   { status: 'approved' }
                });

                showToast('Thành công', 'Đã phê duyệt yêu cầu nguồn lực.');
                $('dmDetailModal')?.classList.remove('show');
                await loadDmApproval();
            });

            $('dmDetailRejectBtn')?.addEventListener('click', () => {
                $('dmDetailModal')?.classList.remove('show');
                const reqIdEl = $('dmRejectReqId');
                if (reqIdEl) reqIdEl.textContent = `YC-${r.project_resource_request_id?.slice(-6).toUpperCase()}`;
                // Lưu ID thật vào dataset để dùng khi submit
                const rejectModal = $('dmRejectModal');
                if (rejectModal) rejectModal.dataset.requestId = r.project_resource_request_id;
                // Reset textarea và nút
                if ($('dmRejectReason')) $('dmRejectReason').value = '';
                if ($('dmRejectCharCount')) $('dmRejectCharCount').textContent = '0 / 10 ký tự tối thiểu';
                const rejectBtn = $('saveDmRejectBtn');
                if (rejectBtn) { rejectBtn.disabled = true; rejectBtn.style.opacity = '.5'; rejectBtn.style.cursor = 'not-allowed'; }
                $('dmRejectModal')?.classList.add('show');
            });

            $('dmDetailClarifyBtn')?.addEventListener('click', () => {
                $('dmDetailModal')?.classList.remove('show');
                const reqIdEl = $('dmClarifyReqId');
                if (reqIdEl) reqIdEl.textContent = `YC-${r.project_resource_request_id?.slice(-6).toUpperCase()}`;
                // Lưu ID thật vào dataset để dùng khi submit
                const clarifyModal = $('dmClarifyModal');
                if (clarifyModal) clarifyModal.dataset.requestId = r.project_resource_request_id;
                // Reset textarea và nút
                if ($('dmClarifyNote')) $('dmClarifyNote').value = '';
                if ($('dmClarifyCharCount')) $('dmClarifyCharCount').textContent = '0 / 10 ký tự tối thiểu';
                const clarifyBtn = $('saveDmClarifyBtn');
                if (clarifyBtn) { clarifyBtn.disabled = true; clarifyBtn.style.opacity = '.5'; clarifyBtn.style.cursor = 'not-allowed'; }
                $('dmClarifyModal')?.classList.add('show');
            });
        }

        $('dmDetailModal')?.classList.add('show');
    }

    // ── Tab switching ─────────────────────────────────────────────────────────
    document.querySelectorAll('.bosch-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.bosch-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeHrTab = tab.dataset.tab;

            // Hiện/ẩn controls
            if (dirControls)  dirControls.style.display  = activeHrTab === 'directory'   ? 'flex' : 'none';
            if (roadControls) roadControls.style.display = activeHrTab === 'roadmap'     ? 'flex' : 'none';
            if (dmControls)   dmControls.style.display   = activeHrTab === 'dm-approval' ? 'flex' : 'none';

            // Hiện/ẩn tables — dmTable đã có sẵn trong HTML
            const dmTable = $('dmTable');
            if (dirTable)          dirTable.style.display          = activeHrTab === 'directory'   ? 'table' : 'none';
            if (roadTable)         roadTable.style.display         = activeHrTab === 'roadmap'     ? 'table' : 'none';
            if (dmTable)           dmTable.style.display           = activeHrTab === 'dm-approval' ? 'table' : 'none';
            // Luôn ẩn coursesTable khi không ở roadmap
            const coursesTable = $('coursesTable');
            if (coursesTable)      coursesTable.style.display      = 'none';

            // Load data theo tab
            if (activeHrTab === 'directory')   renderDirectory();
            if (activeHrTab === 'roadmap')     loadRoadmap();
            if (activeHrTab === 'dm-approval') loadDmApproval();
        });
    });

    // ── Search & Filter events ────────────────────────────────────────────────
    dirControls?.querySelector('.search-box input')?.addEventListener('input', renderDirectory);
    $('filterStaffGroup')?.addEventListener('change', renderDirectory);
    $('filterStaffTeam')?.addEventListener('change', renderDirectory);
    $('filterStaffProject')?.addEventListener('change', renderDirectory);
    $('filterStaffWorkload')?.addEventListener('change', renderDirectory);

    $('roadProgressSearch')?.addEventListener('input', renderRoadmap);
    $('roadFilterStatus')?.addEventListener('change', renderRoadmap);

    $('dmSearch')?.addEventListener('input', renderDmApproval);
    $('filterDmProject')?.addEventListener('change', renderDmApproval);
    $('filterDmPosition')?.addEventListener('change', renderDmApproval);

    // Close DM modals
    $('closeDmDetailModal')?.addEventListener('click',  () => $('dmDetailModal')?.classList.remove('show'));
    $('closeDmRejectModal')?.addEventListener('click',  () => $('dmRejectModal')?.classList.remove('show'));
    $('closeDmClarifyModal')?.addEventListener('click', () => $('dmClarifyModal')?.classList.remove('show'));
    $('cancelDmRejectBtn')?.addEventListener('click',   () => $('dmRejectModal')?.classList.remove('show'));
    $('cancelDmClarifyBtn')?.addEventListener('click',  () => $('dmClarifyModal')?.classList.remove('show'));

    // Reject char count
    ['input', 'paste'].forEach(evt => {
        $('dmRejectReason')?.addEventListener(evt, function() {
            setTimeout(() => {
                const len = this.value.trim().length;
                const el = $('dmRejectCharCount');
                if (el) el.textContent = `${len} / 10 ký tự tối thiểu`;
                const btn = $('saveDmRejectBtn');
                if (btn) { btn.disabled = len < 10; btn.style.opacity = len < 10 ? '.5' : '1'; btn.style.cursor = len < 10 ? 'not-allowed' : 'pointer'; }
            }, 0);
        });
    });

    // Clarify char count
    ['input', 'paste'].forEach(evt => {
        $('dmClarifyNote')?.addEventListener(evt, function() {
            setTimeout(() => {
                const len = this.value.trim().length;
                const el = $('dmClarifyCharCount');
                if (el) el.textContent = `${len} / 10 ký tự tối thiểu`;
                const btn = $('saveDmClarifyBtn');
                if (btn) { btn.disabled = len < 10; btn.style.opacity = len < 10 ? '.5' : '1'; btn.style.cursor = len < 10 ? 'not-allowed' : 'pointer'; }
            }, 0);
        });
    });

    // ── Gửi yêu cầu làm rõ ───────────────────────────────────────────────────
    $('saveDmClarifyBtn')?.addEventListener('click', async () => {
        const note = $('dmClarifyNote')?.value.trim();
        if (!note || note.length < 10) return;

        const requestId = $('dmClarifyModal')?.dataset.requestId;
        if (!requestId) { showToast('Lỗi', 'Không tìm thấy yêu cầu.', 'error'); return; }

        const { error } = await window.supabaseClient
            .from('project_resource_requests')
            .update({ status: 'clarification', updated_at: new Date().toISOString() })
            .eq('project_resource_request_id', requestId);

        if (error) { showToast('Lỗi', error.message, 'error'); return; }

        await DB.Logs.addAuditLog({
            action_type: 'UPDATE',
            table_name:  'project_resource_requests',
            record_id:   requestId,
            new_value:   { status: 'clarification', note }
        });

        showToast('Đã gửi', 'Yêu cầu làm rõ đã được gửi thành công.');
        $('dmClarifyModal')?.classList.remove('show');
        if ($('dmClarifyNote')) $('dmClarifyNote').value = '';
        await loadDmApproval();
    });

    // ── Xác nhận từ chối ─────────────────────────────────────────────────────
    $('saveDmRejectBtn')?.addEventListener('click', async () => {
        const reason = $('dmRejectReason')?.value.trim();
        if (!reason || reason.length < 10) return;

        const requestId = $('dmRejectModal')?.dataset.requestId;
        if (!requestId) { showToast('Lỗi', 'Không tìm thấy yêu cầu.', 'error'); return; }

        const { error } = await window.supabaseClient
            .from('project_resource_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('project_resource_request_id', requestId);

        if (error) { showToast('Lỗi', error.message, 'error'); return; }

        await DB.Logs.addAuditLog({
            action_type: 'UPDATE',
            table_name:  'project_resource_requests',
            record_id:   requestId,
            new_value:   { status: 'rejected', reason }
        });

        showToast('Đã từ chối', 'Yêu cầu nguồn lực đã bị từ chối.');
        $('dmRejectModal')?.classList.remove('show');
        if ($('dmRejectReason')) $('dmRejectReason').value = '';
        await loadDmApproval();
    });

    // ── Sub-tab: Lộ trình phát triển ─────────────────────────────────────────
    let _courses    = [];
    let _courseTable = null;

    async function loadCourses() {
        // Lazy-init course table
        const tbody = $('coursesTable')?.querySelector('tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#888;">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>Đang tải...</td></tr>`;

        const { data, error } = await window.supabaseClient
            .from('courses')
            .select('course_id, course_name, description, duration, certificate, learning_outcomes, created_at')
            .order('course_name');

        if (error) { console.error('[HR] courses:', error); _courses = []; }
        else _courses = data || [];

        renderCourses();
    }

    function renderCourses() {
        const tbl = $('coursesTable');
        if (!tbl) return;
        const tbody = tbl.querySelector('tbody');
        if (!tbody) return;

        const search   = ($('courseSearch')?.value || '').toLowerCase();

        let data = _courses.slice();
        if (search) data = data.filter(c =>
            (c.course_name||'').toLowerCase().includes(search) ||
            (c.description||'').toLowerCase().includes(search)
        );
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#888;">Không có khoá học</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr data-id="${c.course_id}" style="cursor:pointer;">
                <td style="font-weight:600;">${esc(c.course_name)}</td>
                <td style="color:#6b7280;font-size:13px;">${esc(c.description || '—')}</td>
                <td style="text-align:center;font-size:13px;">${esc(c.certificate || '—')}</td>
                <td style="text-align:center;">${c.duration ? c.duration + ' giờ' : '—'}</td>
                <td style="text-align:center;font-size:12px;color:#9ca3af;">${c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '—'}</td>
            </tr>`).join('');
    }

    // Sub-tab switching (Theo dõi tiến độ / Danh sách khoá học)
    $('subtabProgress')?.addEventListener('click', () => {
        $('subtabProgress')?.classList.add('active');
        $('subtabCourses')?.classList.remove('active');
        if ($('progressControls')) $('progressControls').style.display = 'block';
        if ($('coursesControls'))  $('coursesControls').style.display  = 'none';
        if (roadTable) roadTable.style.display = 'table';
        if ($('coursesTable')) $('coursesTable').style.display = 'none';
    });

    $('subtabCourses')?.addEventListener('click', () => {
        $('subtabCourses')?.classList.add('active');
        $('subtabProgress')?.classList.remove('active');
        if ($('coursesControls'))  $('coursesControls').style.display  = 'block';
        if ($('progressControls')) $('progressControls').style.display = 'none';
        if (roadTable) roadTable.style.display = 'none';
        if ($('coursesTable')) $('coursesTable').style.display = 'table';
        if (_courses.length === 0) loadCourses();
        else renderCourses();
    });

    $('courseSearch')?.addEventListener('input', renderCourses);
    $('filterCourseCategory')?.addEventListener('change', renderCourses);
    $('filterCourseStatus')?.addEventListener('change', renderCourses);

    // ── Nút Cập nhật lộ trình (editRoadmapBtn) ───────────────────────────────
    $('editRoadmapBtn')?.addEventListener('click', () => {
        if (!selectedRoadId) return showToast('Thông báo', 'Vui lòng chọn một dòng trước.', 'error');
        const study = _studyList.find(s => s.employee_study_id === selectedRoadId);
        if (!study) return;

        const emp    = study.employees || {};
        const course = study.training_plan_details?.courses || {};
        const posName = _positions.find(p => p.position_id === emp.position_id)?.position_name || '—';

        if ($('roadmapStaffId')) $('roadmapStaffId').value = emp.employee_code || '';
        if ($('roadmapName'))    $('roadmapName').value    = emp.full_name     || '';
        if ($('roadmapTitle'))   $('roadmapTitle').value   = posName;
        if ($('roadmapCourse'))  $('roadmapCourse').value  = course.course_name || '';

        // Map status từ DB sang giá trị select
        const statusMap = { not_started: 'Chưa bắt đầu', in_progress: 'Đang học', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
        const sel = $('roadmapStatus');
        if (sel) sel.value = statusMap[study.status] || 'Chưa bắt đầu';

        $('roadmapModal')?.classList.add('show');
    });

    $('saveRoadmapBtn')?.addEventListener('click', async () => {
        const statusMap = { 'Chưa bắt đầu': 'not_started', 'Đang học': 'in_progress', 'Hoàn thành': 'completed' };
        const newStatus = statusMap[$('roadmapStatus')?.value] || 'not_started';

        const { error } = await window.supabaseClient
            .from('employee_study')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('employee_study_id', selectedRoadId);

        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã cập nhật trạng thái học.');
        $('roadmapModal')?.classList.remove('show');
        await loadRoadmap();
    });

    $('cancelRoadmapBtn')?.addEventListener('click', () => $('roadmapModal')?.classList.remove('show'));
    $('closeRoadmapModal')?.addEventListener('click', () => $('roadmapModal')?.classList.remove('show'));

    // ── Nút Thêm khoá học (addCourseBtn) ─────────────────────────────────────
    $('addCourseBtn')?.addEventListener('click', () => {
        // Reset form
        ['newCourseName', 'newCourseProvider', 'newCourseDuration'].forEach(id => {
            const el = $(id); if (el) el.value = '';
        });
        $('addCourseModal')?.classList.add('show');
    });

    $('saveAddCourseBtn')?.addEventListener('click', async () => {
        const name     = $('newCourseName')?.value.trim();
        const duration = parseInt($('newCourseDuration')?.value) || null;
        const cert     = $('newCourseProvider')?.value.trim() || null;
        const desc     = $('newCourseDescription')?.value.trim() || null;

        if (!name) return showToast('Lỗi', 'Vui lòng nhập tên khoá học.', 'error');

        const { error } = await window.supabaseClient
            .from('courses')
            .insert({ course_name: name, duration, certificate: cert, description: desc });

        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã thêm khoá học.');
        $('addCourseModal')?.classList.remove('show');
        _courses = [];
        await loadCourses();
    });

    $('cancelAddCourseBtn')?.addEventListener('click', () => $('addCourseModal')?.classList.remove('show'));
    $('closeAddCourseModal')?.addEventListener('click', () => $('addCourseModal')?.classList.remove('show'));

    // ── Nút Sửa khoá học (editCourseBtn) ─────────────────────────────────────
    let selectedCourseId = null;

    $('coursesTable')?.addEventListener('click', e => {
        const tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        $('coursesTable').querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
        if (selectedCourseId === tr.dataset.id) {
            selectedCourseId = null;
        } else {
            tr.classList.add('selected-row');
            selectedCourseId = tr.dataset.id;
        }
    });

    $('editCourseBtn')?.addEventListener('click', () => {
        if (!selectedCourseId) return showToast('Thông báo', 'Vui lòng chọn một khoá học trước.', 'error');
        const course = _courses.find(c => c.course_id === selectedCourseId);
        if (!course) return;

        if ($('editCourseName'))        $('editCourseName').value        = course.course_name  || '';
        if ($('editCourseDuration'))    $('editCourseDuration').value    = course.duration     || '';
        if ($('editCourseProvider'))    $('editCourseProvider').value    = course.certificate  || '';
        if ($('editCourseDescription')) $('editCourseDescription').value = course.description  || '';

        $('editCourseModal').style.display = 'flex';
    });

    $('saveEditCourseBtn')?.addEventListener('click', async () => {
        const name     = $('editCourseName')?.value.trim();
        const duration = parseInt($('editCourseDuration')?.value) || null;
        const cert     = $('editCourseProvider')?.value.trim() || null;
        const desc     = $('editCourseDescription')?.value.trim() || null;

        if (!name) return showToast('Lỗi', 'Vui lòng nhập tên khoá học.', 'error');

        const { error } = await window.supabaseClient
            .from('courses')
            .update({ course_name: name, duration, certificate: cert, description: desc, updated_at: new Date().toISOString() })
            .eq('course_id', selectedCourseId);

        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã cập nhật khoá học.');
        $('editCourseModal').style.display = 'none';
        _courses = [];
        await loadCourses();
    });

    $('cancelEditCourseBtn')?.addEventListener('click', () => { $('editCourseModal').style.display = 'none'; });
    $('closeEditCourseModal')?.addEventListener('click', () => { $('editCourseModal').style.display = 'none'; });

    // ── CRUD: Thêm/Sửa nhân sự ───────────────────────────────────────────────
    $('openAddModalBtn')?.addEventListener('click', () => openStaffModal(null));

    $('editStaffBtn')?.addEventListener('click', () => {
        if (!selectedId) {
            showToast('Thông báo', 'Vui lòng chọn một nhân sự trước.', 'error');
            return;
        }
        const emp = _employees.find(e => e.employee_id === selectedId);
        if (emp) openStaffModal(emp);
    });

    $('deleteStaffBtn')?.addEventListener('click', async () => {
        if (!selectedId) {
            showToast('Thông báo', 'Vui lòng chọn một nhân sự trước.', 'error');
            return;
        }
        const emp = _employees.find(e => e.employee_id === selectedId);
        if (!emp) return;
        if (!confirm(`Xác nhận xóa nhân sự "${emp.full_name}"?`)) return;
        const { error } = await DB.Employees.delete(selectedId);
        if (error) {
            console.error('[Delete Staff] error:', error);
            // FK constraint — cần xóa các bảng liên quan trước
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                showToast('Lỗi', 'Không thể xóa vì nhân sự này đang có dữ liệu liên quan (dự án, tổ chức, tài khoản...).', 'error');
            } else {
                showToast('Lỗi', error.message, 'error');
            }
            return;
        }
        showToast('Thành công', `Đã xóa nhân sự ${emp.full_name}.`);
        selectedId = null;
        await loadAll();
    });

    function openStaffModal(emp) {
        const modal = $('addStaffModal');
        if (!modal) return;
        const isEdit = !!emp;
        const h3 = modal.querySelector('h3');
        if (h3) h3.textContent = isEdit ? 'Sửa thông tin nhân sự' : 'Tiếp nhận nhân sự mới';

        // Load chức danh từ _positions
        const posSel = $('staffTitle');
        if (posSel && _positions.length) {
            posSel.innerHTML = '<option value="">-- Chọn chức danh --</option>' +
                _positions.map(p => `<option value="${p.position_id}" ${emp?.position_id===p.position_id?'selected':''}>${esc(p.position_name)}</option>`).join('');
        }

        // Load job levels
        const jlSel = $('staffJobLevel');
        if (jlSel && _jobLevels.length) {
            jlSel.innerHTML = '<option value="">-- Chọn cấp độ --</option>' +
                _jobLevels.map(j => `<option value="${j.jl_id}" ${emp?.jl_id===j.jl_id?'selected':''}>${esc(j.level_name)}</option>`).join('');
        }

        // Load Groups
        const groupSel = $('staffGroup');
        if (groupSel && _groups.length) {
            groupSel.innerHTML = '<option value="">-- Chọn Group --</option>' +
                _groups.map(g => `<option value="${g.group_id}">${esc(g.group_name)}</option>`).join('');
        }

        // Load Teams theo Group khi chọn
        const teamSel = $('staffTeam');
        const subTeamSel = $('staffManager');

        function loadTeams(groupId) {
            if (!teamSel) return;
            const filtered = groupId ? _teams.filter(t => t.group_id === groupId) : _teams;
            teamSel.innerHTML = '<option value="">-- Chọn Team --</option>' +
                filtered.map(t => `<option value="${t.team_id}">${esc(t.team_name)}</option>`).join('');
            if (subTeamSel) subTeamSel.innerHTML = '<option value="">-- Chọn Sub-team --</option>';
        }

        function loadSubTeams(teamId) {
            if (!subTeamSel) return;
            const filtered = teamId ? _subTeams.filter(s => s.team_id === teamId) : _subTeams;
            subTeamSel.innerHTML = '<option value="">-- Chọn Sub-team --</option>' +
                filtered.map(s => `<option value="${s.sub_team_id}">${esc(s.sub_team_name)}</option>`).join('');
        }

        groupSel?.addEventListener('change', () => loadTeams(groupSel.value));
        teamSel?.addEventListener('change',  () => loadSubTeams(teamSel.value));

        loadTeams('');

        // Fill dữ liệu khi sửa
        if (isEdit) {
            if ($('staffFullName'))  $('staffFullName').value  = emp.full_name || '';
            if ($('staffBirthDate')) $('staffBirthDate').value = emp.day_of_birth?.slice(0,10) || '';
            if ($('staffJobLevel') && emp.jl_id) $('staffJobLevel').value = emp.jl_id;

            // Fill Group/Team/Sub-team từ employee_organizations
            const activeOrg = _empOrgs.find(o => o.employee_id === emp.employee_id && o.status === 'active')
                           || _empOrgs.find(o => o.employee_id === emp.employee_id);
            if (activeOrg) {
                const gId = activeOrg.group_id;
                const tId = activeOrg.team_id;
                const sId = activeOrg.sub_team_id;
                if (groupSel && gId) { groupSel.value = gId; loadTeams(gId); }
                setTimeout(() => {
                    if (teamSel && tId) { teamSel.value = tId; loadSubTeams(tId); }
                    setTimeout(() => {
                        if (subTeamSel && sId) subTeamSel.value = sId;
                    }, 50);
                }, 50);
            }
        } else {
            modal.querySelectorAll('input[type="text"],input[type="date"]').forEach(i => i.value = '');
        }
        modal.classList.add('show');

        const saveBtn = $('saveAddModalBtn');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const fullName   = $('staffFullName')?.value.trim();
                const birthDate  = $('staffBirthDate')?.value || null;
                const positionId = $('staffTitle')?.value || null;
                const jlId       = $('staffJobLevel')?.value || null;
                const subTeamId  = $('staffManager')?.value || null;

                if (!fullName) return showToast('Lỗi', 'Vui lòng nhập họ tên.', 'error');
                if (!jlId)     return showToast('Lỗi', 'Vui lòng chọn cấp độ.', 'error');

                const payload = {
                    full_name:    fullName,
                    day_of_birth: birthDate,
                    position_id:  positionId,
                    jl_id:        jlId,
                    status:       isEdit ? (emp.status || 'active') : 'probation',
                    hire_date:    isEdit ? emp.hire_date : new Date().toISOString().slice(0,10)
                };

                const { data: savedEmp, error } = isEdit
                    ? await DB.Employees.update(emp.employee_id, payload)
                    : await DB.Employees.create(payload);
                if (error) return showToast('Lỗi', error.message, 'error');

                // Cập nhật employee_organizations nếu có chọn sub-team
                const empId = isEdit ? emp.employee_id : savedEmp?.employee_id;
                if (empId && subTeamId) {
                    // Deactivate org cũ
                    await window.supabaseClient
                        .from('employee_organizations')
                        .update({ status: 'inactive' })
                        .eq('employee_id', empId);
                    // Thêm org mới
                    await window.supabaseClient
                        .from('employee_organizations')
                        .insert({ employee_id: empId, sub_team_id: subTeamId, status: 'active' });
                }

                showToast('Thành công', isEdit ? 'Đã cập nhật nhân sự.' : 'Đã thêm nhân sự.');
                modal.classList.remove('show');
                await loadAll();
            };
        }
    }

    // Close modals
    document.querySelectorAll('.bosch-modal-close, .close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.bosch-modal-overlay, .modal-overlay')?.classList.remove('show');
        });
    });

    // ── CRUD: Gán dự án ───────────────────────────────────────────────────────
    let _projects = [];

    async function openAssignModal() {
        if (!selectedId) {
            showToast('Thông báo', 'Vui lòng chọn một nhân sự trước.', 'error');
            return;
        }
        const modal = $('assignProjectModal');
        if (!modal) return;

        const emp = _employees.find(e => e.employee_id === selectedId);

        // Cập nhật thông tin nhân viên trong modal
        const aName = modal.querySelector('.a-name');
        const aRole = modal.querySelector('.a-role');
        if (aName) aName.textContent = emp?.full_name || '—';
        if (aRole) {
            const posName = _positions.find(p => p.position_id === emp?.position_id)?.position_name || '';
            aRole.textContent = posName;
        }

        // Reset fields
        if ($('assignAllocation')) $('assignAllocation').value = '';
        const reqSel = $('assignRequest');
        if (reqSel) { reqSel.innerHTML = '<option value="">-- Chọn dự án trước --</option>'; reqSel.disabled = true; }

        // Load projects nếu chưa có
        if (_projects.length === 0) {
            const { data, error } = await window.supabaseClient
                .from('projects')
                .select('project_id, project_code, project_name')
                .order('project_name');
            if (!error && data) _projects = data;
        }

        const projSel = $('assignProject');
        if (projSel) {
            projSel.innerHTML = '<option value="">-- Chọn dự án --</option>' +
                _projects.map(p => `<option value="${p.project_id}">[${p.project_code}] ${p.project_name}</option>`).join('');
        }

        modal.classList.add('show');
    }

    // Khi chọn dự án → load resource requests
    $('assignProject')?.addEventListener('change', async function () {
        const projectId = this.value;
        const reqSel = $('assignRequest');
        if (!reqSel) return;

        if (!projectId) {
            reqSel.innerHTML = '<option value="">-- Chọn dự án trước --</option>';
            reqSel.disabled = true;
            return;
        }

        reqSel.innerHTML = '<option value="">Đang tải...</option>';
        reqSel.disabled = true;

        const { data, error } = await window.supabaseClient
            .from('project_resource_requests')
            .select('project_resource_request_id, quantity, positions(position_name)')
            .eq('project_id', projectId);

        if (error || !data || data.length === 0) {
            reqSel.innerHTML = '<option value="">Không có yêu cầu nguồn lực</option>';
            return;
        }

        reqSel.innerHTML = '<option value="">-- Chọn yêu cầu --</option>' +
            data.map(r => `<option value="${r.project_resource_request_id}">${r.positions?.position_name || 'N/A'} (SL: ${r.quantity})</option>`).join('');
        reqSel.disabled = false;
    });

    $('openAssignModalBtn')?.addEventListener('click', openAssignModal);

    $('saveAssignBtn')?.addEventListener('click', async () => {
        const requestId  = $('assignRequest')?.value;
        const allocation = parseFloat($('assignAllocation')?.value);

        if (!requestId) return showToast('Lỗi', 'Vui lòng chọn yêu cầu nguồn lực.', 'error');
        if (!allocation || allocation < 1 || allocation > 100) return showToast('Lỗi', 'Tỷ lệ phân bổ phải từ 1% đến 100%.', 'error');

        const saveBtn = $('saveAssignBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i>Đang lưu...';

        const { error } = await window.supabaseClient
            .from('project_assignments')
            .insert({
                project_resource_request_id: requestId,
                employee_id: selectedId,
                allocation_percent: allocation
            });

        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Cập nhật';

        if (error) return showToast('Lỗi', error.message, 'error');

        showToast('Thành công', 'Đã gán dự án thành công.');
        $('assignProjectModal')?.classList.remove('show');
        await loadAll();
    });

    $('closeAssignModal')?.addEventListener('click', () => $('assignProjectModal')?.classList.remove('show'));
    $('cancelAssignBtn')?.addEventListener('click', () => $('assignProjectModal')?.classList.remove('show'));

    // ── Khởi động ─────────────────────────────────────────────────────────────
    await loadAll();
});
