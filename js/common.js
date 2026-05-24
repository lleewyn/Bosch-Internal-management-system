/**
 * Logic dùng chung cho các trang đã đăng nhập — khởi chạy router.
 */
document.addEventListener('DOMContentLoaded', () => {
    if (window.AppRouter) {
        AppRouter.init();
        return;
    }

    const userStr = localStorage.getItem('currentUser');
    if (
        !userStr &&
        !window.location.pathname.includes('index.html') &&
        !window.location.pathname.includes('forgot-password.html')
    ) {
        window.location.href = 'index.html';
        return;
    }

    if (userStr) {
        try {
            updateSidebar(JSON.parse(userStr));
        } catch (_) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    }

    document.querySelectorAll('.logout-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
});

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

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
