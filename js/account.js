document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra trạng thái đăng nhập
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }

    const currentUser = JSON.parse(userStr);
    
    // 2. Gắn thông tin cơ bản (Email) vào cả màn hình chính và Modal
    const emailStr = currentUser.Email || currentUser.email;
    const emailInput = document.getElementById('inputEmail');
    const editEmail = document.getElementById('editEmail');
    if (emailInput) emailInput.value = emailStr;
    if (editEmail) editEmail.value = emailStr;

    // 3. Truy vấn bảng Employees để lấy thông tin chi tiết
    const empId = currentUser.EmployeeID || currentUser.employee_id;
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

                // --- CẬP NHẬT MÀN HÌNH CHÍNH ---
                const sidebarName = document.getElementById('sidebarName');
                const profileName = document.getElementById('profileName');
                const fullNameInput = document.getElementById('inputFullName');
                const phoneInput = document.querySelectorAll('.form-grid input[type="text"]')[2];
                
                if (sidebarName) sidebarName.textContent = fullName;
                if (profileName) profileName.textContent = fullName;
                if (fullNameInput) fullNameInput.value = fullName;
                if (phoneInput && phone) phoneInput.value = phone;

                // --- CẬP NHẬT MODAL CHỈNH SỬA ---
                const editFullName = document.getElementById('editFullName');
                const editPhone = document.getElementById('editPhone');
                if (editFullName) editFullName.value = fullName;
                if (editPhone) editPhone.value = phone;

                // 4. Lấy Tên Chức danh từ bảng positions
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
                
                // Gắn chức danh vào màn hình chính
                const sidebarPos = document.getElementById('sidebarPosition');
                const profilePos = document.getElementById('profilePosition');
                const inputPos = document.getElementById('inputPosition');
                if (sidebarPos) sidebarPos.textContent = positionName;
                if (profilePos) profilePos.textContent = positionName;
                if (inputPos) inputPos.value = positionName;
                
                // Gắn chức danh vào Modal (chỉ đọc)
                const editPos = document.getElementById('editPosition');
                if (editPos) editPos.value = positionName;

                // --- 5. XỬ LÝ LƯU THAY ĐỔI LÊN SUPABASE ---
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', async (e) => {
                        // Lấy dữ liệu mới từ Modal
                        const newName = editFullName.value;
                        const newPhone = editPhone.value;
                        
                        // Đổi chữ nút thành Đang lưu để chờ mạng
                        const originalText = saveBtn.textContent;
                        saveBtn.textContent = "Đang lưu...";
                        
                        // Cập nhật lên Supabase
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
                            saveBtn.textContent = originalText;
                        } else {
                            // Cập nhật thành công! Đổi dữ liệu ngoài màn hình chính ngay lập tức
                            if (sidebarName) sidebarName.textContent = newName;
                            if (profileName) profileName.textContent = newName;
                            if (fullNameInput) fullNameInput.value = newName;
                            if (phoneInput) phoneInput.value = newPhone;
                            
                            saveBtn.textContent = originalText;
                            
                            // Ghi chú: Việc đóng Modal (modalOverlay.classList.remove) 
                            // đã được thực hiện bởi script ở cuối file account.html
                        }
                    });
                }

            } else if (empError) {
                console.error("Lỗi lấy thông tin NV:", empError);
            }
        } catch (err) {
            console.error("Lỗi hệ thống:", err);
        }
    }
    
    // 6. Xử lý nút Đăng xuất
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser'); 
            window.location.href = 'index.html';    
        });
    }
});
