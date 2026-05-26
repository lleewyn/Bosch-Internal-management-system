/**
 * Dashboard — dữ liệu động từ MockStore
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.MockStore) return;

    const db = MockStore.get();
    let period = db.settings.period || 'Tháng';
    let distMode = db.settings.distributionMode || 'service';
    let hrPill = 'position';
    let projectModalPage = 1;
    let hrModalPage = 1;
    const PAGE_SIZE = 4;

    const revenueView = document.getElementById('revenueView');
    const hrView = document.getElementById('hrView');
    const projectsView = document.getElementById('projectsView');

    // --- Modals ---
    const modals = {
        report: document.getElementById('reportModal'),
        export: document.getElementById('exportModal'),
        hrSel: document.getElementById('hrSelectionModal'),
        projectList: document.getElementById('projectListModal'),
        revenueDetail: document.getElementById('revenueDetailModal')
    };
    const openMdl = (m) => UI.openModal(m);
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

    [['closeReportModal', 'cancelReportBtn', modals.report],
     ['closeExportModal', 'cancelExportBtn', modals.export],
     ['closeHRModal', 'backHRModal', modals.hrSel],
     ['closeProjectModal', 'backProjectModal', modals.projectList],
     ['closeRevenueModal', 'backRevenueModal', modals.revenueDetail]].forEach(([a, b, m]) => {
        document.getElementById(a)?.addEventListener('click', () => closeMdl(m));
        document.getElementById(b)?.addEventListener('click', () => closeMdl(m));
    });

    document.querySelector('.btn-save-settings')?.addEventListener('click', () => {
        if (validateForm(modals.report)) {
            showToast('Thành công', 'Đã lưu thiết lập báo cáo tự động.');
            MockStore.logActivity('Báo cáo', 'Cấu hình báo cáo tự động');
            closeMdl(modals.report);
        }
    });
    document.querySelector('.btn-confirm-export')?.addEventListener('click', () => {
        if (validateForm(modals.export)) {
            const fmt = modals.export.querySelector('.format-card.active')?.textContent?.includes('Excel') ? 'Excel' : 'PDF';
            showToast('Thành công', `Đang xuất báo cáo định dạng ${fmt}...`);
            MockStore.logActivity('Báo cáo', `Xuất báo cáo ${fmt}`);
            closeMdl(modals.export);
        }
    });

    modals.projectList?.querySelector('.btn-save-red')?.addEventListener('click', () => {
        showToast('Thành công', 'Đã lưu danh sách dự án trọng điểm.');
        closeMdl(modals.projectList);
    });
    modals.hrSel?.querySelector('.btn-save-red')?.addEventListener('click', () => {
        showToast('Thành công', 'Đã lưu bộ lọc nhân sự cho heatmap.');
        closeMdl(modals.hrSel);
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

    // Tabs
    document.querySelectorAll('.bosch-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bosch-tab').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            revenueView.style.display = tab === 'revenue' ? 'block' : 'none';
            hrView.style.display = tab === 'hr' ? 'block' : 'none';
            projectsView.style.display = tab === 'projects' ? 'block' : 'none';
            
            const dateFilters = document.querySelector('.date-filters');
            if (dateFilters) {
                dateFilters.style.display = tab === 'revenue' ? 'flex' : 'none';
            }

            if (tab === 'hr') renderHeatmap();
            if (tab === 'projects') renderProjectsTab();
        });
    });

    // Period
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
            MockStore.updateSettings({ period });
            switchChartView();
            renderRevenueChart();
            refreshStats();
        });
    });

    // Distribution toggle
    document.querySelectorAll('.toggle-btn-modern').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn-modern').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            distMode = btn.textContent.includes('Dự án') ? 'project' : 'service';
            MockStore.updateSettings({ distributionMode: distMode });
            renderDistribution();
        });
    });

    // HR pills
    const pillMap = { 'Vị trí': 'position', 'Mảng dịch vụ': 'service', 'Dự án': 'project' };
    document.querySelectorAll('.pill').forEach((pill) => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
            pill.classList.add('active');
            hrPill = pillMap[pill.textContent.trim()] || 'position';
            renderHrBars();
        });
    });

    // Delivery week/month
    document.querySelectorAll('.toggle-btn-sm').forEach((btn, i, arr) => {
        btn.addEventListener('click', () => {
            arr.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            renderDeliveryChart(btn.textContent.includes('tuần') ? 'week' : 'month');
        });
    });

    // Date picker
    const datePicker = document.getElementById('dashboardDatePicker');
    const dateMenu = document.getElementById('dateDropdownMenu');
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
        const end = document.getElementById('endDateInput')?.value;
        if (!start || !end) return;
        const fmt = (s) => s.split('-').reverse().join('/');
        const rangeText = `${fmt(start)} - ${fmt(end)}`;
        document.getElementById('datePickerText').textContent = rangeText;
        dateMenu.style.display = 'none';
        MockStore.updateSettings({ dateRange: { start, end } });
        refreshAll();
        showToast('Đã cập nhật', `Dữ liệu cho khoảng ${rangeText}`);
    };

    function refreshStats() {
        const m = MockStore.getDashboardMetrics();
        const cards = document.querySelectorAll('#revenueView .stats-grid .bosch-stat-card');
        if (cards[0]) {
            cards[0].querySelector('.bosch-stat-value').innerHTML =
                `${UI.formatVnd(m.totalRevenue)} <span class="currency">VND</span>`;
            const trend = cards[0].querySelector('.bosch-stat-trend');
            if (trend) trend.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${m.revenueTrendPct}%`;
        }
        if (cards[1]) cards[1].querySelector('.bosch-stat-value').textContent = String(m.activeProjects);
        if (cards[2]) cards[2].querySelector('.bosch-stat-value').textContent = `${m.performance}%`;

        const hrCards = document.querySelectorAll('#hrView .stats-grid .bosch-stat-card');
        const staff = MockStore.getStaff();
        if (hrCards[0]) hrCards[0].querySelector('.bosch-stat-value').textContent = UI.formatNumber(staff.length);
        if (hrCards[1]) {
            const trained = MockStore.getRoadmap().filter((r) => r.status === 'Hoàn thành').length;
            const pct = Math.round((trained / Math.max(MockStore.getRoadmap().length, 1)) * 100);
            hrCards[1].querySelector('.bosch-stat-value').textContent = pct + '%';
        }
        if (hrCards[2]) {
            const unassigned = staff.filter((s) => s.workload < 30).length;
            hrCards[2].querySelector('.bosch-stat-value').textContent =
                Math.round((unassigned / Math.max(staff.length, 1)) * 100) + '%';
        }

        const prjCards = document.querySelectorAll('#projectsView .stats-grid .bosch-stat-card');
        const projects = MockStore.getProjects();
        const done = projects.filter((p) => p.progress >= 100).length;
        const late = projects.filter((p) => p.progress < 50 && p.status !== 'Hoàn thành').length;
        if (prjCards[0]) prjCards[0].querySelector('.bosch-stat-value').textContent = String(projects.length);
        if (prjCards[1]) prjCards[1].querySelector('.bosch-stat-value').textContent =
            Math.round((done / Math.max(projects.length, 1)) * 100) + '%';
        if (prjCards[2]) prjCards[2].querySelector('.bosch-stat-value').textContent =
            String(late).padStart(2, '0');
        if (prjCards[3]) prjCards[3].querySelector('.bosch-stat-value').textContent = '92%';
    }

    function renderRevenueChart() {
        const data = MockStore.get().dashboard.revenueTrend[period] || [];
        const max = Math.max(...data, 1);

        // ── Line chart (Tháng) ───────────────────────────────────────────────
        if (period === 'Tháng') {
            const w = 600, h = 260;
            const pts = data.map((v, i) => {
                const x = (i / Math.max(data.length - 1, 1)) * w;
                const y = h - (v / max) * (h - 40);
                return [x, y];
            });
            const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
            const area = line + ` L${w},300 L0,300 Z`;
            const svg = monthlyChart?.querySelector('svg');
            if (svg) {
                const paths = svg.querySelectorAll('path');
                if (paths[0]) paths[0].setAttribute('d', area);
                if (paths[1]) paths[1].setAttribute('d', line);
            }
            const axis = monthlyChart?.querySelector('.chart-x-axis');
            if (axis) {
                axis.innerHTML = data.map((_, i) => `<span>T${i + 1}</span>`).join('');
            }
        }

        // ── Bar chart (Quý) ──────────────────────────────────────────────────
        if (period === 'Quý' && quarterlyChart) {
            const quarters = MockStore.get().dashboard.revenueTrend.Quý;
            const qmax = Math.max(...quarters);
            const labels = ['Q1', 'Q2', 'Q3', 'Q4'];

            const barsContainer = document.getElementById('quarterlyBarsContainer');
            const xAxis = document.getElementById('quarterlyXAxis');

            if (barsContainer) {
                barsContainer.innerHTML = quarters.map((v, i) => {
                    const pct = Math.round((v / qmax) * 100);
                    return `<div class="year-bar" style="height:${pct}%;">
                        <div class="year-bar-top"></div>
                    </div>`;
                }).join('');
            }
            if (xAxis) {
                xAxis.innerHTML = labels.map(l => `<span>${l}</span>`).join('');
            }
        }

        // ── Bar chart (Năm) ──────────────────────────────────────────────────
        if (period === 'Năm' && yearlyChart) {
            const years = MockStore.get().dashboard.revenueTrend.Năm;
            const ymax = Math.max(...years);
            const startYear = 2020;

            const barsContainer = document.getElementById('yearlyBarsContainer');
            const xAxis = document.getElementById('yearlyXAxis');

            if (barsContainer) {
                barsContainer.innerHTML = years.map((v, i) => {
                    const pct = Math.round((v / ymax) * 100);
                    const yr = startYear + i;
                    return `<div class="year-bar" style="height:${pct}%;" data-year="${yr}">
                        <div class="year-bar-top"></div>
                    </div>`;
                }).join('');
            }
            if (xAxis) {
                xAxis.innerHTML = years.map((_, i) => `<span>${startYear + i}</span>`).join('');
            }
        }
    }

    function renderDistribution() {
        const list = document.querySelector('.distribution-list');
        if (!list) return;
        const items = distMode === 'project'
            ? MockStore.get().dashboard.revenueByProject
            : MockStore.get().dashboard.revenueByService;
        const max = Math.max(...items.map((i) => i.value));
        const colors = ['#00153D', '#0056D2', '#2563EB', '#7FBBE3'];
        list.innerHTML = items
            .map(
                (item, i) => `
            <div class="dist-item">
                <div class="dist-info">
                    <span class="dist-name">${UI.escape(item.name)}</span>
                    <span class="dist-val">${UI.formatVnd(item.value)} VND</span>
                </div>
                <div class="progress-bar-modern">
                    <div class="progress-fill-modern" style="width:${Math.round((item.value / max) * 100)}%;background:${colors[i % colors.length]};"></div>
                </div>
            </div>`
            )
            .join('');
    }

    function renderHeatmap() {
        const grid = document.getElementById('heatmapTable');
        if (!grid) return;
        const hm = MockStore.get().dashboard.heatmap;
        const { employees, months, data } = hm;
        let thead = '<thead><tr><th></th>';
        months.forEach((m) => (thead += `<th>${m}</th>`));
        thead += '</tr></thead>';
        let tbody = '<tbody>';
        employees.forEach((emp, i) => {
            tbody += `<tr><td class="heatmap-emp-name">${UI.escape(emp)}</td>`;
            data[i].forEach((val) => {
                let cls = 'level-0';
                if (val > 0 && val < 50) cls = 'level-1';
                else if (val < 75) cls = 'level-2';
                else if (val < 100) cls = 'level-3';
                else if (val <= 120) cls = 'level-4';
                else cls = 'level-5';
                tbody += `<td class="heatmap-cell-table ${cls}">${val || ''}</td>`;
            });
            tbody += '</tr>';
        });
        tbody += '</tbody>';
        grid.innerHTML = thead + tbody;
    }

    function renderHrBars() {
        const vals = MockStore.get().dashboard.hrBarData[hrPill] || [];
        document.querySelectorAll('.hr-bar-fill').forEach((bar, i) => {
            const v = vals[i] || 50;
            bar.style.height = v + '%';
            const valEl = bar.querySelector('.bar-val');
            if (valEl) valEl.textContent = Math.floor(v * 4.5);
        });
    }

    function renderDeliveryChart(mode) {
        const bars = document.querySelectorAll('.delivery-chart .delivery-bar');
        const series = mode === 'week' ? [40, 55, 70, 65, 80, 90, 75] : [60, 72, 68, 85, 78, 92, 88];
        bars.forEach((bar, i) => {
            const h = series[i % series.length];
            bar.style.height = h + '%';
        });
    }

    function renderProjectsTab() {
        const tbody = document.querySelector('#projectsView .table-container-projects tbody');
        if (!tbody) return;
        const projects = MockStore.getProjects().slice(0, 5);
        tbody.innerHTML = projects
            .map((p) => {
                const late = p.progress < 50;
                return `
            <tr data-id="${p.id}">
                <td class="bold">${UI.escape(p.id)}</td>
                <td>${UI.escape(p.name)}</td>
                <td><div class="assignee"><div class="avatar-circle">${UI.escape(p.leader.charAt(0))}</div><span>${UI.escape(p.leader)}</span></div></td>
                <td><div class="progress-cell"><div class="progress-dot ${late ? 'red' : ''}"></div><span>${p.progress}%</span></div></td>
                <td>${UI.badge(p.status)}</td>
                <td><i class="fa-solid fa-pen action-icon" data-edit="${p.id}"></i></td>
            </tr>`;
            })
            .join('');
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

    function renderProjectModal() {
        const tbody = modals.projectList?.querySelector('tbody');
        if (!tbody) return;
        const all = MockStore.getProjects();
        const totalPages = Math.ceil(all.length / PAGE_SIZE) || 1;
        const page = Math.min(projectModalPage, totalPages);
        const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        tbody.innerHTML = slice
            .map(
                (p) => `
            <tr>
                <td class="id-cell">${UI.escape(p.id)}</td>
                <td class="bold">${UI.escape(p.name)}</td>
                <td><div class="manager-cell"><span>${UI.escape(p.leader)}</span></div></td>
                <td><div class="progress-col"><span class="progress-val blue">${p.progress}%</span>
                    <div class="mini-progress-bar"><div class="mini-progress-fill blue" style="width:${p.progress}%;"></div></div></div></td>
                <td style="text-align:center;">${UI.badge(p.status)}</td>
            </tr>`
            )
            .join('');
        const pag = modals.projectList?.querySelector('.pagination-controls span');
        if (pag) pag.textContent = `Trang ${page} / ${totalPages}`;
        const ctrls = modals.projectList?.querySelectorAll('.pagination-controls i');
        ctrls?.[0]?.replaceWith(ctrls[0].cloneNode(true));
        ctrls?.[1]?.replaceWith(ctrls[1].cloneNode(true));
        const [prev, next] = modals.projectList.querySelectorAll('.pagination-controls i');
        prev?.addEventListener('click', () => {
            if (projectModalPage > 1) {
                projectModalPage--;
                renderProjectModal();
            }
        });
        next?.addEventListener('click', () => {
            if (projectModalPage < totalPages) {
                projectModalPage++;
                renderProjectModal();
            }
        });
    }

    function renderHrModal() {
        const tbody = modals.hrSel?.querySelector('tbody');
        if (!tbody) return;
        const all = MockStore.getStaff();
        const totalPages = Math.ceil(all.length / PAGE_SIZE) || 1;
        const page = Math.min(hrModalPage, totalPages);

        function workloadBadge(w) {
            if (w >= 90) return { cls: 'badge-danger',  text: 'QUÁ TẢI',  color: '#ef4444' };
            if (w >= 75) return { cls: 'badge-warning', text: 'CAO',      color: '#f59e0b' };
            if (w >= 50) return { cls: 'badge-success', text: 'ỔN ĐỊNH',  color: '#22c55e' };
            return             { cls: 'badge-info',     text: 'RẢNH RỖI', color: '#3b82f6' };
        }

        function progressColor(w) {
            if (w >= 90) return '#ef4444';
            if (w >= 75) return '#f59e0b';
            return '#22c55e';
        }

        tbody.innerHTML = all
            .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            .map((s) => {
                const b = workloadBadge(s.workload);
                const barColor = progressColor(s.workload);
                const rowBg = s.workload >= 90 ? 'background:#fff5f5;' : '';
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
            })
            .join('');

        const pag = modals.hrSel?.querySelector('.pagination-controls span');
        if (pag) pag.textContent = `Trang ${page} / ${totalPages}`;
    }

    function renderRevenueDetailModal() {
        const thead = document.getElementById('revenueDetailThead');
        const tbody = document.getElementById('revenueDetailTbody');
        const title = document.getElementById('revenueDetailTitle');
        if (!thead || !tbody) return;

        // ── Mock data chi tiết doanh thu ─────────────────────────────────────
        const DETAIL_DATA = {
            Tháng: {
                label: 'tháng 2025',
                cols: ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'],
                rows: [
                    { name: 'Precision Sensor Module - V2', vals: [180,195,210,220,185,200,215,230,210,195,205,255], status: 'Đang triển khai' },
                    { name: 'Cloud Infra Platform',         vals: [75, 80, 85, 90, 95, 100,105,110,95, 85, 90, 90 ], status: 'Đang triển khai' },
                    { name: 'Smart Factory IoT',            vals: [60, 65, 70, 68, 72, 75, 80, 78, 70, 65, 68, 69 ], status: 'Đang triển khai' },
                    { name: 'Gas Monitoring System',        vals: [90, 92, 95, 98, 100,102,105,108,100,95, 98, 117], status: 'Hoàn thành'      },
                    { name: 'ERP Migration Wave 2',         vals: [45, 48, 50, 52, 55, 58, 60, 62, 55, 50, 52, 63 ], status: 'Đang triển khai' },
                    { name: 'Dairy Farm IoT Sensors',       vals: [65, 68, 70, 72, 75, 78, 80, 82, 75, 70, 72, 83 ], status: 'Đang triển khai' },
                    { name: 'Automotive ECU Testing',       vals: [110,115,120,125,130,135,140,145,130,120,125,105], status: 'Đang triển khai' },
                ]
            },
            Quý: {
                label: 'quý 2025',
                cols: ['Q1','Q2','Q3','Q4'],
                rows: [
                    { name: 'Precision Sensor Module - V2', vals: [585, 605, 655, 655], status: 'Đang triển khai' },
                    { name: 'Cloud Infra Platform',         vals: [240, 285, 310, 265], status: 'Đang triển khai' },
                    { name: 'Smart Factory IoT',            vals: [195, 215, 228, 212], status: 'Đang triển khai' },
                    { name: 'Gas Monitoring System',        vals: [277, 300, 313, 310], status: 'Hoàn thành'      },
                    { name: 'ERP Migration Wave 2',         vals: [143, 165, 177, 175], status: 'Đang triển khai' },
                    { name: 'Dairy Farm IoT Sensors',       vals: [203, 225, 237, 235], status: 'Đang triển khai' },
                    { name: 'Automotive ECU Testing',       vals: [345, 390, 415, 250], status: 'Đang triển khai' },
                ]
            },
            Năm: {
                label: 'các năm',
                cols: ['2020','2021','2022','2023','2024','2025'],
                rows: [
                    { name: 'Precision Sensor Module - V2', vals: [1200, 1450, 1680, 1850, 2000, 2500], status: 'Đang triển khai' },
                    { name: 'Cloud Infra Platform',         vals: [500,  620,  750,  880,  950,  1100], status: 'Đang triển khai' },
                    { name: 'Smart Factory IoT',            vals: [300,  380,  450,  580,  700,  850 ], status: 'Đang triển khai' },
                    { name: 'Gas Monitoring System',        vals: [800,  900,  980,  1050, 1100, 1200], status: 'Hoàn thành'      },
                    { name: 'ERP Migration Wave 2',         vals: [200,  280,  350,  420,  520,  660 ], status: 'Đang triển khai' },
                    { name: 'Dairy Farm IoT Sensors',       vals: [350,  420,  510,  620,  750,  900 ], status: 'Đang triển khai' },
                    { name: 'Automotive ECU Testing',       vals: [900,  1100, 1300, 1500, 1700, 1400], status: 'Đang triển khai' },
                ]
            }
        };

        const config = DETAIL_DATA[period] || DETAIL_DATA['Tháng'];

        // Cập nhật tiêu đề
        if (title) title.textContent = `Chi tiết doanh thu theo dự án - ${config.label}`;

        // Cập nhật thead
        thead.innerHTML = `<tr>
            <th>TÊN DỰ ÁN</th>
            ${config.cols.map(c => `<th>${c}</th>`).join('')}
            <th style="color:#dc2626;">TỔNG CỘNG</th>
            <th>TRẠNG THÁI</th>
        </tr>`;

        // Helper format số
        function fmtM(val) {
            if (val >= 1000) return (val / 1000).toFixed(2).replace(/\.?0+$/, '') + 'B';
            return val + 'M';
        }

        // Render tbody
        tbody.innerHTML = config.rows.map(row => {
            const total = row.vals.reduce((a, b) => a + b, 0);
            const badgeCls = row.status === 'Hoàn thành' ? 'badge-success'
                           : row.status === 'Tạm hoãn'   ? 'badge-warning'
                           : 'badge-info';
            return `<tr>
                <td class="name-col">${UI.escape(row.name)}</td>
                ${row.vals.map(v => `<td>${fmtM(v)}</td>`).join('')}
                <td style="font-weight:700;color:#dc2626;">${fmtM(total)}</td>
                <td><span class="badge ${badgeCls}">${UI.escape(row.status)}</span></td>
            </tr>`;
        }).join('');
    }

    function refreshAll() {
        refreshStats();
        renderRevenueChart();
        renderDistribution();
        renderHeatmap();
        renderHrBars();
        renderProjectsTab();
        renderDeliveryChart('month');
    }

    refreshAll();

    // ── Email tag input cho modal báo cáo ────────────────────────────────────
    function initEmailTags() {
        const emailContainer = document.getElementById('emailTagContainer');
        const emailInput     = document.getElementById('emailTagInput');
        if (!emailContainer || !emailInput || emailContainer._initialized) return;
        emailContainer._initialized = true;

        function addEmailTag(email) {
            email = email.trim();
            if (!email || !email.includes('@')) return;
            const tag = document.createElement('span');
            tag.className = 'email-tag';
            tag.innerHTML = `${UI.escape(email)} <i class="fa-solid fa-xmark"></i>`;
            tag.querySelector('i').addEventListener('click', () => tag.remove());
            emailContainer.insertBefore(tag, emailInput);
            emailInput.value = '';
        }

        // Xóa các tag mặc định đã có sẵn khi click X
        emailContainer.querySelectorAll('.email-tag i').forEach(icon => {
            icon.addEventListener('click', () => icon.closest('.email-tag').remove());
        });

        emailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addEmailTag(emailInput.value);
            }
        });

        // Mất focus thì cũng tạo tag
        emailInput.addEventListener('blur', () => {
            if (emailInput.value.trim()) addEmailTag(emailInput.value);
        });

        emailContainer.addEventListener('click', () => emailInput.focus());
    }

    // Bind khi mở modal
    document.querySelector('.btn-report-auto')?.addEventListener('click', () => {
        setTimeout(initEmailTags, 50);
    });
});
