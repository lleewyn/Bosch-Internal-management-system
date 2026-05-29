/**
 * Cơ cấu tổ chức — load từ Supabase, render org chart động
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.PageCommon) return;
    PageCommon.injectFormStyles();

    const $ = (id) => document.getElementById(id);

    // Data cache
    let _groups    = [];
    let _teams     = [];
    let _subTeams  = [];
    let _employees = [];
    let _orgMap    = {}; // { group_id: count }

    let _dhName = '—'; // Tên Head of Department
    let activeGroupId = null; // null = overview
    let activeTeamId  = null; // team đang được chọn/xem

    // ── Load data ─────────────────────────────────────────────────────────────
    async function loadAll() {
        const [grpRes, teamRes, subRes, empRes, orgRes, dhRes] = await Promise.all([
            DB.Org.getGroups(),
            DB.Org.getTeams(),
            DB.Org.getSubTeams(),
            DB.Employees.getAll(),
            window.supabaseClient.from('employee_organizations').select('group_id, status'),
            // Lấy user có role DH
            window.supabaseClient
                .from('users')
                .select('employees(full_name)')
                .eq('role_id', '11111111-0000-0000-0000-000000000001')
                .limit(1)
                .single()
        ]);
        if (grpRes.data)  _groups    = grpRes.data;
        if (teamRes.data) _teams     = teamRes.data;
        if (subRes.data)  _subTeams  = subRes.data;
        if (empRes.data)  _employees = empRes.data;
        if (dhRes.data)   _dhName    = dhRes.data.employees?.full_name || '—';

        // Đếm thành viên active theo group_id
        _orgMap = {};
        if (orgRes.data) {
            orgRes.data.forEach(o => {
                if (o.status === 'active' && o.group_id) {
                    _orgMap[o.group_id] = (_orgMap[o.group_id] || 0) + 1;
                }
            });
        }

        renderSidebar();
        renderChart(null);
        setTimeout(bindNodeSelect, 200);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc(v) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function avatar(name, bg='6c757d') {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff`;
    }

    function getManagerName(managerId) {
        if (!managerId) return '—';
        const emp = _employees.find(e => e.employee_id === managerId);
        return emp?.full_name || '—';
    }

    function countMembers(groupId) {
        return _orgMap[groupId] || 0;
    }

    // ── Render Sidebar ────────────────────────────────────────────────────────
    function renderSidebar() {
        const deptHeader = $('deptHeader');
        const groupList  = document.querySelector('.group-list');
        if (!groupList) return;

        // Cập nhật tên DH — lấy từ DB user có role DH
        const deptLeaderName = $('deptLeaderName');
        if (deptLeaderName) deptLeaderName.textContent = _dhName.toUpperCase();

        // Cập nhật badge số liệu
        const totalEmp  = _employees.length;
        const deptBadge = $('deptBadgeText') || deptHeader?.querySelector('.badge');
        if (deptBadge) deptBadge.textContent = `${totalEmp} thành viên • ${_groups.length} Groups`;

        // Render group list
        groupList.innerHTML = _groups.map(g => {
            const memberCount = countMembers(g.group_id);
            const teamCount   = _teams.filter(t => t.group_id === g.group_id).length;
            const isActive    = activeGroupId === g.group_id;
            return `<div class="group-item ${isActive?'active':''}" data-group-id="${g.group_id}" style="cursor:pointer;">
                <div class="group-icon"><i class="fa-solid fa-layer-group"></i></div>
                <div class="group-text">
                    <div class="g-id">${esc(g.group_name)}</div>
                    <div class="g-name">${esc(getManagerName(g.manager_id))}</div>
                    <div class="badge badge-muted">${memberCount} thành viên • ${teamCount} Teams</div>
                </div>
            </div>`;
        }).join('');

        // Bind click
        groupList.querySelectorAll('.group-item[data-group-id]').forEach(item => {
            item.addEventListener('click', () => {
                const gid = item.dataset.groupId;
                activeGroupId = activeGroupId === gid ? null : gid;

                // Set _editTarget khi click sidebar group
                if (activeGroupId) {
                    const g = _groups.find(x => x.group_id === activeGroupId);
                    if (g) _editTarget = { type: 'group', id: g.group_id, name: g.group_name };
                } else {
                    _editTarget = null;
                }

                renderSidebar();
                renderChart(activeGroupId);
                setTimeout(bindNodeSelect, 200);
            });
        });

        // Dept header click → overview
        deptHeader?.addEventListener('click', () => {
            activeGroupId = null;
            renderSidebar();
            renderChart(null);
        });
    }

    // ── Render Org Chart ──────────────────────────────────────────────────────
    function renderChart(groupId) {
        const container = document.querySelector('.org-chart-container');
        if (!container) return;

        if (!groupId) {
            renderOverview(container);
        } else {
            renderGroupDetail(container, groupId);
        }

        setTimeout(initCollapseToggle, 50);
    }

    function renderOverview(container) {
        const groupNodes = _groups.map(g => {
            const managerName = getManagerName(g.manager_id);
            const teamCount   = _teams.filter(t => t.group_id === g.group_id).length;
            return `<li>
                <div class="org-node" data-type="group" data-id="${g.group_id}" data-name="${esc(g.group_name)}" style="cursor:pointer;" onclick="document.querySelector('[data-group-id=\\'${g.group_id}\\']')?.click()">
                    <div class="badge badge-danger">MANAGER OF ${esc(g.group_name.toUpperCase())}</div>
                    <div class="n-title">${esc(g.group_name.toUpperCase())}</div>
                    <img src="${avatar(managerName)}" class="n-avatar" alt="Avatar">
                    <div class="n-name">${esc(managerName)}</div>
                    <div class="badge badge-muted" style="color:var(--text-secondary);">${teamCount} Teams</div>
                </div>
            </li>`;
        }).join('');

        container.innerHTML = `<div class="org-tree" id="chartOverview">
            <ul>
                <li>
                    <div class="org-node root-node">
                        <div class="badge badge-info">HEAD OF DEPARTMENT</div>
                        <img src="${avatar('Head of Department','6c757d')}" class="n-avatar" alt="Avatar">
                        <div class="n-name" style="font-size:15px;">Bosch Technical Center</div>
                        <div class="badge badge-muted">${_employees.length} nhân sự</div>
                    </div>
                    <ul>${groupNodes}</ul>
                </li>
            </ul>
        </div>`;
    }

    function renderGroupDetail(container, groupId) {
        const group  = _groups.find(g => g.group_id === groupId);
        if (!group) return;

        const managerName = getManagerName(group.manager_id);
        const groupTeams  = _teams.filter(t => t.group_id === groupId);
        const memberCount = countMembers(groupId);

        const teamNodes = groupTeams.map(team => {
            const teamManager  = getManagerName(team.manager_id);
            const teamSubTeams = _subTeams.filter(s => s.team_id === team.team_id);

            const subNodes = teamSubTeams.map(sub => {
                const subManager = getManagerName(sub.manager_id);
                return `<li>
                    <div class="org-node sub-node" data-type="subteam" data-id="${sub.sub_team_id}" data-name="${esc(sub.sub_team_name)}">
                        <div class="badge badge-member" style="font-size:9px;font-weight:700;">KEY MEMBER</div>
                        <div class="n-title">${esc(sub.sub_team_name)}</div>
                        <img src="${avatar(subManager)}" class="n-avatar" alt="Avatar">
                        <div class="n-name">${esc(subManager)}</div>
                        <div class="badge badge-muted">Sub-team</div>
                    </div>
                </li>`;
            }).join('');

            return `<li>
                <div class="org-node" data-type="team" data-id="${team.team_id}" data-name="${esc(team.team_name)}">
                    <div class="badge badge-leader">TEAM LEADER</div>
                    <div class="n-title">${esc(team.team_name.toUpperCase())}</div>
                    <img src="${avatar(teamManager)}" class="n-avatar" alt="Avatar">
                    <div class="n-name">${esc(teamManager)}</div>
                    <div class="badge badge-muted" style="color:var(--text-secondary);">${teamSubTeams.length} Sub-team</div>
                </div>
                ${subNodes ? `<ul>${subNodes}</ul>` : ''}
            </li>`;
        }).join('');

        container.innerHTML = `<div class="org-tree gray-lines">
            <ul>
                <li>
                    <div class="org-node root-node" data-type="group" data-id="${group.group_id}" data-name="${esc(group.group_name)}">
                        <div class="badge badge-danger">MANAGER OF ${esc(group.group_name.toUpperCase())}</div>
                        <div class="n-title">${esc(group.group_name.toUpperCase())}</div>
                        <img src="${avatar(managerName)}" class="n-avatar" alt="Avatar">
                        <div class="n-name" style="font-size:15px;">${esc(managerName)}</div>
                        <div class="badge badge-muted">${memberCount} thành viên</div>
                    </div>
                    ${teamNodes ? `<ul>${teamNodes}</ul>` : ''}
                </li>
            </ul>
        </div>`;
    }

    // ── Collapse/Expand ───────────────────────────────────────────────────────
    function initCollapseToggle() {
        document.querySelectorAll('.org-tree li').forEach(li => {
            const childUl = li.querySelector(':scope > ul');
            if (!childUl) return;
            const node = li.querySelector(':scope > .org-node');
            if (!node || node.dataset.toggleBound) return;
            node.dataset.toggleBound = '1';
            node.classList.add('has-children');
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = childUl.classList.toggle('org-children-collapsed');
                node.classList.toggle('is-collapsed', isCollapsed);
            });
        });
    }

    // ── Search ────────────────────────────────────────────────────────────────
    const searchInp = document.querySelector('.org-search input');
    searchInp?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.org-node').forEach(node => {
            const match = !term || node.textContent.toLowerCase().includes(term);
            node.style.opacity = match ? '1' : '0.2';
        });
    });

    // ── Toggle sidebar ────────────────────────────────────────────────────────
    $('toggleSidebarBtn')?.addEventListener('click', () => {
        document.querySelector('.org-sidebar')?.classList.toggle('collapsed');
    });

    // ── Employee autocomplete search ──────────────────────────────────────────
    function bindEmpSearch(inputId, dropdownId, hiddenId) {
        const inp  = document.getElementById(inputId);
        const drop = document.getElementById(dropdownId);
        const hid  = document.getElementById(hiddenId);
        if (!inp || !drop) return;

        function renderDrop(term) {
            const filtered = _employees.filter(e => {
                const name = (e.full_name || '').toLowerCase();
                const code = (e.employee_code || '').toLowerCase();
                return !term || name.includes(term) || code.includes(term);
            }).slice(0, 10);

            if (!filtered.length) {
                drop.innerHTML = `<div class="emp-dropdown-empty">Không tìm thấy nhân viên</div>`;
            } else {
                drop.innerHTML = filtered.map(e => `
                    <div class="emp-dropdown-item" data-id="${e.employee_id}" data-name="${esc(e.full_name)}">
                        <span class="emp-code">${esc(e.employee_code)}</span>
                        <span>${esc(e.full_name)}</span>
                        <span style="font-size:11px;color:#9ca3af;margin-left:auto;">${esc(e.positions?.position_name || '')}</span>
                    </div>`).join('');
            }
            drop.style.display = 'block';

            drop.querySelectorAll('.emp-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    inp.value = item.dataset.name;
                    if (hid) hid.value = item.dataset.id;
                    drop.style.display = 'none';
                });
            });
        }

        inp.addEventListener('focus', () => renderDrop(inp.value.toLowerCase()));
        inp.addEventListener('input', () => renderDrop(inp.value.toLowerCase()));
        document.addEventListener('click', (e) => {
            if (!inp.contains(e.target) && !drop.contains(e.target)) {
                drop.style.display = 'none';
            }
        });
    }

    // ── Thêm Group ────────────────────────────────────────────────────────────
    const gModal = $('addGroupModal');
    $('openAddGroupBtn')?.addEventListener('click', () => {
        gModal?.querySelectorAll('input:not([type=hidden])').forEach(i => i.value = '');
        document.getElementById('groupManagerId').value = '';
        document.getElementById('groupManagerDropdown').style.display = 'none';
        gModal?.classList.add('show');
        bindEmpSearch('groupManagerSearch', 'groupManagerDropdown', 'groupManagerId');
    });
    $('closeGroupModal')?.addEventListener('click',  () => gModal?.classList.remove('show'));
    $('cancelGroupBtn')?.addEventListener('click',   () => gModal?.classList.remove('show'));
    $('saveGroupBtn')?.addEventListener('click', async () => {
        const name      = document.getElementById('groupNameInput')?.value.trim();
        const managerId = document.getElementById('groupManagerId')?.value || null;
        if (!name) return showToast('Lỗi', 'Vui lòng nhập tên Group.', 'error');
        const { error } = await window.supabaseClient
            .from('groups')
            .insert({ group_name: name, manager_id: managerId, status: 'active' });
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', `Đã tạo Group "${name}".`);
        gModal.classList.remove('show');
        await loadAll();
    });

    // ── Thêm Team ─────────────────────────────────────────────────────────────
    const tModal = $('addTeamModal');
    $('openAddTeamBtn')?.addEventListener('click', () => {
        // Populate group select
        const sel = $('teamGroupSelect');
        if (sel) {
            sel.innerHTML = '<option value="">-- Chọn Group --</option>' +
                _groups.map(g => `<option value="${g.group_id}">${esc(g.group_name)}</option>`).join('');
            // Pre-select group đang xem
            if (activeGroupId) sel.value = activeGroupId;
        }
        tModal?.querySelectorAll('input:not([type=hidden])').forEach(i => i.value = '');
        document.getElementById('teamManagerId').value = '';
        document.getElementById('teamManagerDropdown').style.display = 'none';
        tModal?.classList.add('show');
        bindEmpSearch('teamManagerSearch', 'teamManagerDropdown', 'teamManagerId');
    });
    $('closeTeamModal')?.addEventListener('click',  () => tModal?.classList.remove('show'));
    $('cancelTeamBtn')?.addEventListener('click',   () => tModal?.classList.remove('show'));
    $('saveTeamBtn')?.addEventListener('click', async () => {
        const teamName  = document.getElementById('teamNameInput')?.value.trim();
        const groupId   = $('teamGroupSelect')?.value;
        const managerId = document.getElementById('teamManagerId')?.value || null;
        if (!teamName) return showToast('Lỗi', 'Vui lòng nhập tên Team.', 'error');
        if (!groupId)  return showToast('Lỗi', 'Vui lòng chọn Group.', 'error');
        const { error } = await window.supabaseClient
            .from('teams')
            .insert({ team_name: teamName, group_id: groupId, manager_id: managerId, status: 'active' });
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', `Đã tạo Team "${teamName}".`);
        tModal.classList.remove('show');
        await loadAll();
    });

    // Close on backdrop
    [gModal, tModal].forEach(m => {
        m?.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
    });

    // ── Thêm Sub-team ─────────────────────────────────────────────────────────
    const stModal = $('addSubTeamModal');
    $('openAddSubTeamBtn')?.addEventListener('click', () => {
        const sel = $('subTeamTeamSelect');
        if (sel) {
            sel.innerHTML = '<option value="">-- Chọn Team --</option>' +
                _teams.map(t => {
                    const groupName = _groups.find(g => g.group_id === t.group_id)?.group_name || '';
                    return `<option value="${t.team_id}">${esc(t.team_name)}${groupName ? ' (' + esc(groupName) + ')' : ''}</option>`;
                }).join('');
            // Pre-select team đang xem, hoặc team thuộc group đang xem
            if (activeTeamId) {
                sel.value = activeTeamId;
            } else if (activeGroupId) {
                const firstTeam = _teams.find(t => t.group_id === activeGroupId);
                if (firstTeam) sel.value = firstTeam.team_id;
            }
        }
        // Load danh sách nhân viên vào dropdown Leader
        const leaderSel = $('subTeamLeaderSelect');
        if (leaderSel) {
            leaderSel.innerHTML = '<option value="">-- Chọn Leader --</option>' +
                _employees
                    .filter(e => e.status === 'active' || e.status === 'probation')
                    .map(e => `<option value="${e.employee_id}">${esc(e.full_name)}${e.positions?.position_name ? ' — ' + esc(e.positions.position_name) : ''}</option>`)
                    .join('');
        }
        if ($('subTeamNameInput')) $('subTeamNameInput').value = '';
        stModal?.classList.add('show');
    });
    $('closeSubTeamModal')?.addEventListener('click', () => stModal?.classList.remove('show'));
    $('cancelSubTeamBtn')?.addEventListener('click',  () => stModal?.classList.remove('show'));
    $('saveSubTeamBtn')?.addEventListener('click', async () => {
        const name     = $('subTeamNameInput')?.value.trim();
        const teamId   = $('subTeamTeamSelect')?.value;
        const leaderId = $('subTeamLeaderSelect')?.value;
        if (!name)     return showToast('Lỗi', 'Vui lòng nhập tên Sub-team.', 'error');
        if (!teamId)   return showToast('Lỗi', 'Vui lòng chọn Team.', 'error');
        if (!leaderId) return showToast('Lỗi', 'Vui lòng chọn Leader.', 'error');
        const { error } = await window.supabaseClient
            .from('sub_teams')
            .insert({ sub_team_name: name, team_id: teamId, manager_id: leaderId, status: 'active' });
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', `Đã tạo Sub-team "${name}".`);
        stModal.classList.remove('show');
        await loadAll();
    });
    stModal?.addEventListener('click', e => { if (e.target === stModal) stModal.classList.remove('show'); });

    // ── Sửa (Group / Team / Sub-team) ────────────────────────────────────────
    // Nút Sửa mở modal với context của node đang được chọn
    let _editTarget = null; // { type: 'group'|'team'|'subteam', id, name }

    const eModal = $('editOrgModal');
    $('openEditOrgBtn')?.addEventListener('click', () => {
        if (!_editTarget) {
            showToast('Thông báo', 'Hãy click vào một Group, Team hoặc Sub-team trên sơ đồ để chọn trước.', 'error');
            return;
        }
        $('editOrgTitle').textContent = `Sửa ${_editTarget.type === 'group' ? 'Group' : _editTarget.type === 'team' ? 'Team' : 'Sub-team'}`;
        $('editOrgType').value        = _editTarget.type;
        $('editOrgId').value          = _editTarget.id;
        $('editOrgNameInput').value   = _editTarget.name;

        // Fill manager hiện tại
        const managerSearch = $('editOrgManagerSearch');
        const managerId     = $('editOrgManagerId');
        if (managerSearch) managerSearch.value = '';
        if (managerId)     managerId.value     = '';

        // Tìm manager_id của target hiện tại
        let currentManagerId = null;
        if (_editTarget.type === 'group') {
            currentManagerId = _groups.find(g => g.group_id === _editTarget.id)?.manager_id;
        } else if (_editTarget.type === 'team') {
            currentManagerId = _teams.find(t => t.team_id === _editTarget.id)?.manager_id;
        } else {
            currentManagerId = _subTeams.find(s => s.sub_team_id === _editTarget.id)?.manager_id;
        }
        if (currentManagerId) {
            const emp = _employees.find(e => e.employee_id === currentManagerId);
            if (emp && managerSearch) managerSearch.value = emp.full_name;
            if (managerId) managerId.value = currentManagerId;
        }

        // Bind search
        bindEmpSearch('editOrgManagerSearch', 'editOrgManagerDropdown', 'editOrgManagerId');
        eModal?.classList.add('show');
    });
    $('closeEditOrgModal')?.addEventListener('click', () => eModal?.classList.remove('show'));
    $('cancelEditOrgBtn')?.addEventListener('click',  () => eModal?.classList.remove('show'));
    $('saveEditOrgBtn')?.addEventListener('click', async () => {
        const type       = $('editOrgType')?.value;
        const id         = $('editOrgId')?.value;
        const name       = $('editOrgNameInput')?.value.trim();
        const managerId  = $('editOrgManagerId')?.value || null;
        if (!name) return showToast('Lỗi', 'Tên không được để trống.', 'error');

        const tableMap = { group: 'groups', team: 'teams', subteam: 'sub_teams' };
        const idMap    = { group: 'group_id', team: 'team_id', subteam: 'sub_team_id' };
        const nameMap  = { group: 'group_name', team: 'team_name', subteam: 'sub_team_name' };

        const { error } = await window.supabaseClient
            .from(tableMap[type])
            .update({ [nameMap[type]]: name, manager_id: managerId })
            .eq(idMap[type], id);
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã cập nhật thành công.');
        eModal.classList.remove('show');
        _editTarget = null;
        await loadAll();
    });
    eModal?.addEventListener('click', e => { if (e.target === eModal) eModal.classList.remove('show'); });

    // Gắn click chọn node để edit — gọi lại sau mỗi lần render
    function bindNodeSelect() {
        document.querySelectorAll('.org-node[data-type]').forEach(node => {
            if (node.dataset.editBound) return;
            node.dataset.editBound = '1';
            node.addEventListener('click', (e) => {
                e.stopPropagation();

                const type = node.dataset.type;
                const id   = node.dataset.id;
                const name = node.dataset.name;

                if (!type || !id) return;

                // Bỏ highlight cũ
                document.querySelectorAll('.org-node.edit-selected').forEach(n => n.classList.remove('edit-selected'));

                _editTarget = { type, id, name };
                node.classList.add('edit-selected');

                // Track active team để pre-select khi thêm sub-team
                if (type === 'team') activeTeamId = id;
            });
        });
    }

    // ── Khởi động ─────────────────────────────────────────────────────────────
    await loadAll();
});
