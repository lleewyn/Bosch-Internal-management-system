import re

with open('hr.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# The clean script block for pagination and fixing the corrupted backticks
clean_pagination = """        // Pagination logic
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
                        idCol.textContent = idCol.textContent.replace(/\d+/, match => parseInt(match) + i * 100);
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
        renderPage(1);

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
                document.querySelector('.page-info').textContent = `Hiển thị ${startRow} - ${endRow} trên 142 nhân sự`;

                // Render the table data
                renderPage(currentPage);

                console.log(`Navigated to page ${currentPage}`);
            });
        });
    </script>
</body>
</html>"""

# We also need to fix any remaining mojibake in the JS section:
replacements = {
    '?ang ch?n:': 'Đang chọn:',
    'Tt c nhAn s': 'Tất cả nhân sự',
    'lT trAnh': 'lộ trình',
    'bn ghi': 'bản ghi',
    'S-a': 'Sửa',
    'XA3a': 'Xóa',
    'C-p nh-t': 'Cập nhật',
    'L-i': 'Lỗi',
    'Vui lAng': 'Vui lòng',
    'A-t nht': 'ít nhất',
    '`': 'để',
    's-a.': 'sửa.',
    'Cnh bAo': 'Cảnh báo',
    'Ch% cA3 th': 'Chỉ có thể',
    'cA1ng lAc': 'cùng lúc',
    'thA\'ng tin': 'thông tin',
    'nhAn s': 'nhân sự',
    'Bn cA3 ch_c mu`n': 'Bạn có chắc muốn',
    'ThAnh cA\'ng': 'Thành công',
    'ThA\'ng bAo': 'Thông báo',
    'D_ liu': 'Dữ liệu',
    '`A `c `"ng bT': 'đã được đồng bộ',
    '?A thAm': 'Đã thêm',
    'm>i vAo h th`ng': 'mới vào hệ thống',
    'XA3a tr_ng': 'Xóa trắng',
    '?A gAn d An': 'Đã gán dự án',
    'thAnh cA\'ng cho': 'thành công cho',
    'Hin th<': 'Hiển thị',
    'trAn': 'trên',
    '?A xA3a': 'Đã xóa',
    '`': '`',
    '<': 'ị',
    'A': 'à',
    'A': 'á',
    'A': 'â',
    'A': 'ã',
    'T': 'ộ',
    'A': 'ó',
    'A': 'ò',
    'A3': 'ó',
    '"': 'ồ',
    'A\'': 'ô',
    '_': 'ắ',
    '`': 'đ',
    '>': 'ớ',
    '?': 'Đ',
    '%': 'ỉ',
    'A1': 'ú',
}

for bad, good in replacements.items():
    content = content.replace(bad, good)

# Replace the broken pagination section with the clean one
content = re.sub(r'// Pagination logic[\s\S]*?</html>', clean_pagination, content)

with open('hr.html', 'w', encoding='utf-8') as f:
    f.write(content)
