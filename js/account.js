document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('currentUser');

    // Nếu chưa đăng nhập, dùng mock user mặc định thay vì trang trắng
    let currentUser;
    if (!userStr) {
        currentUser = {
            full_name: 'Nguyễn Văn A',
            FullName: 'Nguyễn Văn A',
            Email: 'admin@bosch.com',
            email: 'admin@bosch.com',
            phone_number: '0901234567',
            role: 'Quản trị viên hệ thống'
        };
    } else {
        currentUser = JSON.parse(userStr);
    }

    const fullName = currentUser.full_name || currentUser.FullName || currentUser.Username || 'User';
    const emailStr = currentUser.Email || currentUser.email || '';
    const phone = currentUser.phone_number || currentUser.PhoneNumber || '';
    const role = currentUser.role || 'Nhân viên';
    const avatarUrl =
        currentUser.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=BC0004&color=fff`;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText('profileName', fullName);
    setText('profilePosition', role);
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.src = avatarUrl;

    setVal('inputFullName', fullName);
    setVal('inputEmail', emailStr);
    setVal('inputPhone', phone);
    setVal('inputPosition', role);
    setVal('editFullName', fullName);
    setVal('editPhone', phone);

    function renderDevices() {
        const tbody = document.querySelector('.info-card table tbody');
        if (!tbody || !window.MockStore) return;
        tbody.innerHTML = MockStore.getDevices()
            .map(
                (d) => `
            <tr>
                <td class="name-col"><i class="fa-solid ${d.icon || 'fa-laptop'}" style="margin-right:12px;color:#888;"></i> ${UI.escape(d.name)}</td>
                <td>${UI.escape(d.ip)}</td>
                <td>${UI.escape(d.time)}</td>
                <td>${UI.escape(d.location)}</td>
                <td><span class="badge ${d.active ? 'badge-success' : 'badge-muted'}"><i class="fa-solid fa-circle" style="font-size:6px;"></i> ${d.active ? 'ĐANG HOẠT ĐỘNG' : 'ĐÃ ĐĂNG XUẤT'}</span></td>
            </tr>`
            )
            .join('');
    }

    renderDevices();

    const modal = document.getElementById('modalOverlay');
    const saveBtn = document.getElementById('saveBtn');

    document.getElementById('editProfileBtn')?.addEventListener('click', () => modal?.classList.add('show'));
    document.getElementById('closeModal')?.addEventListener('click', () => modal?.classList.remove('show'));
    document.getElementById('cancelBtn')?.addEventListener('click', () => modal?.classList.remove('show'));
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const form = modal.querySelector('.bosch-modal-body');
            if (window.validateForm && form && !validateForm(form)) return;

            const newName = document.getElementById('editFullName').value.trim();
            const newPhone = document.getElementById('editPhone').value.trim();

            currentUser.full_name = newName;
            currentUser.FullName = newName;
            currentUser.phone_number = newPhone;
            currentUser.PhoneNumber = newPhone;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            if (window.MockStore) {
                MockStore.logActivity('Tài khoản', `Cập nhật hồ sơ: ${newName}`);
            }

            modal.classList.remove('show');
            if (window.showToast) {
                showToast('Thành công', 'Đã lưu thông tin cá nhân.');
            } else {
                alert('Cập nhật thông tin thành công!');
            }

            setText('profileName', newName);
            setVal('inputFullName', newName);
            setVal('inputPhone', newPhone);
            const sidebarName = document.getElementById('sidebarName');
            if (sidebarName) sidebarName.textContent = newName;
        });
    }

    const avatarUpload = document.getElementById('avatarUpload');
    const handleAvatarClick = (e) => {
        e.preventDefault();
        avatarUpload?.click();
    };
    document.getElementById('changeAvatarTextBtn')?.addEventListener('click', handleAvatarClick);
    document.getElementById('changeAvatarBadgeBtn')?.addEventListener('click', handleAvatarClick);

    avatarUpload?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target.result;
            if (profileAvatar) profileAvatar.src = base64String;
            document.getElementById('sidebarAvatar') &&
                (document.getElementById('sidebarAvatar').src = base64String);
            currentUser.avatar = base64String;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (window.showToast) showToast('Thành công', 'Đã đổi ảnh đại diện.');
            if (window.MockStore) MockStore.logActivity('Tài khoản', 'Thay đổi ảnh đại diện');
        };
        reader.readAsDataURL(file);
    });

    document.querySelector('.btn-outline-danger')?.addEventListener('click', () => {
        if (!window.MockStore) return;
        MockStore.logoutOtherDevices();
        renderDevices();
        if (window.showToast) showToast('Thành công', 'Đã đăng xuất các thiết bị khác.');
    });
});
