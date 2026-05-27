/**
 * Định nghĩa và điều hướng 9 route của ứng dụng (multi-page).
 */
(function () {
    const ROUTES = [
        { id: 'login', file: 'index.html', auth: 'public', title: 'Đăng nhập' },
        { id: 'forgot-password', file: 'forgot-password.html', auth: 'public', title: 'Quên mật khẩu' },
        { id: 'dashboard', file: 'dashboard.html', auth: 'required', title: 'Dashboard' },
        { id: 'hr', file: 'hr.html', auth: 'required', title: 'Nhân sự' },
        { id: 'operations', file: 'operations.html', auth: 'required', title: 'Vận hành' },
        { id: 'budget', file: 'budget.html', auth: 'required', title: 'Ngân sách' },
        { id: 'organization', file: 'organization.html', auth: 'required', title: 'Tổ chức' },
        { id: 'activity-log', file: 'activity-log.html', auth: 'required', title: 'Nhật ký' },
        { id: 'account', file: 'account.html', auth: 'required', title: 'Tài khoản' }
    ];

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

    function redirect(file) {
        if (currentFile() !== file) {
            window.location.href = file;
        }
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
        const sidebarName = document.getElementById('sidebarName');
        const sidebarPosition = document.getElementById('sidebarPosition');
        const sidebarAvatar = document.getElementById('sidebarAvatar');

        const name = user.full_name || user.FullName || user.Username || 'User';
        const role = user.role || user.Role || 'Nhân viên';
        const avatar =
            user.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=BC0004&color=fff&rounded=true`;

        if (sidebarName) sidebarName.textContent = name;
        if (sidebarPosition) sidebarPosition.textContent = role;
        if (sidebarAvatar) sidebarAvatar.src = avatar;
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
        const route = getCurrentRoute();
        const authed = isAuthenticated();

        if (route.auth === 'required' && !authed) {
            redirect('index.html');
            return;
        }

        if (route.file === 'index.html' && authed) {
            redirect('dashboard.html');
            return;
        }

        if (authed) {
            try {
                updateSidebar(JSON.parse(localStorage.getItem('currentUser')));
            } catch (_) {
                localStorage.removeItem('currentUser');
                redirect('index.html');
                return;
            }
        }

        if (route.auth === 'required') {
            setActiveNav();
            setupLogout();
        }

        document.title = document.title.includes('Bosch')
            ? document.title
            : `${route.title} | Bosch HR Management`;
    }

    window.AppRouter = {
        ROUTES,
        getCurrentRoute,
        isAuthenticated,
        redirect,
        init,
        defaultAfterLogin: 'dashboard.html'
    };
})();
