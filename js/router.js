/**
 * Định nghĩa và điều hướng 9 route của ứng dụng (multi-page).
 * Tích hợp phân quyền theo role: DH | GM | DM | OP
 */
(function () {
    const ROUTES = [
        { id: 'login',          file: 'index.html',         auth: 'public',   title: 'Đăng nhập' },
        { id: 'forgot-password',file: 'forgot-password.html',auth: 'public',  title: 'Quên mật khẩu' },
        { id: 'dashboard',      file: 'dashboard.html',     auth: 'required', title: 'Dashboard' },
        { id: 'hr',             file: 'hr.html',            auth: 'required', title: 'Nhân sự' },
        { id: 'operations',     file: 'operations.html',    auth: 'required', title: 'Vận hành' },
        { id: 'budget',         file: 'budget.html',        auth: 'required', title: 'Ngân sách' },
        { id: 'organization',   file: 'organization.html',  auth: 'required', title: 'Tổ chức' },
        { id: 'activity-log',   file: 'activity-log.html',  auth: 'required', title: 'Nhật ký' },
        { id: 'account',        file: 'account.html',       auth: 'required', title: 'Tài khoản' }
    ];

    // ── PAGE ACCESS MAP ───────────────────────────────────────────────────────
    // Định nghĩa role nào được truy cập trang nào
    // Nếu trang không có trong map → tất cả role đều truy cập được
    const PAGE_ACCESS = {
        'hr.html':           ['DH', 'GM', 'DM'],    // OP không thấy Nhân sự
        'organization.html': ['DH', 'GM', 'DM'],    // OP không thấy Cơ cấu tổ chức
        'activity-log.html': ['DH', 'GM', 'DM', 'OP'], // tất cả xem được, GM mới thao tác
    };

    // ── PERMISSION MAP ────────────────────────────────────────────────────────
    // Nguyên tắc: TẤT CẢ role đều XEM được mọi trang/tab
    // Chỉ khác nhau ở quyền THAO TÁC (thêm/sửa/xóa)
    // role_code: DH | GM | DM | OP
    const PERMISSIONS = {
        // Dashboard — chỉ GM xuất/gửi báo cáo
        'dashboard.export':        ['GM'],

        // HR — GM, DM thêm/sửa/xóa nhân sự
        'hr.add_staff':            ['GM', 'DM'],
        'hr.edit_staff':           ['GM', 'DM'],

        // HR — Tab Phê duyệt nguồn lực:
        //   OP không thấy màn hình, DH chỉ xem, GM+DM thao tác
        'hr.tab_dm_approval':      ['DH', 'GM', 'DM'],  // OP bị ẩn tab
        'hr.tab_dm_approval_edit': ['GM', 'DM'],         // nút Duyệt/Từ chối

        // HR — Lộ trình phát triển: GM, DM thao tác (tab hiện với tất cả)
        'hr.tab_roadmap_edit':     ['GM', 'DM'],

        // Tổ chức — chỉ GM thêm/sửa Group, Team; OP không thấy nút
        'org.edit':                ['GM'],
        'org.view_buttons':        ['GM'],  // chỉ GM thấy và dùng được 4 nút

        // Vận hành — GM, DM thao tác
        'ops.edit':                ['GM', 'DM'],

        // Ngân sách — GM, OP thao tác
        'budget.edit':             ['GM', 'OP'],

        // Nhật ký — chỉ GM thao tác
        'log.manage':              ['GM'],
    };

    // ── HELPERS ───────────────────────────────────────────────────────────────
    function currentFile() {
        const file = window.location.pathname.split('/').pop();
        return file && file.length > 0 ? file : 'index.html';
    }

    function getCurrentRoute() {
        const file = currentFile();
        return ROUTES.find((r) => r.file === file) || ROUTES[0];
    }

    function isAuthenticated() {
        return !!localStorage.getItem('currentUser');
    }

    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
    }

    function getCurrentRole() {
        return getCurrentUser()?.role_code || '';
    }

    /**
     * Kiểm tra role hiện tại có quyền thực hiện action không
     * @param {string} action - key trong PERMISSIONS
     */
    function can(action) {
        const role = getCurrentRole();
        const allowed = PERMISSIONS[action] || [];
        return allowed.includes(role);
    }

    /**
     * Ẩn element nếu không có quyền
     * @param {string|Element} selector
     * @param {string} action
     */
    function applyPermission(selector, action) {
        const els = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : [selector];
        const allowed = can(action);
        els.forEach(el => {
            if (!el) return;
            if (!allowed) {
                el.style.display = 'none';
                el.setAttribute('data-perm-hidden', '1');
            }
        });
    }

    /**
     * Disable (không ẩn) element nếu không có quyền — dùng cho readonly mode
     */
    function applyReadonly(selector, action) {
        const els = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : [selector];
        const allowed = can(action);
        els.forEach(el => {
            if (!el) return;
            if (!allowed) {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor  = 'not-allowed';
                el.setAttribute('data-perm-readonly', '1');
                el.addEventListener('click', e => e.stopPropagation(), true);
            }
        });
    }

    // ── APPLY PERMISSIONS PER PAGE ────────────────────────────────────────────
    function applyPagePermissions() {
        const file = currentFile();
        const role = getCurrentRole();
        console.log(`[Permission] file=${file} role=${role}`);

        if (file === 'dashboard.html') {
            applyPermission('.btn-report-auto', 'dashboard.export');
            applyPermission('.btn-export',      'dashboard.export');
        }

        if (file === 'hr.html') {
            // Tab Phê duyệt nguồn lực — OP không thấy tab, DH thấy nhưng không thao tác
            applyPermission('[data-tab="dm-approval"]', 'hr.tab_dm_approval');

            // Danh sách nhân sự — GM, DM mới thấy và thao tác
            applyPermission('#openAddModalBtn',    'hr.add_staff');
            applyPermission('#openAssignModalBtn', 'hr.add_staff');
            applyPermission('#editStaffBtn',       'hr.add_staff');
            applyPermission('#deleteStaffBtn',     'hr.add_staff');

            // Lộ trình phát triển — nút thao tác chỉ GM, DM
            applyPermission('#editRoadmapBtn', 'hr.tab_roadmap_edit');
            applyPermission('#addCourseBtn',   'hr.tab_roadmap_edit');
            applyPermission('#editCourseBtn',  'hr.tab_roadmap_edit');
        }

        if (file === 'organization.html') {
            // OP không thấy nút; DH, DM thấy nhưng không click được
            applyPermission('#openAddGroupBtn',   'org.view_buttons');
            applyPermission('#openAddTeamBtn',    'org.view_buttons');
            applyPermission('#openAddSubTeamBtn', 'org.view_buttons');
            applyPermission('#openEditOrgBtn',    'org.view_buttons');
        }

        if (file === 'operations.html') {
            applyPermission('#openAddCustomerModalBtn',  'ops.edit');
            applyPermission('#openEditCustomerModalBtn', 'ops.edit');
            applyPermission('#deleteCustomerBtn',        'ops.edit');
            applyPermission('#openAddContractModalBtn',  'ops.edit');
            applyPermission('#editContractBtn',          'ops.edit');
            applyPermission('#deleteContractBtn',        'ops.edit');
            applyPermission('#renewContractBtn',         'ops.edit');
            applyPermission('#openAddProjectModalBtn',   'ops.edit');
            applyPermission('#editProjectBtn',           'ops.edit');
            applyPermission('#deleteProjectBtn',         'ops.edit');
        }

        if (file === 'budget.html') {
            applyPermission('#openAddServiceLineBtn', 'budget.edit');
            applyPermission('#editServiceLineBtn',    'budget.edit');
            applyPermission('#deleteServiceLineBtn',  'budget.edit');
            applyPermission('#editPartBtn',           'budget.edit');
            applyPermission('#syncRevenueBtn',        'budget.edit');
        }

        if (file === 'activity-log.html') {
            applyPermission('.btn-export-log', 'log.manage');
        }
    }

    function redirect(file) {
        if (currentFile() !== file) {
            window.location.href = file;
        }
    }

    /**
     * Kiểm tra role hiện tại có được truy cập trang này không
     */
    function canAccessPage(file) {
        const allowed = PAGE_ACCESS[file];
        if (!allowed) return true; // không giới hạn → cho phép
        const role = getCurrentRole();
        return allowed.includes(role);
    }

    /**
     * Ẩn các nav item mà role hiện tại không được truy cập
     */
    function applyNavPermissions() {
        const role = getCurrentRole();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkFile = href.split('/').pop();
            const allowed = PAGE_ACCESS[linkFile];
            if (allowed && !allowed.includes(role)) {
                link.style.display = 'none';
            }
        });
    }

    function setActiveNav() {
        const file = currentFile();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkFile = href.split('/').pop();
            link.classList.toggle('active', linkFile === file);
        });
    }

    function updateSidebar(user) {
        const sidebarName     = document.getElementById('sidebarName');
        const sidebarPosition = document.getElementById('sidebarPosition');
        const sidebarAvatar   = document.getElementById('sidebarAvatar');

        const name   = user.full_name || user.username || 'User';
        // Hiển thị role_name thay vì position (chức danh kỹ thuật)
        const pos    = user.role_name || user.position || 'Nhân viên';
        const avatar = user.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=BC0004&color=fff&rounded=true`;

        if (sidebarName)     sidebarName.textContent = name;
        if (sidebarPosition) sidebarPosition.textContent = pos;
        if (sidebarAvatar)   sidebarAvatar.src = avatar;
    }

    function setupLogout() {
        document.querySelectorAll('.logout-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('currentUser');
                redirect('index.html');
            });
        });
    }

    function init() {
        const route  = getCurrentRoute();
        const authed = isAuthenticated();

        if (route.auth === 'required' && !authed) {
            redirect('index.html');
            return;
        }

        if (route.file === 'index.html' && authed) {
            redirect('dashboard.html');
            return;
        }

        // Kiểm tra quyền truy cập trang theo role
        if (route.auth === 'required' && authed && !canAccessPage(route.file)) {
            redirect('dashboard.html');
            return;
        }

        if (authed) {
            try {
                const user = getCurrentUser();
                updateSidebar(user);
            } catch (_) {
                localStorage.removeItem('currentUser');
                redirect('index.html');
                return;
            }
        }

        if (route.auth === 'required') {
            setActiveNav();
            setupLogout();
            // Ẩn nav item không có quyền truy cập
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    applyNavPermissions();
                    applyPagePermissions();
                });
            } else {
                applyNavPermissions();
                applyPagePermissions();
            }
        }

        document.title = document.title.includes('Bosch')
            ? document.title
            : `${route.title} | Bosch HR Management`;
    }

    window.AppRouter = {
        ROUTES,
        PERMISSIONS,
        PAGE_ACCESS,
        getCurrentRoute,
        getCurrentUser,
        getCurrentRole,
        isAuthenticated,
        can,
        canAccessPage,
        applyPermission,
        applyReadonly,
        applyPagePermissions,
        applyNavPermissions,
        redirect,
        init,
        defaultAfterLogin: 'dashboard.html'
    };
})();
