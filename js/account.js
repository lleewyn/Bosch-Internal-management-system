document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra trạng thái đăng nhập (đã được common.js xử lý)
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;

    const currentUser = JSON.parse(userStr);
    
    // 2. Lấy thông tin từ localStorage
    const fullName = currentUser.full_name || currentUser.FullName || currentUser.Username || "John Doe";
    const emailStr = currentUser.Email || currentUser.email || "";
    const phone = currentUser.phone_number || currentUser.PhoneNumber || "";
    const role = currentUser.role || "Quản trị viên hệ thống";
    const avatarUrl = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=BC0004&color=fff`;

    // 3. Cập nhật giao diện (sidebar đã được common.js xử lý, chỉ cập nhật phần nội dung chính)
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    const profilePosition = document.getElementById('profilePosition');
    
    const fullNameInput = document.getElementById('inputFullName');
    const emailInput = document.getElementById('inputEmail');
    const phoneInput = document.getElementById('inputPhone');
    const positionInput = document.getElementById('inputPosition');
 
    if (profileName) profileName.textContent = fullName;
    if (profileAvatar) profileAvatar.src = avatarUrl;
    if (profilePosition) profilePosition.textContent = role;
 
    if (fullNameInput) fullNameInput.value = fullName;
    if (emailInput) emailInput.value = emailStr;
    if (phoneInput) phoneInput.value = phone;
    if (positionInput) positionInput.value = role;

    // 4. CẬP NHẬT MODAL CHỈNH SỬA
    const editFullName = document.getElementById('editFullName');
    const editPhone = document.getElementById('editPhone');
    const editPosition = document.getElementById('editPosition');

    if (editFullName) editFullName.value = fullName;
    if (editPhone) editPhone.value = phone;
    if (editPosition) editPosition.value = role;

    // 5. XỬ LÝ LƯU THAY ĐỔI (Local Only)
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const newName = editFullName.value;
            const newPhone = editPhone.value;
            
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Đang lưu...";
            
            // Cập nhật đối tượng người dùng trong localStorage
            currentUser.full_name = newName;
            currentUser.phone_number = newPhone;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            setTimeout(() => {
                saveBtn.textContent = originalText;
                alert("Cập nhật thông tin thành công!");
                window.location.reload();
            }, 500);
        };
    }

    // 6. XỬ LÝ THAY ĐỔI AVATAR
    const avatarUpload = document.getElementById('avatarUpload');
    const textBtn = document.getElementById('changeAvatarTextBtn');
    const badgeBtn = document.getElementById('changeAvatarBadgeBtn');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    
    const handleAvatarClick = (e) => {
        e.preventDefault();
        if(avatarUpload) avatarUpload.click();
    };

    if(textBtn) textBtn.addEventListener('click', handleAvatarClick);
    if(badgeBtn) badgeBtn.addEventListener('click', handleAvatarClick);

    if(avatarUpload) {
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64String = event.target.result;
                
                // Cập nhật hiển thị
                if(profileAvatar) profileAvatar.src = base64String;
                if(sidebarAvatar) sidebarAvatar.src = base64String;

                // Lưu vào localStorage
                currentUser.avatar = base64String;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                alert("Thay đổi ảnh đại diện thành công!");
            };
            reader.readAsDataURL(file);
        });
    }

    // 7. XỬ LÝ ĐĂNG XUẤT THIẾT BỊ KHÁC
    const logoutOthersBtn = document.querySelector('.btn-outline-danger');
    if (logoutOthersBtn) {
        logoutOthersBtn.addEventListener('click', () => {
            const originalText = logoutOthersBtn.textContent;
            logoutOthersBtn.textContent = "Đang xử lý...";
            logoutOthersBtn.disabled = true;
            logoutOthersBtn.style.opacity = "0.5";
            logoutOthersBtn.style.cursor = "not-allowed";

            setTimeout(() => {
                alert("Đã đăng xuất khỏi tất cả các thiết bị khác thành công!");
                logoutOthersBtn.textContent = originalText;
                logoutOthersBtn.disabled = false;
                logoutOthersBtn.style.opacity = "1";
                logoutOthersBtn.style.cursor = "pointer";
                
                // Cập nhật lại bảng (giả lập xóa các dòng không phải 'Hiện tại')
                const rows = document.querySelectorAll('.data-table tbody tr');
                rows.forEach((row, index) => {
                    if (index > 0) { // Giữ lại dòng đầu tiên (hiện tại)
                        row.style.opacity = "0.3";
                        const statusCell = row.querySelector('.status-inactive');
                        if (statusCell) {
                            statusCell.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 6px;"></i> VỪA ĐĂNG XUẤT';
                        }
                    }
                });
            }, 1000);
        });
    }
});
