/**
 * Trang tài khoản cá nhân — kết nối Supabase
 */
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
    })();

    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const $ = (id) => document.getElementById(id);
    const setVal  = (id, val) => { const el = $(id); if (el) el.value = val || ''; };
    const setText = (id, val) => { const el = $(id); if (el) el.textContent = val || ''; };

    // ── Load thông tin đầy đủ từ Supabase ────────────────────────────────────
    let _employee = null;
    let _position = '—';

    async function loadProfile() {
        if (!currentUser.employee_id) return;

        const { data: emp } = await window.supabaseClient
            .from('employees')
            .select(`
                employee_id, employee_code, full_name, phone_number,
                personal_email, hire_date, gender, address,
                positions ( position_name ),
                job_levels ( level_name )
            `)
            .eq('employee_id', currentUser.employee_id)
            .single();

        if (emp) {
            _employee = emp;
            // _position dùng cho field Chức danh trong form (chức danh kỹ thuật)
            _position = emp.positions?.position_name || '—';

            // Cập nhật localStorage với thông tin mới nhất
            currentUser.full_name      = emp.full_name;
            currentUser.position_title = _position;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        renderProfile();
    }

    function renderProfile() {
        const emp      = _employee;
        const fullName = emp?.full_name || currentUser.full_name || 'User';
        const email    = currentUser.email || currentUser.company_email || '';
        const phone    = emp?.phone_number || '';
        const pos      = _position;
        const avatarUrl = currentUser.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=BC0004&color=fff`;

        // Profile header — hiển thị role (Head of Department, Group Manager...)
        setText('profileName',     fullName);
        setText('profilePosition', currentUser.role_name || _position);
        const profileAvatar = $('profileAvatar');
        if (profileAvatar) profileAvatar.src = avatarUrl;

        // Form fields (readonly)
        setVal('inputFullName', fullName);
        setVal('inputEmail',    email);
        setVal('inputPhone',    phone);
        setVal('inputPosition', currentUser.role_name || _position); // hiển thị role thay vì position kỹ thuật

        // Edit modal
        setVal('editFullName', fullName);
        setVal('editPhone',    phone);
    }

    // ── Load lịch sử thiết bị từ user_sessions ────────────────────────────────
    async function loadDevices() {
        const tbody = document.querySelector('.device-table tbody');
        if (!tbody) { console.warn('[Account] device-table tbody not found'); return; }
        if (!currentUser.user_id) { console.warn('[Account] no user_id'); return; }

        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:#888;">
            <i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</td></tr>`;

        const { data: sessions, error } = await window.supabaseClient
            .from('user_sessions')
            .select('user_sessions_id, ip_address, device, last_activity_at, expired_at, created_at')
            .eq('user_id', currentUser.user_id)
            .order('created_at', { ascending: false })
            .limit(10);

        console.log('[Account] sessions:', sessions, error);

        if (error || !sessions || sessions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#888;">Chưa có lịch sử thiết bị</td></tr>`;
            return;
        }

        function esc(v) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
        function fmtTime(t) { return t ? new Date(t).toLocaleString('vi-VN') : '—'; }

        tbody.innerHTML = sessions.map(s => {
            const now = new Date();
            const expired = s.expired_at ? new Date(s.expired_at) < now : false;
            const isActive = !expired;
            const icon = (s.device||'').toLowerCase().includes('mobile') ? 'fa-mobile-screen' : 'fa-laptop';
            return `<tr>
                <td class="name-col">
                    <i class="fa-solid ${icon}" style="margin-right:12px;color:#888;"></i>
                    ${esc(s.device || 'Unknown Device')}
                </td>
                <td>${esc(s.ip_address || '—')}</td>
                <td>${fmtTime(s.last_activity_at || s.created_at)}</td>
                <td>—</td>
                <td>
                    <span class="badge ${isActive?'badge-success':'badge-muted'}">
                        <i class="fa-solid fa-circle" style="font-size:6px;"></i>
                        ${isActive ? 'ĐANG HOẠT ĐỘNG' : 'ĐÃ ĐĂNG XUẤT'}
                    </span>
                </td>
            </tr>`;
        }).join('');
    }

    // ── Sửa hồ sơ ────────────────────────────────────────────────────────────
    const modal = $('modalOverlay');
    $('editProfileBtn')?.addEventListener('click', () => modal?.classList.add('show'));
    $('closeModal')?.addEventListener('click',     () => modal?.classList.remove('show'));
    $('cancelBtn')?.addEventListener('click',      () => modal?.classList.remove('show'));
    modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

    $('saveBtn')?.addEventListener('click', async () => {
        const newName  = $('editFullName')?.value.trim();
        const newPhone = $('editPhone')?.value.trim();
        if (!newName) return showToast('Lỗi', 'Vui lòng nhập họ tên.', 'error');

        // Cập nhật lên Supabase
        if (currentUser.employee_id) {
            const { error } = await window.supabaseClient
                .from('employees')
                .update({ full_name: newName, phone_number: newPhone })
                .eq('employee_id', currentUser.employee_id);
            if (error) return showToast('Lỗi', error.message, 'error');
        }

        // Cập nhật localStorage
        currentUser.full_name = newName;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        modal?.classList.remove('show');
        showToast('Thành công', 'Đã lưu thông tin cá nhân.');

        // Cập nhật UI
        setText('profileName', newName);
        setVal('inputFullName', newName);
        setVal('inputPhone', newPhone);
        const sidebarName = $('sidebarName');
        if (sidebarName) sidebarName.textContent = newName;

        // Reload để đồng bộ
        await loadProfile();
    });

    // ── Đổi avatar ────────────────────────────────────────────────────────────
    const avatarUpload  = $('avatarUpload');
    const profileAvatar = $('profileAvatar');

    const handleAvatarClick = (e) => { e.preventDefault(); avatarUpload?.click(); };
    $('changeAvatarTextBtn')?.addEventListener('click',  handleAvatarClick);
    $('changeAvatarBadgeBtn')?.addEventListener('click', handleAvatarClick);

    avatarUpload?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Upload lên Supabase Storage
        const safeName = `avatars/${currentUser.user_id}_${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await window.supabaseClient.storage
            .from('project-files')
            .upload(safeName, file, { upsert: true });

        if (error) {
            // Fallback: dùng base64 local
            const reader = new FileReader();
            reader.onload = ev => {
                const b64 = ev.target.result;
                if (profileAvatar) profileAvatar.src = b64;
                const sidebarAvatar = $('sidebarAvatar');
                if (sidebarAvatar) sidebarAvatar.src = b64;
                currentUser.avatar = b64;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showToast('Thành công', 'Đã đổi ảnh đại diện (local).');
            };
            reader.readAsDataURL(file);
            return;
        }

        const { data: urlData } = window.supabaseClient.storage
            .from('project-files')
            .getPublicUrl(safeName);
        const avatarUrl = urlData.publicUrl;

        // Lưu avatar URL vào users
        await window.supabaseClient
            .from('users')
            .update({ avatar: avatarUrl })
            .eq('user_id', currentUser.user_id);

        if (profileAvatar) profileAvatar.src = avatarUrl;
        const sidebarAvatar = $('sidebarAvatar');
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        currentUser.avatar = avatarUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast('Thành công', 'Đã đổi ảnh đại diện.');
    });

    // ── Đăng xuất thiết bị khác ───────────────────────────────────────────────
    document.querySelector('.btn-outline-danger')?.addEventListener('click', async () => {
        if (!currentUser.user_id) return;
        // Cập nhật expired_at = now cho tất cả session
        const { error } = await window.supabaseClient
            .from('user_sessions')
            .update({ expired_at: new Date().toISOString() })
            .eq('user_id', currentUser.user_id);
        if (error) return showToast('Lỗi', error.message, 'error');
        showToast('Thành công', 'Đã đăng xuất khỏi tất cả thiết bị khác.');
        await loadDevices();
    });

    // ── Khởi động ─────────────────────────────────────────────────────────────
    await Promise.all([loadProfile(), loadDevices()]);
});
