/**
 * Dashboard — dữ liệu động từ Supabase (DB.*)
 */
document.addEventListener('DOMContentLoaded', async () => {

    let period   = 'Tháng';
    let distMode = 'service';
    let hrPill   = 'position';
    let projectModalPage = 1;
    let hrModalPage      = 1;
    const PAGE_SIZE = 4;

    // Cache dữ liệu để tránh gọi lại nhiều lần
    let _projects     = [];
    let _employees    = [];
    let _assignments  = [];
    let _effortData   = [];
    let _serviceLines = [];

    const revenueView  = document.getElementById('revenueView');
    const hrView       = document.getElementById('hrView');
    const projectsView = document.getElementById('projectsView');

    // ── Modals ────────────────────────────────────────────────────────────────
    const modals = {
        report:        document.getElementById('reportModal'),
        export:        document.getElementById('exportModal'),
        hrSel:         document.getElementById('hrSelectionModal'),
        projectList:   document.getElementById('projectListModal'),
        revenueDetail: document.getElementById('revenueDetailModal')
    };
    const openMdl  = (m) => UI.openModal(m);
    const closeMdl = (m) => UI.closeModal(m);

    document.querySelector('.btn-report-auto')?.addEventListener('click', () => openMdl(modals.report));
    document.querySelector('.btn-export')?.addEventListener('click', () => openMdl(modals.export));
    document.querySelector('.btn-outline-sm')?.addEventListener('click', () => {
        renderHrModal();
        openMdl(modals.hrSel);
    });
    document.querySelector('.btn-view-all')?.addEventListener('click', () => {
        renderProjectModal();
        openMdl(modals.projectList);
    });
    document.querySelector('.details-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        projectModalPage = 1;
        renderProjectModal();
        openMdl(modals.projectList);
    });
    document.getElementById('viewRevenueDetail')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderRevenueDetailModal();
        openMdl(modals.revenueDetail);
    });

    [['closeReportModal',   'cancelReportBtn',   modals.report],
     ['closeExportModal',   'cancelExportBtn',   modals.export],
     ['closeHRModal',       'backHRModal',        modals.hrSel],
     ['closeProjectModal',  'backProjectModal',   modals.projectList],
     ['closeRevenueModal',  'backRevenueModal',   modals.revenueDetail]].forEach(([a, b, m]) => {
        document.getElementById(a)?.addEventListener('click', () => closeMdl(m));
        document.getElementById(b)?.addEventListener('click', () => closeMdl(m));
    });

    document.querySelector('.btn-save-settings')?.addEventListener('click', async () => {
        // Validate email tags riêng vì không phải input thông thường
        const emailContainer = document.getElementById('emailTagContainer');
        const emailTags = emailContainer ? emailContainer.querySelectorAll('.email-tag') : [];
        if (emailTags.length === 0) {
            emailContainer.style.borderColor = '#E20015';
            showToast('Lỗi nhập liệu', 'Vui lòng thêm ít nhất một email người nhận', 'error');
            return;
        }
        emailContainer.style.borderColor = '';

        if (validateForm(modals.report)) {
            const user = DB.Auth.currentUser();
            const cycle  = document.getElementById('reportCycle')?.value || 'Tháng';
            const day    = document.getElementById('reportDay')?.value;
            const time   = document.getElementById('reportTime')?.value;
            const note   = document.getElementById('reportNote')?.value || '';
            const fmt    = modals.report.querySelector('input[name="reportFormat"]:checked')?.value || 'PDF';

            // Lưu vào report_requests
            await DB.Logs.addAuditLog({
                action_type: 'INSERT',
                table_name:  'report_schedules',
                new_value:   { cycle, day, time, format: fmt, note }
            });

            showToast('Thành công', `Đã lưu thiết lập báo cáo tự động (${cycle}, ngày ${day}, ${time}).`);
            closeMdl(modals.report);
        }
    });

    document.querySelector('.btn-confirm-export')?.addEventListener('click', async () => {
        if (validateForm(modals.export)) {
            const fmt  = modals.export.querySelector('.format-card.active')?.dataset?.format?.toUpperCase() || 'PDF';
            const name = modals.export.querySelector('.modal-input-text')?.value?.trim() || 'Báo_cáo_Dashboard';

            showToast('Đang xử lý', `Đang tạo file ${fmt}...`);
            closeMdl(modals.export);

            try {
                if (fmt === 'PDF') {
                    exportPDF(name);
                } else {
                    exportExcel(name);
                }
                await DB.Logs.addAuditLog({
                    action_type: 'EXPORT',
                    table_name:  'dashboard',
                    new_value:   { report_name: name, format: fmt }
                });
            } catch (err) {
                console.error('[Export]', err);
                showToast('Lỗi', 'Xuất báo cáo thất bại: ' + err.message, 'error');
            }
        }
    });

    // ── EXPORT PDF ────────────────────────────────────────────────────────────
    function exportPDF(fileName) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Bỏ dấu tiếng Việt để jsPDF hiển thị đúng (jsPDF không hỗ trợ Unicode)
        function vi(str) {
            if (!str) return '';
            return str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D');
        }

        // Tiêu đề
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('DASHBOARD REPORT — BOSCH VIETNAM', 148, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Xuat ngay: ${new Date().toLocaleDateString('vi-VN')}`, 148, 22, { align: 'center' });

        let y = 30;

        // ── Bảng 1: Tổng quan dự án ──────────────────────────────────────────
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('1. Danh sach du an', 14, y);
        y += 4;

        const projRows = _projects.map(p => [
            p.project_code || '',
            vi(p.project_name || '').substring(0, 30),
            vi(p.customers?.company_name || '—'),
            (parseFloat(p.progress_percent) || 0).toFixed(1) + '%',
            p.priority || '—',
            p.revenue_amount
                ? new Intl.NumberFormat('vi-VN').format(parseFloat(p.revenue_amount)) + ' VND'
                : '0 VND'
        ]);

        doc.autoTable({
            startY: y,
            head: [['MA DU AN', 'TEN DU AN', 'KHACH HANG', 'TIEN DO', 'UU TIEN', 'DOANH THU']],
            body: projRows,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [0, 21, 61], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 14, right: 14 }
        });

        y = doc.lastAutoTable.finalY + 10;

        // ── Bảng 2: Doanh thu theo tháng ─────────────────────────────────────
        if (y > 170) { doc.addPage(); y = 15; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. Doanh thu theo thang (trieu VND)', 14, y);
        y += 4;

        const monthRevenue = new Array(12).fill(0);
        _effortData.forEach(e => {
            const m = (e.effort_month || 1) - 1;
            if (m >= 0 && m < 12) monthRevenue[m] += (parseFloat(e.revenue_amount) || 0) / 1_000_000;
        });

        doc.autoTable({
            startY: y,
            head: [['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']],
            body: [monthRevenue.map(v => Math.round(v) + 'M')],
            styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
            headStyles: { fillColor: [0, 86, 210], textColor: 255, fontStyle: 'bold' },
            margin: { left: 14, right: 14 }
        });

        y = doc.lastAutoTable.finalY + 10;

        // ── Bảng 3: Nhân sự ──────────────────────────────────────────────────
        if (y > 150) { doc.addPage(); y = 15; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. Danh sach nhan su', 14, y);
        y += 4;

        const workloadMap = buildWorkloadMap();
        const empRows = _employees.slice(0, 20).map(e => {
            const activeOrg = (e.employee_organizations || []).find(o => o.status === 'active')
                           || e.employee_organizations?.[0];
            return [
                e.employee_code || '',
                vi(e.full_name || '').substring(0, 25),
                vi(e.positions?.position_name || '—'),
                vi(activeOrg?.teams?.team_name || activeOrg?.groups?.group_name || '—'),
                Math.round(workloadMap[e.employee_id] || 0) + '%'
            ];
        });

        doc.autoTable({
            startY: y,
            head: [['MA NV', 'HO TEN', 'CHUC DANH', 'TEAM', 'WORKLOAD']],
            body: empRows,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [0, 21, 61], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 14, right: 14 }
        });

        doc.save(`${fileName}.pdf`);
        showToast('Thanh cong', `Da xuat file ${fileName}.pdf`);
    }

    // ── EXPORT EXCEL ──────────────────────────────────────────────────────────
    function exportExcel(fileName) {
        const XLSX = window.XLSX;
        const wb   = XLSX.utils.book_new();

        // Sheet 1: Dự án
        const projData = [
            ['Mã dự án', 'Tên dự án', 'Khách hàng', 'Tiến độ (%)', 'Ưu tiên', 'Ngân sách (VND)', 'Doanh thu (VND)', 'Ngày bắt đầu', 'Ngày kết thúc'],
            ..._projects.map(p => [
                p.project_code || '',
                p.project_name || '',
                p.customers?.company_name || '—',
                parseFloat(p.progress_percent) || 0,
                p.priority || '—',
                parseFloat(p.budget) || 0,
                parseFloat(p.revenue_amount) || 0,
                p.start_date || '',
                p.end_date || ''
            ])
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(projData);
        ws1['!cols'] = [12,30,25,12,10,18,18,12,12].map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws1, 'Du an');

        // Sheet 2: Doanh thu theo tháng × dự án
        const projectRevMap = {};
        _effortData.forEach(e => {
            const prj   = e.project_assignments?.project_resource_requests?.projects;
            const pName = prj?.project_name || 'Khong xac dinh';
            const val   = Math.round((parseFloat(e.revenue_amount) || 0) / 1_000_000);
            const m     = e.effort_month || 1;
            if (!projectRevMap[pName]) projectRevMap[pName] = new Array(12).fill(0);
            projectRevMap[pName][m - 1] += val;
        });

        const revenueData = [
            ['Du an', 'T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12','Tong cong'],
            ...Object.entries(projectRevMap).map(([name, months]) => [
                name, ...months, months.reduce((a, b) => a + b, 0)
            ])
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(revenueData);
        ws2['!cols'] = [{ wch: 30 }, ...new Array(13).fill({ wch: 10 })];
        XLSX.utils.book_append_sheet(wb, ws2, 'Doanh thu');

        // Sheet 3: Nhân sự
        const workloadMap = buildWorkloadMap();
        const empData = [
            ['Mã NV', 'Họ tên', 'Chức danh', 'Cấp độ', 'Team', 'Workload (%)', 'Ngày vào làm', 'Trạng thái'],
            ..._employees.map(e => {
                const activeOrg = (e.employee_organizations || []).find(o => o.status === 'active')
                               || e.employee_organizations?.[0];
                return [
                    e.employee_code || '',
                    e.full_name || '',
                    e.positions?.position_name || '—',
                    e.job_levels?.level_name || '—',
                    activeOrg?.teams?.team_name || activeOrg?.groups?.group_name || '—',
                    Math.round(workloadMap[e.employee_id] || 0),
                    e.hire_date || '',
                    e.status || ''
                ];
            })
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(empData);
        ws3['!cols'] = [10,25,20,12,18,14,12,12].map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws3, 'Nhan su');

        XLSX.writeFile(wb, `${fileName}.xlsx`);
        showToast('Thành công', `Đã xuất file ${fileName}.xlsx`);
    }

    modals.projectList?.querySelector('.btn-save-red')?.addEventListener('click', () => {
        showToast('Thành công', 'Đã lưu danh sách dự án trọng điểm.');
        closeMdl(modals.projectList);
    });
    modals.hrSel?.querySelector('.btn-save-red')?.addEventListener('click', () => {
        showToast('Thành công', 'Đã lưu bộ lọc nhân sự cho heatmap.');
        renderHeatmap();
        closeMdl(modals.hrSel);
    });
    modals.revenueDetail?.querySelector('.btn-save-red')?.addEventListener('click', () => {
        showToast('Thành công', 'Đã lưu chi tiết doanh thu.');
        closeMdl(modals.revenueDetail);
    });

    document.querySelectorAll('.format-card').forEach((card) => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.format-card').forEach((c) => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // ── Tabs ──────────────────────────────────────────────────────────────────
    document.querySelectorAll('.bosch-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bosch-tab').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            revenueView.style.display  = tab === 'revenue'  ? 'block' : 'none';
            hrView.style.display       = tab === 'hr'       ? 'block' : 'none';
            projectsView.style.display = tab === 'projects' ? 'block' : 'none';
            const dateFilters = document.querySelector('.date-filters');
            if (dateFilters) dateFilters.style.display = tab === 'revenue' ? 'flex' : 'none';
            if (tab === 'hr')       renderHeatmap();
            if (tab === 'projects') { renderProjectsTab(); renderProjectBarChart(); }
        });
    });

    // ── Period buttons ────────────────────────────────────────────────────────
    const monthlyChart   = document.getElementById('revenueChartMonthly');
    const yearlyChart    = document.getElementById('revenueChartYearly');
    const quarterlyChart = document.getElementById('revenueChartQuarterly');

    function switchChartView() {
        monthlyChart.style.display   = period === 'Tháng' ? 'block' : 'none';
        quarterlyChart.style.display = period === 'Quý'   ? 'flex'  : 'none';
        yearlyChart.style.display    = period === 'Năm'   ? 'flex'  : 'none';
    }

    document.querySelectorAll('.period-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            period = btn.textContent.trim();
            switchChartView();
            renderRevenueChart();
            refreshStats();
        });
    });

    // ── Distribution toggle ───────────────────────────────────────────────────
    document.querySelectorAll('.toggle-btn-modern').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn-modern').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            distMode = btn.textContent.includes('Dự án') ? 'project' : 'service';
            renderDistribution();
        });
    });

    // ── HR pills ──────────────────────────────────────────────────────────────
    const pillMap = { 'Vị trí': 'position', 'Mảng dịch vụ': 'service', 'Dự án': 'project' };
    document.querySelectorAll('.pill').forEach((pill) => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
            pill.classList.add('active');
            hrPill = pillMap[pill.textContent.trim()] || 'position';
            renderHrBars();
        });
    });

    // ── Delivery week/month ───────────────────────────────────────────────────
    document.querySelectorAll('.toggle-btn-sm').forEach((btn, i, arr) => {
        btn.addEventListener('click', () => {
            arr.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            renderDeliveryChart(btn.textContent.includes('tuần') ? 'week' : 'month');
        });
    });

    // ── Date picker ───────────────────────────────────────────────────────────
    const datePicker = document.getElementById('dashboardDatePicker');
    const dateMenu   = document.getElementById('dateDropdownMenu');
    if (datePicker && dateMenu) {
        datePicker.addEventListener('click', (e) => {
            if (e.target.closest('#dateDropdownMenu')) return;
            e.stopPropagation();
            dateMenu.style.display = dateMenu.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', (e) => {
            if (!datePicker.contains(e.target)) dateMenu.style.display = 'none';
        });
    }

    window.applyCustomDateRange = function (event) {
        if (event) event.stopPropagation();
        const start = document.getElementById('startDateInput')?.value;
        const end   = document.getElementById('endDateInput')?.value;
        if (!start || !end) return;
        const fmt = (s) => s.split('-').reverse().join('/');
        document.getElementById('datePickerText').textContent = `${fmt(start)} - ${fmt(end)}`;
        dateMenu.style.display = 'none';
        refreshAll();
        showToast('Đã cập nhật', `Dữ liệu cho khoảng ${fmt(start)} - ${fmt(end)}`);
    };

    // ── DATA LOADING ──────────────────────────────────────────────────────────
    async function loadAllData() {
        const [projRes, empRes, assignRes, effortRes, slRes] = await Promise.all([
            DB.Projects.getAll(),
            DB.Employees.getAll(),
            DB.Assignments.getAll(),
            DB.Effort.getAll(),
            DB.ServiceLines.getAll()
        ]);
        _projects     = projRes.data    || [];
        _employees    = empRes.data     || [];
        _assignments  = assignRes.data  || [];
        _effortData   = effortRes.data  || [];
        _serviceLines = slRes.data      || [];
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    /**
     * Tính tổng revenue_amount từ effort_projects theo tháng/quý/năm.
     * Trả về mảng số (đơn vị: triệu VND) để vẽ biểu đồ.
     */
    function buildRevenueTrend() {
        const byMonth  = new Array(12).fill(0);
        const byQuarter = new Array(4).fill(0);
        const byYear   = {};

        _effortData.forEach((e) => {
            const val = parseFloat(e.revenue_amount) || 0;
            const m   = e.effort_month; // 1–12
            const y   = e.effort_year;
            if (m >= 1 && m <= 12) byMonth[m - 1]  += val;
            const q = Math.ceil(m / 3) - 1;
            if (q >= 0 && q < 4)   byQuarter[q]    += val;
            if (y) byYear[y] = (byYear[y] || 0) + val;
        });

        // Chuyển sang triệu VND (chia 1_000_000), làm tròn
        const toM = (arr) => arr.map((v) => Math.round(v / 1_000_000));
        const yearKeys = Object.keys(byYear).sort();
        return {
            Tháng: toM(byMonth),
            Quý:   toM(byQuarter),
            Năm:   yearKeys.map((y) => Math.round(byYear[y] / 1_000_000)),
            _yearKeys: yearKeys
        };
    }

    /**
     * Tính doanh thu theo service line hoặc project từ effort_projects.
     */
    function buildRevenueDistribution() {
        const byService = {};
        const byProject = {};

        _effortData.forEach((e) => {
            const val  = parseFloat(e.revenue_amount) || 0;
            const prj  = e.project_assignments?.project_resource_requests?.projects;
            const pName = prj?.project_name || 'Không xác định';
            byProject[pName] = (byProject[pName] || 0) + val;
        });

        // Service line: lấy từ projects → contracts → service_lines
        _projects.forEach((p) => {
            const slName = p.contracts?.service_lines?.service_line_name || 'Không xác định';
            const rev    = parseFloat(p.revenue_amount) || 0;
            byService[slName] = (byService[slName] || 0) + rev;
        });

        const toArr = (obj) =>
            Object.entries(obj)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 6);

        return { byService: toArr(byService), byProject: toArr(byProject) };
    }

    /**
     * Tính workload % của nhân viên từ project_assignments.allocation_percent.
     * Nếu nhân viên có nhiều assignment thì cộng dồn (tối đa 100).
     */
    function buildWorkloadMap() {
        const map = {};
        _assignments.forEach((a) => {
            const empId = a.employee_id;
            const pct   = parseFloat(a.allocation_percent) || 0;
            map[empId]  = Math.min((map[empId] || 0) + pct, 100);
        });
        return map;
    }

    // ── STATS CARDS ───────────────────────────────────────────────────────────
    function refreshStats() {
        // --- Revenue tab ---
        const totalRevenue    = _projects.reduce((s, p) => s + (parseFloat(p.revenue_amount) || 0), 0);
        // Suy trạng thái từ progress_percent (schema không có cột status)
        const activeProjects  = _projects.filter((p) => {
            const pct = parseFloat(p.progress_percent) || 0;
            return pct > 0 && pct < 100;
        }).length;
        const doneProjects    = _projects.filter((p) => parseFloat(p.progress_percent) >= 100).length;
        const performance     = _projects.length
            ? Math.round((doneProjects / _projects.length) * 100)
            : 0;

        const cards = document.querySelectorAll('#revenueView .stats-grid .bosch-stat-card');
        if (cards[0]) {
            cards[0].querySelector('.bosch-stat-value').innerHTML =
                `${UI.formatVnd(totalRevenue)} <span class="currency">VND</span>`;
            const trend = cards[0].querySelector('.bosch-stat-trend');
            if (trend) trend.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${activeProjects} dự án đang chạy`;
        }
        if (cards[1]) cards[1].querySelector('.bosch-stat-value').textContent = String(activeProjects);
        if (cards[2]) cards[2].querySelector('.bosch-stat-value').textContent = `${performance}%`;

        // --- HR tab ---
        const workloadMap  = buildWorkloadMap();
        const totalEmp     = _employees.length;
        const trainedCount = _employees.filter((e) => {
            // Nhân viên có ít nhất 1 employee_study hoàn thành — dùng dữ liệu có sẵn
            return false; // sẽ cập nhật khi có join employee_study
        }).length;
        const unassigned   = _employees.filter((e) => (workloadMap[e.employee_id] || 0) < 30).length;

        const hrCards = document.querySelectorAll('#hrView .stats-grid .bosch-stat-card');
        if (hrCards[0]) hrCards[0].querySelector('.bosch-stat-value').textContent = UI.formatNumber(totalEmp);
        if (hrCards[1]) hrCards[1].querySelector('.bosch-stat-value').textContent =
            totalEmp ? Math.round((unassigned / totalEmp) * 100) + '%' : '0%';
        if (hrCards[2]) hrCards[2].querySelector('.bosch-stat-value').textContent =
            totalEmp ? Math.round(((totalEmp - unassigned) / totalEmp) * 100) + '%' : '0%';

        // --- Projects tab ---
        const late = _projects.filter(
            (p) => {
                const pct = parseFloat(p.progress_percent) || 0;
                return pct < 50 && pct < 100;
            }
        ).length;
        const prjCards = document.querySelectorAll('#projectsView .stats-grid .bosch-stat-card');
        if (prjCards[0]) prjCards[0].querySelector('.bosch-stat-value').textContent = String(_projects.length);
        if (prjCards[1]) prjCards[1].querySelector('.bosch-stat-value').textContent =
            _projects.length ? Math.round((doneProjects / _projects.length) * 100) + '%' : '0%';
        if (prjCards[2]) prjCards[2].querySelector('.bosch-stat-value').textContent =
            String(late).padStart(2, '0');
        if (prjCards[3]) prjCards[3].querySelector('.bosch-stat-value').textContent =
            activeProjects ? Math.round((activeProjects / _projects.length) * 100) + '%' : '0%';

        // Cập nhật donut chart từ dữ liệu thực
        const inProgress = _projects.filter(p => { const pct = parseFloat(p.progress_percent)||0; return pct > 0 && pct < 100; }).length;
        const paused     = _projects.filter(p => parseFloat(p.progress_percent) === 0).length;
        const total      = _projects.length || 1;
        const donutNum   = document.querySelector('#projectsView .donut-num');
        if (donutNum) donutNum.textContent = total;
        const legendVals = document.querySelectorAll('#projectsView .donut-legend .val');
        if (legendVals[0]) legendVals[0].textContent = inProgress;
        if (legendVals[1]) legendVals[1].textContent = doneProjects;
        if (legendVals[2]) legendVals[2].textContent = paused;
        if (legendVals[3]) legendVals[3].textContent = late;
    }

    // ── REVENUE CHART ─────────────────────────────────────────────────────────
    function renderRevenueChart() {
        const trend = buildRevenueTrend();

        if (period === 'Tháng') {
            const data = trend.Tháng;
            const max  = Math.max(...data, 1);
            const w = 600, h = 260;
            const pts = data.map((v, i) => {
                const x = (i / Math.max(data.length - 1, 1)) * w;
                const y = h - (v / max) * (h - 40);
                return [x, y];
            });
            const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
            const area = line + ` L${w},300 L0,300 Z`;
            const svg  = monthlyChart?.querySelector('svg');
            if (svg) {
                const paths = svg.querySelectorAll('path');
                if (paths[0]) paths[0].setAttribute('d', area);
                if (paths[1]) paths[1].setAttribute('d', line);
            }
            const axis = monthlyChart?.querySelector('.chart-x-axis');
            if (axis) axis.innerHTML = data.map((_, i) => `<span>T${i + 1}</span>`).join('');
        }

        if (period === 'Quý' && quarterlyChart) {
            const quarters = trend.Quý;
            const qmax     = Math.max(...quarters, 1);
            const labels   = ['Q1', 'Q2', 'Q3', 'Q4'];
            const barsContainer = document.getElementById('quarterlyBarsContainer');
            const xAxis         = document.getElementById('quarterlyXAxis');
            if (barsContainer) {
                barsContainer.innerHTML = quarters.map((v) => {
                    const pct = Math.round((v / qmax) * 100);
                    return `<div class="year-bar" style="height:${pct}%;"><div class="year-bar-top"></div></div>`;
                }).join('');
            }
            if (xAxis) xAxis.innerHTML = labels.map((l) => `<span>${l}</span>`).join('');
        }

        if (period === 'Năm' && yearlyChart) {
            const years    = trend.Năm;
            const ymax     = Math.max(...years, 1);
            const yearKeys = trend._yearKeys;
            const barsContainer = document.getElementById('yearlyBarsContainer');
            const xAxis         = document.getElementById('yearlyXAxis');
            if (barsContainer) {
                barsContainer.innerHTML = years.map((v, i) => {
                    const pct = Math.round((v / ymax) * 100);
                    return `<div class="year-bar" style="height:${pct}%;" data-year="${yearKeys[i] || ''}">
                        <div class="year-bar-top"></div></div>`;
                }).join('');
            }
            if (xAxis) xAxis.innerHTML = yearKeys.map((y) => `<span>${y}</span>`).join('');
        }
    }

    // ── DISTRIBUTION ──────────────────────────────────────────────────────────
    function renderDistribution() {
        const list = document.querySelector('.distribution-list');
        if (!list) return;
        const dist   = buildRevenueDistribution();
        const items  = distMode === 'project' ? dist.byProject : dist.byService;
        const max    = Math.max(...items.map((i) => i.value), 1);
        const colors = ['#00153D', '#0056D2', '#2563EB', '#7FBBE3', '#93C5FD', '#BFDBFE'];
        list.innerHTML = items.map((item, i) => `
            <div class="dist-item">
                <div class="dist-info">
                    <span class="dist-name">${UI.escape(item.name)}</span>
                    <span class="dist-val">${UI.formatVnd(item.value)} VND</span>
                </div>
                <div class="progress-bar-modern">
                    <div class="progress-fill-modern" style="width:${Math.round((item.value / max) * 100)}%;background:${colors[i % colors.length]};"></div>
                </div>
            </div>`).join('');
    }

    // ── HEATMAP (effort % nhân viên × tháng) ─────────────────────────────────
    function renderHeatmap() {
        const grid = document.getElementById('heatmapTable');
        if (!grid) return;

        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // Gom effort theo employee × tháng
        const empMap = {}; // { empId: { name, data: [12 tháng] } }
        _effortData.forEach((e) => {
            const pa      = e.project_assignments;
            const empId   = pa?.employee_id;
            const empName = pa?.employees?.full_name || 'N/A';
            if (!empId) return;
            const m   = (e.effort_month || 1) - 1; // 0-indexed
            const pct = parseFloat(e.effort_percent) || 0;
            if (!empMap[empId]) empMap[empId] = { name: empName, data: new Array(12).fill(0), total: 0 };
            if (m >= 0 && m < 12) {
                empMap[empId].data[m] += pct;
                empMap[empId].total   += pct;
            }
        });

        // Sort theo tổng effort giảm dần, lấy top 10
        const entries = Object.values(empMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        if (!entries.length) {
            grid.innerHTML = '<caption style="padding:20px;color:#6b7280;">Chưa có dữ liệu effort</caption>';
            return;
        }

        let thead = '<thead><tr><th></th>';
        months.forEach((m) => (thead += `<th>${m}</th>`));
        thead += '</tr></thead>';

        let tbody = '<tbody>';
        entries.forEach(({ name, data }) => {
            tbody += `<tr><td class="heatmap-emp-name">${UI.escape(name)}</td>`;
            data.forEach((val) => {
                const v   = Math.round(val);
                let cls   = 'level-0';
                if (v > 0  && v < 50)  cls = 'level-1';
                else if (v < 75)       cls = 'level-2';
                else if (v < 100)      cls = 'level-3';
                else if (v <= 120)     cls = 'level-4';
                else                   cls = 'level-5';
                tbody += `<td class="heatmap-cell-table ${cls}">${v || ''}</td>`;
            });
            tbody += '</tr>';
        });
        tbody += '</tbody>';
        grid.innerHTML = thead + tbody;
    }

    // ── HR BARS (số nhân sự theo vị trí / mảng dịch vụ / dự án) ─────────────
    function renderHrBars() {
        const bars   = document.querySelectorAll('.hr-bar-item');
        const labels = document.querySelectorAll('.bar-label');
        if (!bars.length) return;

        let groups = {}; // { label: count }

        if (hrPill === 'position') {
            // Đếm nhân viên theo position_name
            _employees.forEach((e) => {
                const pos = e.positions?.position_name || 'Khác';
                groups[pos] = (groups[pos] || 0) + 1;
            });
        } else if (hrPill === 'service') {
            // Đếm nhân viên đang được assign vào project theo service line
            const empServiceMap = {}; // empId → Set<serviceLine>
            _assignments.forEach((a) => {
                const empId = a.employee_id;
                const prj   = _projects.find(
                    (p) => p.project_id === a.project_resource_requests?.project_id
                );
                const sl = prj?.contracts?.service_lines?.service_line_name || 'Khác';
                if (!empServiceMap[empId]) empServiceMap[empId] = new Set();
                empServiceMap[empId].add(sl);
            });
            // Mỗi nhân viên tính 1 lần cho mỗi service line họ tham gia
            Object.values(empServiceMap).forEach((slSet) => {
                slSet.forEach((sl) => { groups[sl] = (groups[sl] || 0) + 1; });
            });
            // Nếu không có assignment nào, fallback đếm theo service line của project
            if (!Object.keys(groups).length) {
                _serviceLines.forEach((sl) => { groups[sl.service_line_name] = 0; });
            }
        } else if (hrPill === 'project') {
            // Đếm nhân viên đang được assign vào từng project
            const empPrjMap = {}; // empId → Set<projectName>
            _assignments.forEach((a) => {
                const empId = a.employee_id;
                const prj   = _projects.find(
                    (p) => p.project_id === a.project_resource_requests?.project_id
                );
                const pName = prj?.project_name || 'Khác';
                if (!empPrjMap[empId]) empPrjMap[empId] = new Set();
                empPrjMap[empId].add(pName);
            });
            Object.values(empPrjMap).forEach((pSet) => {
                pSet.forEach((pName) => { groups[pName] = (groups[pName] || 0) + 1; });
            });
        }

        // Sắp xếp giảm dần, lấy top 5
        const sorted = Object.entries(groups)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const MAX_BAR_PX = 200; // chiều cao tối đa của cột cao nhất (px)
        const maxCount = Math.max(...sorted.map((g) => g.count), 1);

        bars.forEach((barItem, i) => {
            const fill  = barItem.querySelector('.hr-bar-fill');
            const valEl = barItem.querySelector('.bar-val');
            const lblEl = barItem.querySelector('.bar-label');
            const entry = sorted[i];

            if (!fill) return;

            if (entry) {
                const heightPx = Math.max(Math.round((entry.count / maxCount) * MAX_BAR_PX), 8);
                fill.style.height = heightPx + 'px';
                if (valEl) valEl.textContent = entry.count;
                if (lblEl) {
                    // Rút gọn label dài
                    const short = entry.name
                        .replace('Software Engineer', 'Dev')
                        .replace('QA Engineer', 'Tester')
                        .replace('UI/UX Designer', 'Design')
                        .replace('Project Manager', 'PM')
                        .replace('Business Analyst', 'BA')
                        .replace('DevOps Engineer', 'DevOps')
                        .replace('Data Engineer', 'Data')
                        .replace('Embedded Engineer', 'Embedded')
                        .replace('Product Owner', 'PO')
                        .replace('Scrum Master', 'SM');
                    lblEl.textContent = short.length > 10 ? short.slice(0, 9) + '…' : short;
                }
            } else {
                fill.style.height = '8px';
                if (valEl) valEl.textContent = '0';
            }
        });
    }

    // ── PROJECT BAR CHART (số dự án theo tháng) ──────────────────────────────
    function renderProjectBarChart() {
        const container = document.getElementById('projectBarChart');
        const xAxis     = document.getElementById('projectBarXAxis');
        if (!container || !xAxis) return;

        const currentYear = new Date().getFullYear();
        const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

        // Đếm số dự án đang active trong từng tháng
        // Dự án active trong tháng M nếu start_date <= cuối tháng M VÀ (end_date >= đầu tháng M hoặc null)
        const counts = months.map((_, i) => {
            const mStart = new Date(currentYear, i, 1);
            const mEnd   = new Date(currentYear, i + 1, 0);
            return _projects.filter(p => {
                const start = p.start_date ? new Date(p.start_date) : null;
                const end   = p.end_date   ? new Date(p.end_date)   : null;
                if (!start) return false;
                return start <= mEnd && (!end || end >= mStart);
            }).length;
        });

        const maxCount = Math.max(...counts, 1);
        const BAR_H    = 180; // px chiều cao tối đa

        // Tháng hiện tại để highlight
        const currentMonth = new Date().getMonth();

        container.innerHTML = counts.map((count, i) => {
            const h       = Math.max(Math.round((count / maxCount) * BAR_H), count > 0 ? 8 : 4);
            const isActive = i === currentMonth;
            const bg      = isActive ? '#2563EB' : '#CBD5E1';
            const txtColor = isActive ? '#2563EB' : '#374151';
            return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;justify-content:flex-end;height:${BAR_H}px;position:relative;">
                ${count > 0 ? `<span style="font-size:11px;font-weight:700;color:${txtColor};">${count}</span>` : ''}
                <div style="width:28px;height:${h}px;background:${bg};border-radius:4px 4px 0 0;transition:height 0.4s ease;"></div>
            </div>`;
        }).join('');

        xAxis.innerHTML = months.map((m, i) => {
            const isActive = i === currentMonth;
            return `<span style="flex:1;text-align:center;font-weight:${isActive ? '700' : '500'};color:${isActive ? '#2563EB' : '#6b7280'};">${m}</span>`;
        }).join('');
    }

    // ── PROJECTS TAB BAR CHART ────────────────────────────────────────────────
    function renderProjectBarChart() {
        const container = document.getElementById('projectBarChart');
        const xAxis     = document.getElementById('projectBarXAxis');
        if (!container || !xAxis) return;

        const MAX_H = 280; // px — chiều cao cột cao nhất, container 320px

        // Đếm số project unique theo tháng từ effort_projects
        const projectsByMonth = {};
        _effortData.forEach(e => {
            const m   = (e.effort_month || 1) - 1; // 0-indexed
            const prj = e.project_assignments?.project_resource_requests?.projects;
            const pid = prj?.project_code || null;
            if (m >= 0 && m < 12 && pid) {
                if (!projectsByMonth[m]) projectsByMonth[m] = new Set();
                projectsByMonth[m].add(pid);
            }
        });

        const byMonth = Array.from({ length: 12 }, (_, i) => projectsByMonth[i]?.size || 0);

        // Fallback nếu không có effort data
        if (!byMonth.some(v => v > 0) && _projects.length > 0) {
            const total = _projects.length;
            [0,1,2,3,4].forEach(i => { byMonth[i] = total; });
        }

        const maxVal   = Math.max(...byMonth, 1);
        const months   = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
        const nowMonth = new Date().getMonth(); // 0-indexed

        container.innerHTML = byMonth.map((v, i) => {
            const barH     = v > 0 ? Math.max(Math.round((v / maxVal) * MAX_H), 12) : 0;
            const isActive = i === nowMonth;
            const barColor = isActive ? '#93C5FD' : '#E2E8F0';
            const numColor = isActive ? '#1d4ed8' : '#6b7280';

            return `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;flex:1;height:${MAX_H}px;position:relative;">
                ${v > 0 ? `<span style="font-size:12px;font-weight:700;color:${numColor};margin-bottom:4px;">${v}</span>` : ''}
                ${isActive && v > 0 ? `
                <div style="position:absolute;top:${MAX_H - barH - 28}px;background:#1e293b;color:white;font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap;">
                    ${v}
                    <div style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid #1e293b;"></div>
                </div>` : ''}
                <div style="width:36px;height:${barH}px;background:${barColor};border-radius:4px 4px 0 0;transition:height 0.4s ease;"></div>
            </div>`;
        }).join('');

        xAxis.innerHTML = months.map((m, i) => {
            const isActive = i === nowMonth;
            return `<span style="flex:1;text-align:center;font-size:12px;font-weight:${isActive ? '700' : '500'};color:${isActive ? '#2563EB' : '#6b7280'};">${m}</span>`;
        }).join('');
    }
    function renderProjectsTab() {
        const tbody = document.querySelector('#projectsView .table-container-projects tbody');
        if (!tbody) return;
        const projects = _projects.slice(0, 5);
        tbody.innerHTML = projects.map((p) => {
            const progress = parseFloat(p.progress_percent) || 0;
            const late     = progress < 50 && progress < 100;
            let statusLabel = 'Đang triển khai';
            if (progress >= 100) statusLabel = 'Hoàn thành';
            else if (progress === 0) statusLabel = 'Chưa bắt đầu';
            else if (progress < 15) statusLabel = 'Tạm dừng';
            // Leader: lấy nhân viên đầu tiên được assign vào project
            const leaderAssign = _assignments.find(a =>
                a.project_resource_requests?.project_id === p.project_id
            );
            const leader = leaderAssign?.employees?.full_name
                        || p.customers?.contact_person
                        || '—';
            return `
            <tr data-id="${p.project_id}">
                <td class="bold">${UI.escape(p.project_code || '')}</td>
                <td>${UI.escape(p.project_name || '')}</td>
                <td><div class="assignee"><div class="avatar-circle">${UI.escape((leader).charAt(0))}</div><span>${UI.escape(leader)}</span></div></td>
                <td><div class="progress-cell"><div class="progress-dot ${late ? 'red' : ''}"></div><span>${Math.round(progress)}%</span></div></td>
                <td>${UI.badge(statusLabel)}</td>
                <td><i class="fa-solid fa-pen action-icon" data-edit="${p.project_id}"></i></td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('[data-edit]').forEach((icon) => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = 'operations.html';
            });
        });
        document.querySelector('#projectsView .details-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            projectModalPage = 1;
            renderProjectModal();
            openMdl(modals.projectList);
        });
        document.querySelector('#projectsView .fab-add')?.addEventListener('click', () => {
            window.location.href = 'operations.html';
        });
    }

    // ── PROJECT MODAL ─────────────────────────────────────────────────────────
    function renderProjectModal() {
        const tbody      = modals.projectList?.querySelector('tbody');
        if (!tbody) return;
        const totalPages = Math.ceil(_projects.length / PAGE_SIZE) || 1;
        const page       = Math.min(projectModalPage, totalPages);
        const slice      = _projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        tbody.innerHTML = slice.map((p) => {
            const progress = parseFloat(p.progress_percent) || 0;
            // Leader: ưu tiên manager của project (qua assignments), fallback contact_person
            const leaderEmp = _assignments.find(a =>
                a.project_resource_requests?.project_id === p.project_id
            );
            const leader = leaderEmp
                ? (leaderEmp.employees?.full_name || p.customers?.contact_person || '—')
                : (p.customers?.contact_person || '—');
            // Suy trạng thái từ progress_percent
            let statusLabel = 'Đang triển khai';
            if (progress >= 100) statusLabel = 'Hoàn thành';
            else if (progress === 0) statusLabel = 'Chưa bắt đầu';
            else if (progress < 15) statusLabel = 'Tạm dừng';
            return `
            <tr>
                <td class="id-cell">${UI.escape(p.project_code || '')}</td>
                <td class="bold">${UI.escape(p.project_name || '')}</td>
                <td><div class="manager-cell"><span>${UI.escape(leader)}</span></div></td>
                <td><div class="progress-col"><span class="progress-val blue">${Math.round(progress)}%</span>
                    <div class="mini-progress-bar"><div class="mini-progress-fill blue" style="width:${Math.round(progress)}%;"></div></div></div></td>
                <td style="text-align:center;">${UI.badge(statusLabel)}</td>
            </tr>`;
        }).join('');

        const pag = modals.projectList?.querySelector('.pagination-controls span');
        if (pag) pag.textContent = `Trang ${page} / ${totalPages}`;

        const ctrls = modals.projectList?.querySelectorAll('.pagination-controls i');
        ctrls?.[0]?.replaceWith(ctrls[0].cloneNode(true));
        ctrls?.[1]?.replaceWith(ctrls[1].cloneNode(true));
        const [prev, next] = modals.projectList.querySelectorAll('.pagination-controls i');
        prev?.addEventListener('click', () => { if (projectModalPage > 1) { projectModalPage--; renderProjectModal(); } });
        next?.addEventListener('click', () => { if (projectModalPage < totalPages) { projectModalPage++; renderProjectModal(); } });
    }

    // ── HR MODAL ──────────────────────────────────────────────────────────────
    function renderHrModal() {
        const tbody = modals.hrSel?.querySelector('tbody');
        if (!tbody) return;

        const workloadMap = buildWorkloadMap();

        // Gắn workload vào employees, sort theo workload giảm dần
        const staffWithLoad = _employees.map((e) => {
            const activeOrg = (e.employee_organizations || []).find(o => o.status === 'active')
                           || e.employee_organizations?.[0];
            return {
                id:       e.employee_code || e.employee_id,
                name:     e.full_name || '—',
                title:    e.positions?.position_name || '—',
                team:     activeOrg?.teams?.team_name
                          || activeOrg?.sub_teams?.sub_team_name
                          || activeOrg?.groups?.group_name
                          || '—',
                workload: Math.round(workloadMap[e.employee_id] || 0)
            };
        }).sort((a, b) => b.workload - a.workload); // bận nhất lên đầu

        function workloadBadge(w) {
            if (w >= 90) return { cls: 'badge-danger',  text: 'QUÁ TẢI'  };
            if (w >= 75) return { cls: 'badge-warning', text: 'CAO'       };
            if (w >= 50) return { cls: 'badge-success', text: 'ỔN ĐỊNH'   };
            return             { cls: 'badge-info',     text: 'RẢNH RỖI'  };
        }
        function progressColor(w) {
            if (w >= 90) return '#ef4444';
            if (w >= 75) return '#f59e0b';
            return '#22c55e';
        }

        tbody.innerHTML = staffWithLoad.map((s) => {
            const b        = workloadBadge(s.workload);
            const barColor = progressColor(s.workload);
            const rowBg    = s.workload >= 90 ? 'background:#fff5f5;' : '';
            return `
            <tr style="${rowBg}">
                <td class="code-col">${UI.escape(s.id)}</td>
                <td class="name-col">${UI.escape(s.name)}</td>
                <td>${UI.escape(s.title)}</td>
                <td>${UI.escape(s.team)}</td>
                <td style="min-width:200px;">
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <div style="background:#e5e7eb;border-radius:999px;height:6px;overflow:hidden;">
                            <div style="width:${s.workload}%;height:100%;background:${barColor};border-radius:999px;"></div>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <span class="badge ${b.cls}" style="font-size:11px;">${b.text}</span>
                            <span style="font-size:13px;font-weight:600;color:#374151;">${s.workload}%</span>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // ── REVENUE DETAIL MODAL ──────────────────────────────────────────────────
    function renderRevenueDetailModal() {
        const thead = document.getElementById('revenueDetailThead');
        const tbody = document.getElementById('revenueDetailTbody');
        const title = document.getElementById('revenueDetailTitle');
        if (!thead || !tbody) return;

        // Gom effort_projects theo project × tháng/quý/năm
        const projectRevMap = {}; // { projectName: { months: [], status } }

        _effortData.forEach((e) => {
            const prj   = e.project_assignments?.project_resource_requests?.projects;
            const pName = prj?.project_name || 'Không xác định';
            const val   = Math.round((parseFloat(e.revenue_amount) || 0) / 1_000_000); // triệu VND
            const m     = e.effort_month || 1;
            const y     = e.effort_year  || new Date().getFullYear();

            if (!projectRevMap[pName]) {
                projectRevMap[pName] = {
                    months:  new Array(12).fill(0),
                    quarters: new Array(4).fill(0),
                    years:   {},
                    status:  _projects.find((p) => p.project_name === pName)?.status || '—'
                };
            }
            projectRevMap[pName].months[m - 1]                  += val;
            projectRevMap[pName].quarters[Math.ceil(m / 3) - 1] += val;
            projectRevMap[pName].years[y] = (projectRevMap[pName].years[y] || 0) + val;
        });

        const rows = Object.entries(projectRevMap);

        let cols, label, getVals;
        if (period === 'Tháng') {
            cols    = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
            label   = 'tháng ' + new Date().getFullYear();
            getVals = (r) => r.months;
        } else if (period === 'Quý') {
            cols    = ['Q1','Q2','Q3','Q4'];
            label   = 'quý ' + new Date().getFullYear();
            getVals = (r) => r.quarters;
        } else {
            const allYears = [...new Set(_effortData.map((e) => e.effort_year).filter(Boolean))].sort();
            cols    = allYears.map(String);
            label   = 'các năm';
            getVals = (r) => allYears.map((y) => r.years[y] || 0);
        }

        if (title) title.textContent = `Chi tiết doanh thu theo dự án - ${label}`;

        thead.innerHTML = `<tr>
            <th>TÊN DỰ ÁN</th>
            ${cols.map((c) => `<th>${c}</th>`).join('')}
            <th style="color:#dc2626;">TỔNG CỘNG</th>
            <th>TRẠNG THÁI</th>
        </tr>`;

        function fmtM(val) {
            if (val >= 1000) return (val / 1000).toFixed(2).replace(/\.?0+$/, '') + 'B';
            return val + 'M';
        }

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="${cols.length + 3}" style="text-align:center;padding:20px;color:#6b7280;">Chưa có dữ liệu doanh thu</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(([name, r]) => {
            const vals  = getVals(r);
            const total = vals.reduce((a, b) => a + b, 0);
            // Suy trạng thái từ progress_percent của project tương ứng
            const prjData = _projects.find(p => p.project_name === name);
            const pct = parseFloat(prjData?.progress_percent) || 0;
            let statusLabel = 'Đang triển khai';
            if (pct >= 100)      statusLabel = 'Hoàn thành';
            else if (pct === 0)  statusLabel = 'Chưa bắt đầu';
            else if (pct < 15)   statusLabel = 'Tạm dừng';
            const badgeCls = statusLabel === 'Hoàn thành'    ? 'badge-success'
                           : statusLabel === 'Tạm dừng'      ? 'badge-warning'
                           : statusLabel === 'Chưa bắt đầu'  ? 'badge-secondary'
                           : 'badge-info';
            return `<tr>
                <td class="name-col">${UI.escape(name)}</td>
                ${vals.map((v) => `<td>${fmtM(v)}</td>`).join('')}
                <td style="font-weight:700;color:#dc2626;">${fmtM(total)}</td>
                <td><span class="badge ${badgeCls}">${UI.escape(statusLabel)}</span></td>
            </tr>`;
        }).join('');
    }

    // ── REFRESH ALL ───────────────────────────────────────────────────────────
    function refreshAll() {
        refreshStats();
        renderRevenueChart();
        renderDistribution();
        renderHeatmap();
        renderHrBars();
        renderProjectsTab();
        renderProjectBarChart();
    }

    // ── EMAIL TAG INPUT ───────────────────────────────────────────────────────
    async function initEmailTags() {
        const emailContainer = document.getElementById('emailTagContainer');
        const emailInput     = document.getElementById('emailTagInput');
        if (!emailContainer || !emailInput || emailContainer._initialized) return;
        emailContainer._initialized = true;

        // Xóa tag hardcode trong HTML, chỉ giữ input
        emailContainer.querySelectorAll('.email-tag').forEach(t => t.remove());

        // Lấy danh sách email gợi ý — query từ users (company_email) join employees (full_name)
        let suggestionList = [];
        try {
            const { data } = await window.supabaseClient
                .from('users')
                .select('company_email, employees(full_name)')
                .not('company_email', 'is', null);
            if (data) {
                suggestionList = data.map(u => ({
                    email: u.company_email,
                    name: u.employees?.full_name || ''
                })).filter(s => s.email);
            }
        } catch(e) {
            // Fallback dùng _employees nếu có personal_email
            suggestionList = _employees
                .filter(e => e.personal_email)
                .map(e => ({ email: e.personal_email, name: e.full_name || '' }));
        }

        console.log('[EmailTags] suggestions loaded:', suggestionList.length, suggestionList.slice(0,3));

        // Tạo dropdown gợi ý — dùng fixed để thoát khỏi overflow:hidden của modal
        const dropdown = document.createElement('div');
        dropdown.className = 'email-suggestion-dropdown';
        dropdown.style.cssText = `
            position: fixed;
            background: white; border: 1px solid #e2e8f0;
            border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            max-height: 220px; overflow-y: auto; z-index: 99999;
            display: none; min-width: 320px;
        `;
        document.body.appendChild(dropdown);

        // Cập nhật vị trí dropdown theo input
        function positionDropdown() {
            const rect = emailInput.getBoundingClientRect();
            dropdown.style.top  = (rect.bottom + 4) + 'px';
            dropdown.style.left = rect.left + 'px';
            dropdown.style.width = emailContainer.getBoundingClientRect().width + 'px';
        }

        function addEmailTag(email) {
            email = email.trim();
            if (!email || !email.includes('@')) return;
            const existing = [...emailContainer.querySelectorAll('.email-tag')]
                .map(t => t.dataset.email);
            if (existing.includes(email)) { emailInput.value = ''; return; }

            const tag = document.createElement('span');
            tag.className = 'email-tag';
            tag.dataset.email = email;
            tag.innerHTML = `${UI.escape(email)} <i class="fa-solid fa-xmark"></i>`;
            tag.querySelector('i').addEventListener('click', () => tag.remove());
            emailContainer.insertBefore(tag, emailInput);
            emailInput.value = '';
            hideDropdown();
        }

        function showSuggestions(query) {
            const q = query.toLowerCase().trim();

            // Lọc theo query, nếu rỗng thì hiện tất cả
            const already = [...emailContainer.querySelectorAll('.email-tag')].map(t => t.dataset.email);
            const matches = suggestionList
                .filter(s => !already.includes(s.email)) // ẩn email đã thêm rồi
                .filter(s => !q || s.email.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
                .slice(0, 10);

            if (!matches.length) { hideDropdown(); return; }

            dropdown.innerHTML = matches.map(s => `
                <div class="email-suggestion-item" data-email="${UI.escape(s.email)}"
                    style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                           cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9;">
                    <div style="width:32px;height:32px;border-radius:50%;background:#BC0004;
                                color:white;display:flex;align-items:center;justify-content:center;
                                font-size:12px;font-weight:700;flex-shrink:0;">
                        ${UI.escape((s.name || s.email).charAt(0).toUpperCase())}
                    </div>
                    <div style="min-width:0;">
                        <div style="font-weight:600;color:#111827;font-size:13px;">${UI.escape(s.name)}</div>
                        <div style="font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escape(s.email)}</div>
                    </div>
                </div>
            `).join('');

            dropdown.querySelectorAll('.email-suggestion-item').forEach(item => {
                item.addEventListener('mouseenter', () => item.style.background = '#f0f7ff');
                item.addEventListener('mouseleave', () => item.style.background = '');
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    addEmailTag(item.dataset.email);
                });
            });

            dropdown.style.display = 'block';
            positionDropdown();
        }

        function hideDropdown() {
            dropdown.style.display = 'none';
        }

        emailInput.addEventListener('input', () => showSuggestions(emailInput.value));
        emailInput.addEventListener('focus', () => showSuggestions(emailInput.value || ''));
        emailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addEmailTag(emailInput.value);
            }
            if (e.key === 'Escape') hideDropdown();
        });
        emailInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (emailInput.value.trim()) addEmailTag(emailInput.value);
                hideDropdown();
            }, 150);
        });
        emailContainer.addEventListener('click', (e) => {
            if (!e.target.closest('.email-tag')) emailInput.focus();
        });

        // Cleanup dropdown khi modal đóng
        document.getElementById('closeReportModal')?.addEventListener('click', () => dropdown.remove(), { once: true });
        document.getElementById('cancelReportBtn')?.addEventListener('click', () => dropdown.remove(), { once: true });
    }

    document.querySelector('.btn-report-auto')?.addEventListener('click', () => {
        // Reset để initEmailTags chạy lại mỗi lần mở modal
        const container = document.getElementById('emailTagContainer');
        if (container) container._initialized = false;
        setTimeout(() => initEmailTags(), 50);
    });

    // ── INIT ──────────────────────────────────────────────────────────────────
    try {
        await loadAllData();
    } catch (err) {
        console.error('[Dashboard] Lỗi tải dữ liệu:', err);
        showToast('Lỗi', 'Không thể tải dữ liệu từ server. Vui lòng thử lại.', 'error');
    }

    switchChartView();
    refreshAll();
});
