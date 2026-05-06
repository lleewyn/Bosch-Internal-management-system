document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginErrorMessage = document.getElementById('loginErrorMessage');

    // Kiểm tra nếu đã đăng nhập thì chuyển luôn sang dashboard
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = 'dashboard.html';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Ngăn form load lại trang

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            // Ẩn lỗi cũ
            loginError.style.display = 'none';

            try {
                // Hiển thị trạng thái đang đăng nhập (có thể thay text nút)
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const oldBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = 'Đang xử lý...';

                // Truy vấn bảng users trong Supabase (chú ý chữ thường)
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .eq('password_hash', password) 
                    .single(); 

                if (error) {
                    console.error("Lỗi Supabase:", error);
                    loginError.style.display = 'flex';
                    loginErrorMessage.textContent = 'Tài khoản hoặc mật khẩu không chính xác.';
                } else if (data) {
                    // Đăng nhập thành công, lưu thông tin vào localStorage
                    console.log("Đăng nhập thành công:", data);
                    localStorage.setItem('currentUser', JSON.stringify({
                        UserID: data.user_id || data.UserID,
                        EmployeeID: data.employee_id || data.EmployeeID,
                        Email: data.email || data.Email,
                        Username: data.username || data.Username
                    }));

                    // Chuyển hướng sang trang account hoặc dashboard
                    window.location.href = 'account.html'; 
                }

                submitBtn.innerHTML = oldBtnText; // Trả lại text cho nút
            } catch (err) {
                console.error("Lỗi hệ thống:", err);
                loginError.style.display = 'flex';
                loginErrorMessage.textContent = 'Đã xảy ra lỗi, vui lòng thử lại sau.';
            }
        });
    }
});
