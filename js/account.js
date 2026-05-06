document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra trạng thái đăng nhập
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }

    const currentUser = JSON.parse(userStr);
    const userId = currentUser.UserID || currentUser.user_id;
    const empId = currentUser.EmployeeID || currentUser.employee_id;
    
    // 2. Gắn Email
    const emailStr = currentUser.Email || currentUser.email;
    const emailInput = document.getElementById('inputEmail');
    const editEmail = document.getElementById('editEmail');
    if (emailInput) emailInput.value = emailStr;
    if (editEmail) editEmail.value = emailStr;

    // 3. Truy vấn bảng Users để lấy Avatar
    if (userId) {
        try {
            const { data: userData } = await supabaseClient
                .from('users')
                .select('avatar')
                .eq('user_id', userId)
                .single();
                
            if (userData && userData.avatar) {
                const profileAvatar = document.getElementById('profileAvatar');
                const sidebarAvatar = document.getElementById('sidebarAvatar');
                if (profileAvatar) profileAvatar.src = userData.avatar;
                if (sidebarAvatar) sidebarAvatar.src = userData.avatar;
            }
        } catch (err) {
            console.error("Lỗi lấy avatar:", err);
        }
    }

    // 4. Truy vấn bảng Employees để lấy thông tin chi tiết
    if (empId) {
        try {
            const { data: empData, error: empError } = await supabaseClient
                .from('employees')
                .select('*')
                .eq('employee_id', empId)
                .single();

            if (empData) {
                const fullName = empData.full_name || empData.FullName || "Chưa cập nhật tên";
                const phone = empData.phone_number || empData.PhoneNumber || "";
                const positionId = empData.position_id || empData.PositionID;

                // CẬP NHẬT MÀN HÌNH CHÍNH
                const sidebarName = document.getElementById('sidebarName');
                const profileName = document.getElementById('profileName');
                const fullNameInput = document.getElementById('inputFullName');
                const phoneInput = document.querySelectorAll('.form-grid input[type="text"]')[2];
                
                if (sidebarName) sidebarName.textContent = fullName;
                if (profileName) profileName.textContent = fullName;
                if (fullNameInput) fullNameInput.value = fullName;
                if (phoneInput && phone) phoneInput.value = phone;

                // CẬP NHẬT MODAL CHỈNH SỬA
                const editFullName = document.getElementById('editFullName');
                const editPhone = document.getElementById('editPhone');
                if (editFullName) editFullName.value = fullName;
                if (editPhone) editPhone.value = phone;

                // Lấy Tên Chức danh từ bảng positions
                let positionName = "Nhân viên";
                if (positionId) {
                    const { data: posData } = await supabaseClient
                        .from('positions')
                        .select('position_name')
                        .eq('position_id', positionId)
                        .single();

                    if (posData) {
                        positionName = posData.position_name || posData.PositionName || "Nhân viên";
                    }
                }
                
                const sidebarPos = document.getElementById('sidebarPosition');
                const profilePos = document.getElementById('profilePosition');
                const inputPos = document.getElementById('inputPosition');
                if (sidebarPos) sidebarPos.textContent = positionName;
                if (profilePos) profilePos.textContent = positionName;
                if (inputPos) inputPos.value = positionName;
                
                const editPos = document.getElementById('editPosition');
                if (editPos) editPos.value = positionName;

                // XỬ LÝ LƯU THAY ĐỔI
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', async (e) => {
                        const newName = editFullName.value;
                        const newPhone = editPhone.value;
                        
                        const originalText = saveBtn.textContent;
                        saveBtn.textContent = "Đang lưu...";
                        
                        const { error: updateError } = await supabaseClient
                            .from('employees')
                            .update({ 
                                full_name: newName, 
                                phone_number: newPhone 
                            })
                            .eq('employee_id', empId);
                            
                        if (updateError) {
                            console.error("Lỗi cập nhật Supabase:", updateError);
                            alert("Có lỗi xảy ra khi lưu thay đổi lên máy chủ!");
                        } else {
                            if (sidebarName) sidebarName.textContent = newName;
                            if (profileName) profileName.textContent = newName;
                            if (fullNameInput) fullNameInput.value = newName;
                            if (phoneInput) phoneInput.value = newPhone;
                        }
                        saveBtn.textContent = originalText;
                    });
                }

            } else if (empError) {
                console.error("Lỗi lấy thông tin NV:", empError);
            }
        } catch (err) {
            console.error("Lỗi hệ thống:", err);
        }
    }
    
    // 5. XỬ LÝ THAY ĐỔI AVATAR (MỚI)
    const avatarUpload = document.getElementById('avatarUpload');
    const textBtn = document.getElementById('changeAvatarTextBtn');
    const badgeBtn = document.getElementById('changeAvatarBadgeBtn');
    
    [textBtn, badgeBtn].forEach(btn => {
        if(btn) btn.addEventListener('click', (e) => {
            e.preventDefault();
            avatarUpload.click(); // Kích hoạt hộp thoại chọn file
        });
    });

    if(avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file) return;

            // Hiệu ứng loading
            const oldText = textBtn.textContent;
            textBtn.textContent = "Đang tải...";

            // Chuyển đổi file ảnh thành chuỗi Base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64String = event.target.result;
                
                // Hiển thị ngay lập tức lên web
                const profileAvatar = document.getElementById('profileAvatar');
                const sidebarAvatar = document.getElementById('sidebarAvatar');
                if(profileAvatar) profileAvatar.src = base64String;
                if(sidebarAvatar) sidebarAvatar.src = base64String;

                // Cập nhật lưu vào cột avatar của bảng users trên Supabase
                if(userId) {
                    const { error } = await supabaseClient
                        .from('users')
                        .update({ avatar: base64String })
                        .eq('user_id', userId);
                        
                    if(error) {
                        console.error("Lỗi cập nhật Avatar:", error);
                        alert("Không thể lưu ảnh lên máy chủ! Hãy kiểm tra lại kết nối.");
                    }
                }
                
                textBtn.textContent = oldText; // Trả lại chữ ban đầu
            };
            
            // Bắt đầu đọc file ảnh
            reader.readAsDataURL(file);
        });
    }

    // 6. Đăng xuất
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser'); 
            window.location.href = 'index.html';    
        });
    }
});
