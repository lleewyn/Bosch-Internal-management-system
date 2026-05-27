/**
 * Cơ cấu tổ chức — điều hướng, thêm group/team, tìm kiếm, collapse/expand
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.MockStore || !window.PageCommon) return;
    PageCommon.injectFormStyles();

    const deptHeader = document.getElementById('deptHeader');
    const groupItems = ['groupA_item', 'groupB_item', 'groupC_item', 'groupD_item'].map((id) =>
        document.getElementById(id)
    );
    const charts = ['chartOverview', 'chartGroupA', 'chartGroupB', 'chartGroupC', 'chartGroupD'].map((id) =>
        document.getElementById(id)
    );

    // ── Collapse/Expand nodes ────────────────────────────────────────────────
    function initCollapseToggle() {
        document.querySelectorAll('.org-tree li').forEach(li => {
            const childUl = li.querySelector(':scope > ul');
            if (!childUl) return;
            const node = li.querySelector(':scope > .org-node');
            if (!node || node.dataset.toggleBound) return; // tránh duplicate

            node.dataset.toggleBound = '1';
            node.classList.add('has-children');

            node.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = childUl.classList.toggle('org-children-collapsed');
                node.classList.toggle('is-collapsed', isCollapsed);
            });
        });
    }

    // ── Switch view ──────────────────────────────────────────────────────────
    function switchView(activeItem, activeChart) {
        [deptHeader, ...groupItems].forEach((i) => i?.classList.remove('active'));
        activeItem?.classList.add('active');
        charts.forEach((c) => { if (c) c.style.display = 'none'; });
        if (activeChart) {
            activeChart.style.display = 'flex';
            setTimeout(initCollapseToggle, 50);
        }
    }

    deptHeader?.addEventListener('click', () => switchView(deptHeader, charts[0]));
    groupItems.forEach((item, i) => {
        item?.addEventListener('click', () => switchView(item, charts[i + 1]));
    });

    // Init toggle cho chart mặc định đang hiển thị
    setTimeout(initCollapseToggle, 100);

    // ── Refresh sidebar ──────────────────────────────────────────────────────
    function refreshSidebar() {
        const groups = MockStore.getOrgGroups();
        groups.forEach((g, i) => {
            const el = groupItems[i];
            if (!el) return;
            const title = el.querySelector('h4, .group-title, strong');
            if (title) title.textContent = g.name;
            const meta = el.querySelector('p, .group-meta, span');
            if (meta) meta.textContent = `${g.members} thành viên · ${g.teams} team`;
        });
        const totalStaff = MockStore.getStaff().length;
        const deptMeta = deptHeader?.querySelector('p, span');
        if (deptMeta) deptMeta.textContent = `${totalStaff} nhân sự · ${groups.length} group`;
    }

    // ── Modals ───────────────────────────────────────────────────────────────
    const gModal = document.getElementById('addGroupModal');
    const tModal = document.getElementById('addTeamModal');

    const teamGroupSelect = tModal?.querySelector('select');
    if (teamGroupSelect) {
        teamGroupSelect.innerHTML = MockStore.getOrgGroups()
            .map((g) => `<option value="${g.id}">${UI.escape(g.name)}</option>`)
            .join('');
    }

    document.getElementById('openAddGroupBtn')?.addEventListener('click', () => {
        gModal?.querySelector('input') && (gModal.querySelector('input').value = '');
        gModal?.classList.add('show');
    });
    document.getElementById('closeGroupModal')?.addEventListener('click', () => gModal?.classList.remove('show'));
    document.getElementById('cancelGroupBtn')?.addEventListener('click', () => gModal?.classList.remove('show'));
    document.getElementById('saveGroupBtn')?.addEventListener('click', () => {
        const name = gModal?.querySelector('input')?.value.trim();
        if (!name) return showToast('Lỗi', 'Nhập tên group.', 'error');
        MockStore.addOrgGroup({ name, manager: 'Chưa gán', members: 0, teams: 1 });
        gModal.classList.remove('show');
        showToast('Thành công', `Đã tạo ${name}`);
        refreshSidebar();
        if (teamGroupSelect) {
            teamGroupSelect.innerHTML = MockStore.getOrgGroups()
                .map((g) => `<option value="${g.id}">${UI.escape(g.name)}</option>`)
                .join('');
        }
    });

    document.getElementById('openAddTeamBtn')?.addEventListener('click', () => tModal?.classList.add('show'));
    document.getElementById('closeTeamModal')?.addEventListener('click', () => tModal?.classList.remove('show'));
    document.getElementById('cancelTeamBtn')?.addEventListener('click', () => tModal?.classList.remove('show'));
    document.getElementById('saveTeamBtn')?.addEventListener('click', () => {
        const inputs = tModal?.querySelectorAll('input');
        const name = inputs?.[1]?.value.trim() || inputs?.[0]?.value.trim();
        const groupId = teamGroupSelect?.value || 'g-a';
        if (!name) return showToast('Lỗi', 'Nhập tên team.', 'error');
        MockStore.addOrgTeam({ groupId, name, dm: 'Chưa gán' });
        const g = MockStore.getOrgGroups().find((x) => x.id === groupId);
        if (g) {
            g.teams = (g.teams || 0) + 1;
            MockStore.save();
        }
        tModal.classList.remove('show');
        showToast('Thành công', `Đã tạo team ${name}`);
        refreshSidebar();
    });

    // ── Search ───────────────────────────────────────────────────────────────
    const searchInp =
        document.querySelector('.org-search input') ||
        document.querySelector('[placeholder*="Tìm kiếm nhân sự"]');
    searchInp?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.org-node').forEach((node) => {
            const match = !term || node.textContent.toLowerCase().includes(term);
            node.style.opacity = match ? '1' : '0.2';
            node.style.pointerEvents = match ? 'auto' : 'none';
        });
    });

    // ── Toggle sidebar ───────────────────────────────────────────────────────
    document.getElementById('toggleSidebarBtn')?.addEventListener('click', () => {
        document.querySelector('.org-sidebar')?.classList.toggle('collapsed');
    });

    // ── Close modals on backdrop click ───────────────────────────────────────
    [gModal, tModal].forEach((m) => {
        m?.addEventListener('click', (e) => {
            if (e.target === m) m.classList.remove('show');
        });
    });

    refreshSidebar();
});
