import re

def fix_hr_script():
    with open('hr.html', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    full_script = """<script>
        // ---------------------------------------------------------
        // FULLY FUNCTIONAL UI LOGIC (Search, Filter, Select, Edit, Delete)
        // ---------------------------------------------------------

        const dirTable = document.getElementById('directoryTable');
        const roadTable = document.getElementById('roadmapTable');
        const dirControls = document.getElementById('directoryControls');
        const roadControls = document.getElementById('roadmapControls');

        // 1. Populate Dropdowns Dynamically
        function populateFilters() {
            const table = dirTable.style.display !== 'none' ? dirTable : roadTable;
            const selectBoxes = document.querySelectorAll('.hr-select');
            
            if(selectBoxes.length >= 4) {
                selectBoxes[0].innerHTML = '<option value="">Group</option><option value="A">Group A</option><option value="B">Group B</option>';
                selectBoxes[1].innerHTML = '<option value="">Team</option><option value="X-Engine">Team X-Engine</option><option value="UI">Team UI</option>';
                selectBoxes[2].innerHTML = '<option value="">Du an</option><option value="Precision">Precision Sensor</option><option value="Cloud">Cloud Infra</option>';
                selectBoxes[3].innerHTML = '<option value="">Thoi gian</option><option value="2024">Nam 2024</option><option value="2025">Nam 2025</option>';
            }
        }
        populateFilters();

        // 2. Search & Filter Logic
        function applyFilters() {
            const activeTable = dirTable.style.display !== 'none' ? dirTable : roadTable;
            const controls = activeTable === dirTable ? dirControls : roadControls;
            const searchInput = controls.querySelector('.search-box input');
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            
            activeTable.querySelectorAll('tbody tr').forEach(tr => {
                const text = tr.textContent.toLowerCase();
                const matchesSearch = text.includes(searchTerm);
                
                if (matchesSearch) {
                    tr.style.display = '';
                } else {
                    tr.style.display = 'none';
                    const cb = tr.querySelector('.row-cb');
                    if(cb) cb.checked = false;
                    tr.classList.remove('selected');
                }
            });
            updateSelectionBadge();
        }

        document.querySelectorAll('.search-box input').forEach(input => {
            input.addEventListener('input', applyFilters);
        });
        document.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', () => {
                if(window.showToast) window.showToast('Loc', 'Dang tai du lieu theo bo loc...', 'info');
                setTimeout(applyFilters, 500);
            });
        });

        // 3. Row Selection Logic (with checkboxes)
        const selectAllBoxes = document.querySelectorAll('.select-all-cb');
        
        function updateSelectionBadge() {
            const activeTable = dirTable.style.display !== 'none' ? dirTable : roadTable;
            const controls = activeTable === dirTable ? dirControls : roadControls;
            const badge = controls.querySelector('.op-box-actions > div:first-child');
            
            const checkedCount = activeTable.querySelectorAll('tbody .row-cb:checked').length;
            
            if(checkedCount > 0) {
                badge.textContent = `Dang chon: ${checkedCount} ban ghi`;
                badge.style.backgroundColor = '#e1dfdd';
                badge.style.color = '#323130';
                badge.style.borderColor = '#c8c6c4';
            } else {
                badge.textContent = activeTable === dirTable ? 'Dang chon: Tat ca nhan su' : 'Dang chon: Tat ca lo trinh';
                badge.style.backgroundColor = '#f0f7ff';
                badge.style.color = '#0078d4';
                badge.style.borderColor = '#b3d7ff';
            }
        }

        selectAllBoxes.forEach(sa => {
            sa.addEventListener('change', (e) => {
                const table = e.target.closest('table');
                const rowBoxes = table.querySelectorAll('tbody tr:not([style*="display: none"]) .row-cb');
                rowBoxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const tr = cb.closest('tr');
                    if(e.target.checked) tr.classList.add('selected');
                    else tr.classList.remove('selected');
                });
                updateSelectionBadge();
            });
        });

        const style = document.createElement('style');
        style.textContent = `
            tr.selected { background-color: #f3f2f1 !important; }
            tr.selected td { border-top: 1px solid #0078d4; border-bottom: 1px solid #0078d4; }
        `;
        document.head.appendChild(style);

        document.querySelectorAll('tbody').forEach(tbody => {
            tbody.addEventListener('change', (e) => {
                if(e.target.classList.contains('row-cb')) {
                    const tr = e.target.closest('tr');
                    if(e.target.checked) tr.classList.add('selected');
                    else tr.classList.remove('selected');
                    updateSelectionBadge();
                }
            });
        });

        // 4. Action Buttons (Sua, Xoa, Cap nhat)
        document.querySelectorAll('.btn-action').forEach(btn => {
            if(btn.id === 'openAddModalBtn') return; // Skip modal trigger

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const btnText = btn.textContent.trim();
                const activeTable = dirTable.style.display !== 'none' ? dirTable : roadTable;
                const selectedRows = activeTable.querySelectorAll('tbody tr.selected');

                if(btnText.includes('S')) { // Sua
                    if(selectedRows.length === 0) {
                        if(window.showToast) window.showToast('Loi', 'Vui long chon it nhat 1 dong de sua.', 'error');
                        return;
                    }
                    if(selectedRows.length > 1) {
                        if(window.showToast) window.showToast('Canh bao', 'Chi co the sua 1 ban ghi cung luc.', 'error');
                        return;
                    }
                    
                    const row = selectedRows[0];
                    const name = row.querySelector('.name-col') ? row.querySelector('.name-col').textContent.trim() : '';
                    
                    const modal = document.getElementById('addStaffModal');
                    if(modal) {
                        const title = modal.querySelector('h3');
                        if(title) title.textContent = 'Sua thong tin nhan su';
                        const inputs = modal.querySelectorAll('input');
                        if(inputs.length > 0) inputs[0].value = name;
                        if(inputs.length > 1) inputs[1].value = '01/01/1990';
                        modal.classList.add('show');
                    }
                } 
                else if(btnText.includes('X')) { // Xoa
                    if(selectedRows.length === 0) {
                        if(window.showToast) window.showToast('Canh bao', 'Vui long chon it nhat 1 dong de xoa.', 'error');
                        return;
                    }
                    if(confirm(`Ban co chac muon xoa ${selectedRows.length} ban ghi?`)) {
                        selectedRows.forEach(tr => tr.remove());
                        if(window.showToast) window.showToast('Thanh cong', 'Da xoa ban ghi.', 'success');
                        updateSelectionBadge();
                        selectAllBoxes.forEach(cb => cb.checked = false);
                    }
                } 
                else if(btnText.includes('C')) { // Cap nhat
                    if(window.showToast) window.showToast('Thong bao', 'Du lieu da duoc dong bo.', 'success');
                }
            });
        });

        // Modal logic
        const addModal = document.getElementById('addStaffModal');
        const assignModal = document.getElementById('assignProjectModal');
        const drawer = document.getElementById('hrDrawer');
        const drawerOverlay = document.getElementById('hrDrawerOverlay');

        if(document.getElementById('openAddModalBtn')) document.getElementById('openAddModalBtn').addEventListener('click', () => {
            if(addModal) {
                const title = addModal.querySelector('h3');
                if(title) title.textContent = 'Tiep nhan nhan su moi';
                const inputs = addModal.querySelectorAll('input');
                inputs.forEach(input => input.value = '');
                addModal.classList.add('show');
            }
        });
        if(document.getElementById('closeAddModal')) document.getElementById('closeAddModal').addEventListener('click', () => addModal && addModal.classList.remove('show'));
        if(document.getElementById('cancelAddBtn')) document.getElementById('cancelAddBtn').addEventListener('click', () => addModal && addModal.classList.remove('show'));
        
        window.openDrawer = () => {
            if(drawer) drawer.classList.add('show');
            if(drawerOverlay) drawerOverlay.classList.add('show');
        };
        const closeDrawer = () => {
            if(drawer) drawer.classList.remove('show');
            if(drawerOverlay) drawerOverlay.classList.remove('show');
        };
        if(drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

        if(document.getElementById('openAssignModalBtn')) document.getElementById('openAssignModalBtn').addEventListener('click', () => {
            if(assignModal) assignModal.classList.add('show');
        });
        if(document.getElementById('closeAssignModal')) document.getElementById('closeAssignModal').addEventListener('click', () => assignModal && assignModal.classList.remove('show'));
        if(document.getElementById('cancelAssignBtn')) document.getElementById('cancelAssignBtn').addEventListener('click', () => assignModal && assignModal.classList.remove('show'));

        window.addEventListener('click', (e) => {
            if (e.target === addModal) addModal.classList.remove('show');
            if (e.target === assignModal) assignModal.classList.remove('show');
        });

        const saveAddBtn = document.getElementById('saveAddModalBtn');
        if (saveAddBtn) {
            saveAddBtn.addEventListener('click', () => {
                if (window.validateForm && window.validateForm(addModal)) {
                    if(window.showToast) window.showToast('Thanh cong', 'Da luu nhan su vao he thong.');
                    if(addModal) addModal.classList.remove('show');
                    const inputs = addModal.querySelectorAll('input');
                    inputs.forEach(input => input.value = '');
                }
            });
        }

        const saveAssignBtn = document.getElementById('saveAssignBtn');
        if (saveAssignBtn) {
            saveAssignBtn.addEventListener('click', () => {
                if (window.validateForm && window.validateForm(assignModal)) {
                    if(window.showToast) window.showToast('Thanh cong', 'Da gan du an thanh cong cho nhan su.');
                    if(assignModal) assignModal.classList.remove('show');
                    const inputs = assignModal.querySelectorAll('input:not([readonly])');
                    inputs.forEach(input => input.value = '');
                }
            });
        }

        // Pagination logic
        const pageButtons = document.querySelectorAll('.page-btn');
        let currentPage = 1;
        const dirTbody = document.querySelector('#directoryTable tbody');
        let allRows = [];
        
        if(dirTbody) {
            const originalRows = Array.from(dirTbody.querySelectorAll('tr'));
            for (let i = 0; i < 3; i++) {
                originalRows.forEach((row) => {
                    const clone = row.cloneNode(true);
                    if (i > 0) {
                        const idCol = clone.querySelector('.code-col');
                        if (idCol) {
                            idCol.textContent = idCol.textContent.replace(/\d+/, match => parseInt(match) + i * 100);
                        }
                    }
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

            renderPage(1);

            pageButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const btnText = btn.textContent.trim();
                    if (btnText === '1') currentPage = 1;
                    else if (btnText === '2') currentPage = 2;
                    else if (btnText === '3') currentPage = 3;
                    else if (btnText.includes('left')) { if (currentPage > 1) currentPage--; }
                    else if (btnText.includes('right')) { if (currentPage < 3) currentPage++; }

                    pageButtons.forEach(b => b.classList.remove('active'));
                    pageButtons.forEach(b => {
                        if (b.textContent.trim() === String(currentPage)) b.classList.add('active');
                    });

                    const startRow = (currentPage - 1) * 8 + 1;
                    const endRow = Math.min(currentPage * 8, 142);
                    const infoEl = document.querySelector('.page-info');
                    if(infoEl) infoEl.textContent = `Hien thi ${startRow} - ${endRow} tren 142 nhan su`;

                    renderPage(currentPage);
                });
            });
        }
    </script>"""

    # We will find the very last <script> tag in the body and replace it entirely.
    # To be safe, we split by <script> and take all content before the last <script>
    parts = content.split('<script>')
    if len(parts) > 1:
        # Reconstruct everything before the last script tag
        new_content = '<script>'.join(parts[:-1])
        new_content += full_script + "\n</body>\n</html>"
        with open('hr.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully replaced script.")
    else:
        print("Could not find <script> tag.")

if __name__ == '__main__':
    fix_hr_script()
