/**
 * Common logic for all authenticated pages
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check login status
    const userStr = localStorage.getItem('currentUser');
    if (!userStr && !window.location.pathname.includes('index.html') && !window.location.pathname.includes('forgot-password.html')) {
        window.location.href = 'index.html';
        return;
    }

    if (userStr) {
        const user = JSON.parse(userStr);
        updateSidebar(user);
    }

    // 2. Setup logout buttons
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
});

/**
 * Update sidebar user info
 */
function updateSidebar(user) {
    const sidebarName = document.getElementById('sidebarName');
    const sidebarPosition = document.getElementById('sidebarPosition');
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    const name = user.full_name || user.FullName || user.Username || "User";
    const role = user.role || "Nhân viên";
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=BC0004&color=fff&rounded=true`;

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarPosition) sidebarPosition.textContent = role;
    if (sidebarAvatar) sidebarAvatar.src = avatar;
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
