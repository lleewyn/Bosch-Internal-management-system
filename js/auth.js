document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginErrorMessage = document.getElementById('loginErrorMessage');

    // Hiển thị trang đăng nhập ngay
    document.body.classList.add('page-ready');

    // Đã đăng nhập → chuyển sang dashboard
    if (localStorage.getItem('currentUser')) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Xử lý ẩn/hiện mật khẩu
    const togglePassword = document.querySelector('.suffix-icon');
    const passwordInput = document.getElementById('loginPassword');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            // Ẩn lỗi cũ
            loginError.style.display = 'none';

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const oldBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>Đang xử lý...';

            try {
                // Kiểm tra kết nối Supabase
                if (!window.supabaseClient) {
                    showError('Không thể kết nối đến máy chủ. Vui lòng tải lại trang.');
                    return;
                }

                // Bước 1: Tìm user theo company_email hoặc username
                const { data: user, error: fetchError } = await window.supabaseClient
                    .from('users')
                    .select(`
                        user_id,
                        employee_id,
                        role_id,
                        username,
                        company_email,
                        password_hash,
                        is_locked,
                        locked_until,
                        avatar
                    `)
                    .or(`company_email.eq.${emailInput},username.eq.${emailInput}`)
                    .single();

                console.log('🔍 fetchError:', fetchError);
                console.log('🔍 user:', user);

                if (fetchError || !user) {
                    showError('Tài khoản không tồn tại trong hệ thống.');
                    return;
                }

                // Bước 2: Kiểm tra tài khoản bị khóa
                if (user.is_locked) {
                    const lockedUntil = user.locked_until
                        ? `đến ${new Date(user.locked_until).toLocaleString('vi-VN')}`
                        : 'vĩnh viễn';
                    showError(`Tài khoản đã bị khóa ${lockedUntil}. Vui lòng liên hệ quản trị viên.`);
                    return;
                }

                // Bước 3: Kiểm tra trạng thái tài khoản (users không có cột status)
                // Chỉ kiểm tra is_locked

                // Bước 4: Kiểm tra mật khẩu
                // Hiện tại so sánh plain text — sau này thay bằng bcrypt nếu cần
                if (user.password_hash !== password) {
                    showError('Mật khẩu không chính xác.');
                    return;
                }

                // Bước 5: Lấy thêm thông tin role
                let roleName = 'Nhân viên';
                let roleCode = '';
                if (user.role_id) {
                    const { data: roleData } = await window.supabaseClient
                        .from('roles')
                        .select('role_name, role_code')
                        .eq('role_id', user.role_id)
                        .single();
                    if (roleData) {
                        roleName = roleData.role_name;
                        roleCode = roleData.role_code;
                    }
                }

                // Bước 6: Lấy thêm thông tin nhân viên (tên, chức danh)
                let fullName = user.username;
                let positionName = roleName;
                if (user.employee_id) {
                    const { data: empData } = await window.supabaseClient
                        .from('employees')
                        .select('full_name, position_id')
                        .eq('employee_id', user.employee_id)
                        .single();
                    if (empData) {
                        fullName = empData.full_name || fullName;
                        // Lấy tên chức danh
                        if (empData.position_id) {
                            const { data: posData } = await window.supabaseClient
                                .from('positions')
                                .select('position_name')
                                .eq('position_id', empData.position_id)
                                .single();
                            if (posData) positionName = posData.position_name;
                        }
                    }
                }

                // Bước 7: Lưu session vào localStorage
                const userPayload = {
                    user_id:     user.user_id,
                    employee_id: user.employee_id,
                    role_id:     user.role_id,
                    role_code:   roleCode,
                    role_name:   roleName,
                    username:    user.username,
                    email:       user.company_email,
                    full_name:   fullName,
                    position:    positionName,
                    avatar:      user.avatar || null,
                    login_time:  new Date().toISOString()
                };
                localStorage.setItem('currentUser', JSON.stringify(userPayload));

                // Bước 8: Tạo user_session record
                try {
                    await window.supabaseClient.from('user_sessions').insert({
                        user_id:          user.user_id,
                        session_token:    'tok_' + Math.random().toString(36).slice(2),
                        ip_address:       null,
                        device:           navigator.userAgent.slice(0, 200),
                        last_activity_at: new Date().toISOString(),
                        expired_at:       new Date(Date.now() + 8 * 3600000).toISOString(),
                        extended_count:   0,
                        status:           'active'
                    });
                } catch(_) {}

                console.log('✅ Đăng nhập thành công:', userPayload);

                // Bước 9: Chuyển trang
                window.location.href = 'dashboard.html';

            } catch (err) {
                console.error('Lỗi hệ thống:', err);
                showError('Đã xảy ra lỗi kết nối, vui lòng thử lại sau.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = oldBtnText;
            }
        });
    }

    function showError(msg) {
        loginError.style.display = 'flex';
        loginErrorMessage.textContent = msg;
    }
});
