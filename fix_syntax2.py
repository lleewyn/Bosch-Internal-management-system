import re

def fix_html():
    with open('hr.html', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # The clean JavaScript block from // Modal logic to the end
    clean_js = """// Modal logic
        const addModal = document.getElementById('addStaffModal');
        const assignModal = document.getElementById('assignProjectModal');
        const drawer = document.getElementById('hrDrawer');
        const drawerOverlay = document.getElementById('hrDrawerOverlay');

        // Add modal
        document.getElementById('openAddModalBtn').addEventListener('click', () => addModal.classList.add('show'));
        document.getElementById('closeAddModal').addEventListener('click', () => addModal.classList.remove('show'));
        document.getElementById('cancelAddBtn').addEventListener('click', () => addModal.classList.remove('show'));
        
        // Drawer
        window.openDrawer = () => {
            drawer.classList.add('show');
            drawerOverlay.classList.add('show');
        };
        const closeDrawer = () => {
            drawer.classList.remove('show');
            drawerOverlay.classList.remove('show');
        };
        drawerOverlay.addEventListener('click', closeDrawer);

        // Assign modal
        document.getElementById('openAssignModalBtn').addEventListener('click', () => {
            assignModal.classList.add('show');
        });
        document.getElementById('closeAssignModal').addEventListener('click', () => assignModal.classList.remove('show'));
        document.getElementById('cancelAssignBtn').addEventListener('click', () => assignModal.classList.remove('show'));

        window.addEventListener('click', (e) => {
            if (e.target === addModal) addModal.classList.remove('show');
            if (e.target === assignModal) assignModal.classList.remove('show');
        });

        // HANDLE FUNCTIONALITIES (SAVE & VALIDATE)
        const saveAddBtn = document.getElementById('saveAddModalBtn');
        if (saveAddBtn) {
            saveAddBtn.addEventListener('click', () => {
                if (window.validateForm && window.validateForm(addModal)) {
                    window.showToast('Thành công', 'Đã thêm nhân sự mới vào hệ thống.');
                    addModal.classList.remove('show');
                    // Xóa trắng form
                    const inputs = addModal.querySelectorAll('input');
                    inputs.forEach(input => input.value = '');
                }
            });
        }

        const saveAssignBtn = document.getElementById('saveAssignBtn');
        if (saveAssignBtn) {
            saveAssignBtn.addEventListener('click', () => {
                if (window.validateForm && window.validateForm(assignModal)) {
                    window.showToast('Thành công', 'Đã gán dự án thành công cho nhân sự.');
                    assignModal.classList.remove('show');
                    const inputs = assignModal.querySelectorAll('input:not([readonly])');
                    inputs.forEach(input => input.value = '');
                }
            });
        }

        // Pagination logic
        const pageButtons = document.querySelectorAll('.page-btn');
        let currentPage = 1;

        // Mock data generation for pagination demo
        const dirTbody = document.querySelector('#directoryTable tbody');
        const originalRows = Array.from(dirTbody.querySelectorAll('tr'));
        const allRows = [];
        
        // Clone rows to create 3 pages of data (24 rows)
        for (let i = 0; i < 3; i++) {
            originalRows.forEach((row) => {
                const clone = row.cloneNode(true);
                // Slightly modify IDs for pages 2 and 3 to look like different data
                if (i > 0) {
                    const idCol = clone.querySelector('.code-col');
                    if (idCol) {
                        idCol.textContent = idCol.textContent.replace(/\\d+/, match => parseInt(match) + i * 100);
                    }
                }
                // Maintain drawer click functionality for cloned rows
                if (clone.getAttribute('onclick')) {
                    clone.onclick = function() { window.openDrawer(); };
                }
                allRows.push(clone);
            });
        }

        function renderPage(page) {
            dirTbody.innerHTML = '';
            const start = (page - 1) * 8;
            const end = Math.min(start + 8, allRows.length);
            for (let i = start; i < end; i++) {
                dirTbody.appendChild(allRows[i]);
            }
        }

        // Initialize first page
        if(dirTbody) renderPage(1);

        pageButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const btnText = btn.textContent.trim();
                
                // Navigate pages
                if (btnText === '1') {
                    currentPage = 1;
                } else if (btnText === '2') {
                    currentPage = 2;
                } else if (btnText === '3') {
                    currentPage = 3;
                } else if (btnText.includes('chevron-left')) {
                    if (currentPage > 1) currentPage--;
                } else if (btnText.includes('chevron-right')) {
                    if (currentPage < 3) currentPage++;
                }

                // Update active button
                pageButtons.forEach(b => b.classList.remove('active'));
                // Find and activate correct page number button
                pageButtons.forEach(b => {
                    if (b.textContent.trim() === String(currentPage)) {
                        b.classList.add('active');
                    }
                });

                // Update page info
                const startRow = (currentPage - 1) * 8 + 1;
                const endRow = Math.min(currentPage * 8, 142);
                const infoEl = document.querySelector('.page-info');
                if(infoEl) infoEl.textContent = `Hiển thị ${startRow} - ${endRow} trên 142 nhân sự`;

                // Render the table data
                renderPage(currentPage);

                console.log(`Navigated to page ${currentPage}`);
            });
        });
    </script>
</body>
</html>"""

    # First, let's fix the specific messed up Toast messages
    bad_to_good = {
        "'L-i'": "'Lỗi'",
        "'Vui lAng click ch?n A-t nht 1 dAng ` s-a.'": "'Vui lòng chọn ít nhất 1 dòng để sửa.'",
        "'Cnh bAo'": "'Cảnh báo'",
        "'Ch% cA3 th s-a 1 bn ghi cA1ng lAc.'": "'Chỉ có thể sửa 1 bản ghi cùng lúc.'",
        "'S-a thA\\'ng tin nhAn s'": "'Sửa thông tin nhân sự'",
        "'S-a thA'ng tin nhAn s'": "'Sửa thông tin nhân sự'",
        "'Vui lAng click ch?n A-t nht 1 dAng ` xA3a.'": "'Vui lòng chọn ít nhất 1 dòng để xóa.'",
        "`Bn cA3 ch_c mu`n xA3a ${selectedRows.length} bn ghi?`": "`Bạn có chắc muốn xóa ${selectedRows.length} bản ghi?`",
        "'ThAnh cA\\'ng'": "'Thành công'",
        "'ThAnh cA'ng'": "'Thành công'",
        "'?A xA3a bn ghi.'": "'Đã xóa bản ghi.'",
        "'ThA\\'ng bAo'": "'Thông báo'",
        "'ThA'ng bAo'": "'Thông báo'",
        "'D_ liu `A `c `\"ng bT.'": "'Dữ liệu đã được đồng bộ.'",
        "btnText === 'S-a'": "btnText === 'Sửa'",
        "btnText === 'XA3a'": "btnText === 'Xóa'",
        "btnText === 'C-p nh-t'": "btnText === 'Cập nhật'",
        "?ang ch?n:": "Đang chọn:",
        "bn ghi": "bản ghi",
        "Tt c nhAn s": "Tất cả nhân sự",
        "Tt c lT trAnh": "Tất cả lộ trình"
    }

    # Apply the string replacements
    for bad, good in bad_to_good.items():
        content = content.replace(bad, good)

    # Now replace using string split instead of regex
    start_idx = content.find('// Modal logic')
    if start_idx != -1:
        content = content[:start_idx] + clean_js

    with open('hr.html', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix_html()
