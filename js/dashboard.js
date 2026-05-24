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
            if (tab === 'hr') renderHeatmap();
            if (tab === 'projects') renderProjectsTab();
        });
    });

    // Period
    const monthlyChart = document.getElementById('revenueChartMonthly');
    const yearlyChart = document.getElementById('revenueChartYearly');
    document.querySelectorAll('.period-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            period = btn.textContent.trim();
            MockStore.updateSettings({ period });
            if (period === 'Năm') {
                monthlyChart.style.display = 'none';
                yearlyChart.style.display = 'flex';
            } else {
                monthlyChart.style.display = 'block';
                yearlyChart.style.display = 'none';
            }
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
    const pillMap = { 'Vị trí': 'position', 'Mảng dịch vụ': 'service', 'Kỹ năng': 'skill', 'Dự án': 'project' };
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
        if (cards[1]) cards[1].querySelector('.bosch-stat-value').textContent = `+${m.growth}%`;
        if (cards[2]) cards[2].querySelector('.bosch-stat-value').textContent = String(m.activeProjects);
        if (cards[3]) cards[3].querySelector('.bosch-stat-value').textContent = `${m.performance}%`;

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
        const w = 600;
        const h = 260;
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
            const labels = period === 'Quý' ? ['Q1', 'Q2', 'Q3', 'Q4'] : period === 'Năm' ? ['2020', '2021', '2022', '2023', '2024', '2025'] : data.map((_, i) => 'T' + (i + 1));
            axis.innerHTML = labels.map((l) => `<span>${l}</span>`).join('');
        }
        if (period === 'Năm' && yearlyChart) {
            const years = MockStore.get().dashboard.revenueTrend.Năm;
            const ymax = Math.max(...years);
            yearlyChart.querySelectorAll('.year-bar').forEach((bar, i) => {
                const pct = Math.round((years[i] / ymax) * 100);
                bar.style.height = pct + '%';
            });
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
                <td><span class="status-badge ${late ? 'warning' : 'active'}">${UI.escape(p.status)}</span></td>
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
            window.location.href = 'operations.html';
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
                <td><span class="status-pill green">${UI.escape(p.status)}</span></td>
                <td><span class="priority-text ${p.progress < 50 ? 'red' : 'gray'}">${p.progress < 50 ? 'Cao' : 'Trung bình'}</span></td>
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
        tbody.innerHTML = all
            .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            .map(
                (s) => `
            <tr><td>${UI.escape(s.id)}</td><td>${UI.escape(s.name)}</td><td>${UI.escape(s.title)}</td>
            <td>${UI.escape(s.team)}</td><td>${s.workload}%</td></tr>`
            )
            .join('');
        const pag = modals.hrSel?.querySelector('.pagination-controls span');
        if (pag) pag.textContent = `Trang ${page} / ${totalPages}`;
    }

    function renderRevenueDetailModal() {
        const tbody = modals.revenueDetail?.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = MockStore.getProjects()
            .map(
                (p) => `
            <tr><td>${UI.escape(p.id)}</td><td>${UI.escape(p.name)}</td>
            <td>${UI.formatVnd(p.revenue)}</td><td>${p.progress}%</td></tr>`
            )
            .join('');
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
});
