/**
 * Kho dữ liệu giả lập — lưu localStorage, đồng bộ giữa các trang.
 */
(function () {
    const STORAGE_KEY = 'bosch_mock_db_v3';

    const SEED = {
        settings: {
            dateRange: { start: '2025-01-01', end: '2025-12-31' },
            period: 'Tháng',
            distributionMode: 'service'
        },
        dashboard: {
            revenueTrend: { Tháng: [720, 780, 810, 850, 890, 920, 980], Quý: [2280, 2450, 2680, 2890], Năm: [3200, 3800, 4100, 4500, 4800, 5200] },
            revenueByService: [
                { name: 'Engineering Services', value: 1200000000 },
                { name: 'Business Services', value: 1900000000 },
                { name: 'Digital & IT Solutions', value: 900000000 },
                { name: 'Consulting & Project', value: 1100000000 }
            ],
            revenueByProject: [
                { name: 'Industrial AI Core', value: 1800000000 },
                { name: 'Smart Logistics', value: 1200000000 },
                { name: 'Edge Computing Node', value: 980000000 },
                { name: 'Automated Testing', value: 800000000 }
            ],
            hrBarData: {
                position: [85, 72, 65, 58, 45],
                service: [90, 78, 70, 62, 50],
                skill: [88, 75, 68, 55, 42],
                project: [92, 80, 74, 60, 48]
            },
            heatmap: {}
        },
        staff: [
            { id: 'BS2041', name: 'Nguyễn Văn An', title: 'Lead Engineer', team: 'Team X-Engine', group: 'A', project: 'Precision Sensor Module - V2', workload: 65, manager: 'Jackson Nguyen' },
            { id: 'BS2088', name: 'Trần Thị Bình', title: 'Senior Developer', team: 'Team UI', group: 'A', project: 'Cloud Infra Platform', workload: 82, manager: 'Jackson Nguyen' },
            { id: 'BS2110', name: 'Lê Hoàng Cường', title: 'QA Engineer', team: 'Team X-Engine', group: 'B', project: 'Precision Sensor Module - V2', workload: 55, manager: 'Maria Schmidt' },
            { id: 'BS2156', name: 'Phạm Minh Đức', title: 'DevOps Engineer', team: 'Team Cloud', group: 'B', project: 'Multi-project (3)', workload: 95, manager: 'Maria Schmidt' },
            { id: 'BS2201', name: 'Hoàng Thị Em', title: 'Business Analyst', team: 'Team BA', group: 'C', project: 'ERP Migration', workload: 70, manager: 'David Chen' },
            { id: 'BS2245', name: 'Vũ Quốc Phong', title: 'Junior Developer', team: 'Team UI', group: 'C', project: 'Mobile App V3', workload: 40, manager: 'David Chen' },
            { id: 'BS2290', name: 'Đặng Lan Hương', title: 'Scrum Master', team: 'Team PM', group: 'D', project: 'Smart Factory IoT', workload: 60, manager: 'Frank Miller' },
            { id: 'BS2333', name: 'Bùi Thanh Tùng', title: 'Architect', team: 'Team X-Engine', group: 'A', project: 'Automotive ECU', workload: 78, manager: 'Jackson Nguyen' }
        ],
        roadmap: [
            { id: 'BS2041', name: 'Nguyễn Văn An', title: 'Lead Engineer', level: 'L5', course: 'Agile Leadership', status: 'Đang học' },
            { id: 'BS2088', name: 'Trần Thị Bình', title: 'Senior Developer', level: 'L4', course: 'Cloud Architecture', status: 'Hoàn thành' },
            { id: 'BS2156', name: 'Phạm Minh Đức', title: 'DevOps Engineer', level: 'L3', course: 'Kubernetes Pro', status: 'Đang học' },
            { id: 'BS2245', name: 'Vũ Quốc Phong', title: 'Junior Developer', level: 'L2', course: 'React Advanced', status: 'Chưa bắt đầu' }
        ],
        assignments: [
            { staffId: 'BS2041', project: 'Precision Sensor Module - V2', percent: 65, from: '2025-01', to: '2025-12' },
            { staffId: 'BS2041', project: 'Automotive ECU', percent: 20, from: '2025-06', to: '2025-09' }
        ],
        customers: [
            { id: 'KH-008', company: 'Petrovietnam Gas Node', contact: 'Mr. Le Hoang Thanh', email: 'hoangthanh.le@pvgas.com.vn', phone: '02543834123', country: 'Việt Nam', status: 'ĐÃ DEAL HỢP ĐỒNG' },
            { id: 'KH-005', company: 'FPT Software Alliance', contact: 'Mr. Nguyen Quoc Hoa', email: 'quochoa.nguyen@fpt.com', phone: '02437689000', country: 'Việt Nam', status: 'ĐÃ DEAL HỢP ĐỒNG' },
            { id: 'KH-007', company: 'Masan Consumer Core', contact: 'Mr. Tran Truong Tuan', email: 'truongtuan.tran@masan.vn', phone: '02838275678', country: 'Việt Nam', status: 'ĐÃ CÓ DỰ ÁN' },
            { id: 'KH-006', company: 'TH Milk Food Joint Stock', contact: 'Mrs. Cao Minh Huong', email: 'minhhuong.cao@thmilk.vn', phone: '02383861234', country: 'Việt Nam', status: 'ĐÃ CÓ DỰ ÁN' },
            { id: 'KH-003', company: 'Samsung Electronics HCMC', contact: 'Mr. Park Ji-Sung', email: 'jisung.park@samsung.com', phone: '02839151111', country: 'Hàn Quốc', status: 'ĐÃ CÓ DỰ ÁN' },
            { id: 'KH-002', company: 'Viettel Network Corporation', contact: 'Ms. Nguyen Thi Mai', email: 'mai.nguyen@viettel.com.vn', phone: '02462989898', country: 'Việt Nam', status: 'TIỀM NĂNG' },
            { id: 'KH-001', company: 'Bosch Global Partner', contact: 'Mr. Hans Mueller', email: 'hans.mueller@bosch.com', phone: '+4912345678', country: 'Đức', status: 'ĐANG ĐÀM PHÁN' }
        ],
        contracts: [
            { id: 'HD-2025-01', customerId: 'KH-003', company: 'Samsung Electronics HCMC', contact: 'Mr. Park Ji-Sung', email: 'jisung.park@samsung.com', phone: '02839151111', serviceLine: 'Automotive Embedded', value: 4500000000, start: '2025-01-15', end: '2025-12-31', project: 'Precision Sensor V2', ot: true, signed: true, status: 'Đang hiệu lực' },
            { id: 'HD-2025-02', customerId: 'KH-005', company: 'FPT Software Alliance', contact: 'Mr. Nguyen Quoc Hoa', email: 'quochoa.nguyen@fpt.com', phone: '02437689000', serviceLine: 'Digital & IT', value: 2800000000, start: '2025-03-01', end: '2026-02-28', project: 'Cloud Infra', ot: false, signed: true, status: 'Đang hiệu lực' },
            { id: 'HD-2024-08', customerId: 'KH-008', company: 'Petrovietnam Gas Node', contact: 'Mr. Le Hoang Thanh', email: 'hoangthanh.le@pvgas.com.vn', phone: '02543834123', serviceLine: 'Consulting', value: 1200000000, start: '2024-06-01', end: '2025-05-31', project: 'Gas Monitoring', ot: false, signed: true, status: 'Sắp hết hạn' },
            { id: 'HD-2025-03', customerId: 'KH-002', company: 'Viettel Network Corporation', contact: 'Ms. Nguyen Thi Mai', email: 'mai.nguyen@viettel.com.vn', phone: '02462989898', serviceLine: 'Digital & IT', value: 3200000000, start: '2025-04-01', end: '2026-03-31', project: 'ERP Migration Wave 2', ot: true, signed: true, status: 'Đang hiệu lực' },
            { id: 'HD-2024-06', customerId: 'KH-006', company: 'TH Milk Food Joint Stock', contact: 'Mrs. Cao Minh Huong', email: 'minhhuong.cao@thmilk.vn', phone: '02383861234', serviceLine: 'IoT Solutions', value: 2200000000, start: '2024-11-01', end: '2025-10-31', project: 'Dairy Farm IoT', ot: false, signed: true, status: 'Đang hiệu lực' },
            { id: 'HD-2025-04', customerId: 'KH-001', company: 'Bosch Global Partner', contact: 'Mr. Hans Mueller', email: 'hans.mueller@bosch.com', phone: '+4912345678', serviceLine: 'Automotive Embedded', value: 5000000000, start: '2025-01-01', end: '2026-06-30', project: 'Automotive ECU Testing', ot: true, signed: true, status: 'Đang hiệu lực' },
            { id: 'HD-2025-05', customerId: 'KH-007', company: 'Masan Consumer Core', contact: 'Mr. Tran Truong Tuan', email: 'truongtuan.tran@masan.vn', phone: '02838275678', serviceLine: 'IoT Solutions', value: 1900000000, start: '2025-02-01', end: '2025-11-30', project: 'Smart Factory IoT', ot: false, signed: true, status: 'Đang hiệu lực' }
        ],
        projects: [
            { id: 'PRJ-101', name: 'Precision Sensor Module - V2', contractId: 'HD-2025-01', customerId: 'KH-003', company: 'Samsung Electronics HCMC', contact: 'Mr. Park Ji-Sung', leader: 'Nguyễn Văn An', serviceLine: 'Automotive Embedded', budget: 4500000000, start: '2025-01-15', end: '2025-12-31', desc: 'Embedded firmware & validation', progress: 68, status: 'Đang triển khai', revenue: 2100000000 },
            { id: 'PRJ-102', name: 'Cloud Infra Platform', contractId: 'HD-2025-02', customerId: 'KH-005', company: 'FPT Software Alliance', contact: 'Mr. Nguyen Quoc Hoa', leader: 'Trần Thị Bình', serviceLine: 'Digital & IT', budget: 2800000000, start: '2025-03-01', end: '2026-02-28', desc: 'Migration & DevOps', progress: 42, status: 'Đang triển khai', revenue: 980000000 },
            { id: 'PRJ-103', name: 'Smart Factory IoT', contractId: 'HD-2025-05', customerId: 'KH-007', company: 'Masan Consumer Core', contact: 'Mr. Tran Truong Tuan', leader: 'Đặng Lan Hương', serviceLine: 'IoT Solutions', budget: 1900000000, start: '2025-02-01', end: '2025-11-30', desc: 'IoT sensors deployment', progress: 55, status: 'Đang triển khai', revenue: 750000000 },
            { id: 'PRJ-104', name: 'Gas Monitoring System', contractId: 'HD-2024-08', customerId: 'KH-008', company: 'Petrovietnam Gas Node', contact: 'Mr. Le Hoang Thanh', leader: 'Phạm Minh Đức', serviceLine: 'Consulting', budget: 1200000000, start: '2024-06-01', end: '2025-05-31', desc: 'Real-time gas pipeline monitoring', progress: 100, status: 'Hoàn thành', revenue: 1100000000 },
            { id: 'PRJ-105', name: 'ERP Migration Wave 2', contractId: 'HD-2025-03', customerId: 'KH-002', company: 'Viettel Network Corporation', contact: 'Ms. Nguyen Thi Mai', leader: 'Hoàng Thị Em', serviceLine: 'Digital & IT', budget: 3200000000, start: '2025-04-01', end: '2026-03-31', desc: 'SAP S/4HANA migration', progress: 25, status: 'Đang triển khai', revenue: 600000000 },
            { id: 'PRJ-106', name: 'Dairy Farm IoT Sensors', contractId: 'HD-2024-06', customerId: 'KH-006', company: 'TH Milk Food Joint Stock', contact: 'Mrs. Cao Minh Huong', leader: 'Bùi Thanh Tùng', serviceLine: 'IoT Solutions', budget: 2200000000, start: '2024-11-01', end: '2025-10-31', desc: 'Smart dairy farming sensors', progress: 48, status: 'Đang triển khai', revenue: 820000000 },
            { id: 'PRJ-107', name: 'Automotive ECU Testing', contractId: 'HD-2025-04', customerId: 'KH-001', company: 'Bosch Global Partner', contact: 'Mr. Hans Mueller', leader: 'Nguyễn Văn An', serviceLine: 'Automotive Embedded', budget: 5000000000, start: '2025-01-01', end: '2026-06-30', desc: 'ECU validation & HIL testing', progress: 35, status: 'Đang triển khai', revenue: 1400000000 },
            { id: 'PRJ-108', name: 'Mobile App V3 Relaunch', contractId: 'HD-2025-02', customerId: 'KH-005', company: 'FPT Software Alliance', contact: 'Mr. Nguyen Quoc Hoa', leader: 'Vũ Quốc Phong', serviceLine: 'Digital & IT', budget: 900000000, start: '2025-05-01', end: '2025-09-30', desc: 'Cross-platform mobile rewrite', progress: 15, status: 'Tạm dừng', revenue: 120000000 }
        ],
        projectAssignments: {
            'PRJ-101': [
                { staffId: 'BS2041', name: 'Nguyễn Văn An',  title: 'Lead Engineer',    team: 'Team X-Engine', percent: 65, isLeader: true },
                { staffId: 'BS2110', name: 'Lê Hoàng Cường', title: 'QA Engineer',       team: 'Team X-Engine', percent: 30, isLeader: false }
            ],
            'PRJ-102': [
                { staffId: 'BS2088', name: 'Trần Thị Bình',  title: 'Senior Developer', team: 'Team UI',       percent: 80, isLeader: true },
                { staffId: 'BS2156', name: 'Phạm Minh Đức',  title: 'DevOps Engineer',  team: 'Team Cloud',    percent: 60, isLeader: false }
            ],
            'PRJ-103': [
                { staffId: 'BS2290', name: 'Đặng Lan Hương', title: 'Scrum Master',      team: 'Team PM',       percent: 60, isLeader: true }
            ],
            'PRJ-105': [
                { staffId: 'BS2201', name: 'Hoàng Thị Em',   title: 'Business Analyst', team: 'Team BA',       percent: 70, isLeader: true }
            ],
            'PRJ-107': [
                { staffId: 'BS2041', name: 'Nguyễn Văn An',  title: 'Lead Engineer',    team: 'Team X-Engine', percent: 20, isLeader: true },
                { staffId: 'BS2333', name: 'Bùi Thanh Tùng', title: 'Architect',         team: 'Team X-Engine', percent: 50, isLeader: false }
            ]
        },
        resources: [
            { id: 'REQ-001', projectId: 'PRJ-101', projectName: 'Precision Sensor Module - V2', from: '2025-04-01', to: '2025-08-31', ot: true, position: 'Senior Embedded Dev', qty: 2, file: 'jd_embedded.pdf', status: 'Đã duyệt' },
            { id: 'REQ-002', projectId: 'PRJ-102', projectName: 'Cloud Infra Platform', from: '2025-05-01', to: '2025-09-30', ot: false, position: 'DevOps Engineer', qty: 1, file: 'jd_devops.pdf', status: 'Chờ duyệt' },
            { id: 'REQ-003', projectId: 'PRJ-103', projectName: 'Smart Factory IoT', from: '2025-03-01', to: '2025-10-31', ot: false, position: 'IoT Engineer', qty: 2, file: 'jd_iot.pdf', status: 'ĐÃ PHÂN BỔ' },
            { id: 'REQ-004', projectId: 'PRJ-105', projectName: 'ERP Migration Wave 2', from: '2025-04-15', to: '2026-01-31', ot: true, position: 'SAP Consultant', qty: 3, file: 'jd_sap.pdf', status: 'Chờ duyệt' },
            { id: 'REQ-005', projectId: 'PRJ-107', projectName: 'Automotive ECU Testing', from: '2025-02-01', to: '2026-05-31', ot: true, position: 'HIL Test Engineer', qty: 2, file: 'jd_hil.pdf', status: 'Đã duyệt' },
            { id: 'REQ-006', projectId: 'PRJ-106', projectName: 'Dairy Farm IoT Sensors', from: '2025-01-01', to: '2025-09-30', ot: false, position: 'Embedded Firmware Dev', qty: 1, file: 'jd_firmware.pdf', status: 'ĐÃ PHÂN BỔ' }
        ],
        serviceLines: [
            { id: 'SL-001', name: 'Automotive Embedded Solutions', desc: 'Development of embedded systems for automotive', rate: 1500000, contracts: 2, projects: 1, active: true },
            { id: 'SL-002', name: 'Digital & IT Solutions', desc: 'Cloud, DevOps and enterprise integration', rate: 1200000, contracts: 3, projects: 2, active: true },
            { id: 'SL-003', name: 'IoT & Edge Computing', desc: 'Smart factory and edge node solutions', rate: 1350000, contracts: 1, projects: 1, active: true },
            { id: 'SL-004', name: 'Consulting & PMO', desc: 'Project management and business consulting', rate: 1800000, contracts: 2, projects: 0, active: false }
        ],
        participation: [
            { staffId: 'BS2041', name: 'Nguyễn Văn An', title: 'Lead Engineer', project: 'Precision Sensor V2', planned: 80, otHours: 12, actual: 65 },
            { staffId: 'BS2088', name: 'Trần Thị Bình', title: 'Senior Developer', project: 'Cloud Infra', planned: 100, otHours: 24, actual: 82 },
            { staffId: 'BS2156', name: 'Phạm Minh Đức', title: 'DevOps Engineer', project: 'Cloud Infra', planned: 90, otHours: 40, actual: 95 },
            { staffId: 'BS2245', name: 'Vũ Quốc Phong', title: 'Junior Developer', project: 'Mobile App V3', planned: 60, otHours: 0, actual: 40 }
        ],
        orgGroups: [
            { id: 'g-a', name: 'Group A - Engineering', manager: 'Jackson Nguyen', members: 42, teams: 4 },
            { id: 'g-b', name: 'Group B - Digital', manager: 'Maria Schmidt', members: 38, teams: 3 },
            { id: 'g-c', name: 'Group C - Business', manager: 'David Chen', members: 35, teams: 3 },
            { id: 'g-d', name: 'Group D - Operations', manager: 'Frank Miller', members: 27, teams: 2 }
        ],
        teamsCatalog: {
            A: ['Team X-Engine', 'Team UI', 'Team Cloud'],
            B: ['Team X-Engine', 'Team Cloud', 'Team BA'],
            C: ['Team UI', 'Team BA', 'Team PM'],
            D: ['Team PM', 'Team BA']
        },
        orgTeams: [
            { id: 't-x', groupId: 'g-a', name: 'Team X-Engine', dm: 'Nguyễn Văn An' },
            { id: 't-ui', groupId: 'g-a', name: 'Team UI', dm: 'Trần Thị Bình' }
        ],
        devices: [
            { id: 'd1', name: 'MacBook Pro 16"', icon: 'fa-laptop', ip: '192.168.1.15', time: 'Hiện tại', location: 'TP. Hồ Chí Minh', active: true },
            { id: 'd2', name: 'iPhone 14 Pro', icon: 'fa-mobile-screen', ip: '192.168.1.22', time: '2 giờ trước', location: 'TP. Hồ Chí Minh', active: false }
        ],
        activityLogs: [
            { id: 'log1', time: '2025-05-25T09:15:00', user: 'Nguyễn Văn Admin', category: 'Đăng nhập', desc: 'Đăng nhập hệ thống thành công', ip: '10.0.12.45', device: 'Chrome v118 / macOS', location: 'TP.HCM' },
            { id: 'log2', time: '2025-05-25T08:42:00', user: 'Trần Thị Bình', category: 'Bảo mật', desc: 'Thay đổi mật khẩu tài khoản', ip: '10.0.8.22', device: 'Safari / iOS', location: 'Hà Nội' },
            { id: 'log3', time: '2025-05-24T16:30:00', user: 'Hệ thống', category: 'Ngân sách', desc: 'Cập nhật dòng dịch vụ SL-002', ip: '10.0.1.1', device: 'System', location: 'Server' },
            { id: 'log4', time: '2025-05-24T14:10:00', user: 'Phạm Minh Đức', category: 'Nhân sự', desc: 'Thêm nhân sự mới BS2400', ip: '10.0.15.88', device: 'Firefox / Windows 11', location: 'TP.HCM' }
        ],
        reportSchedules: [],
        counters: { customer: 9, contract: 4, project: 104, staff: 2400, resource: 3, serviceLine: 5 }
    };

    function buildHeatmap() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const employees = SEED.staff.slice(0, 7).map((s) => s.name.split(' ').pop());
        const data = employees.map(() =>
            months.map(() => Math.floor(Math.random() * 80) + 25)
        );
        SEED.dashboard.heatmap = { employees, months, data };
    }
    buildHeatmap();

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const merged = JSON.parse(JSON.stringify(SEED));
                Object.keys(merged).forEach((key) => {
                    if (parsed[key] === undefined) parsed[key] = merged[key];
                });
                if (!parsed.dashboard?.heatmap?.employees) {
                    parsed.dashboard = { ...merged.dashboard, ...parsed.dashboard };
                }
                if (!parsed.assignments) parsed.assignments = merged.assignments;
                // Nếu dữ liệu lưu ít hơn seed thì dùng seed (để seed mới có hiệu lực)
                if ((parsed.customers?.length || 0) < merged.customers.length) parsed.customers = merged.customers;
                if ((parsed.projects?.length || 0) < merged.projects.length) parsed.projects = merged.projects;
                if ((parsed.contracts?.length || 0) < merged.contracts.length) parsed.contracts = merged.contracts;
                if ((parsed.resources?.length || 0) < merged.resources.length) parsed.resources = merged.resources;
                if ((parsed.serviceLines?.length || 0) < merged.serviceLines.length) parsed.serviceLines = merged.serviceLines;
                if ((parsed.staff?.length || 0) < merged.staff.length) parsed.staff = merged.staff;
                if ((parsed.participation?.length || 0) < merged.participation.length) parsed.participation = merged.participation;
                if (!parsed.projectAssignments) parsed.projectAssignments = merged.projectAssignments;
                return parsed;
            }
        } catch (e) {
            console.warn('[MockStore] Load failed, using seed', e);
        }
        return JSON.parse(JSON.stringify(SEED));
    }

    let db = load();
    // Đảm bảo projectAssignments luôn tồn tại
    if (!db.projectAssignments) {
        db.projectAssignments = JSON.parse(JSON.stringify(SEED.projectAssignments || {}));
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }

    function nextId(prefix, counterKey) {
        db.counters[counterKey] = (db.counters[counterKey] || 1) + 1;
        const num = String(db.counters[counterKey]).padStart(3, '0');
        save();
        return `${prefix}-${num}`;
    }

    function logActivity(category, desc) {
        db.activityLogs.unshift({
            id: 'log_' + Date.now(),
            time: new Date().toISOString(),
            user: UI.getUserName(),
            category,
            desc,
            ip: '10.0.' + Math.floor(Math.random() * 200) + '.1',
            device: 'Chrome / Windows',
            location: 'TP.HCM'
        });
        if (db.activityLogs.length > 200) db.activityLogs.length = 200;
        save();
    }

    function getDashboardMetrics() {
        const projects = db.projects.filter((p) => p.status !== 'Đã hủy');
        const totalRevenue = projects.reduce((s, p) => s + (p.revenue || 0), 0);
        const avgProgress = projects.length
            ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
            : 0;
        const activeCount = projects.filter((p) => p.status === 'Đang triển khai').length;
        const growth = 12.5;
        return {
            totalRevenue,
            growth,
            activeProjects: activeCount || projects.length,
            performance: avgProgress,
            revenueTrendPct: 8.4
        };
    }

    const store = {
        get: () => db,
        save,
        reset() {
            db = JSON.parse(JSON.stringify(SEED));
            buildHeatmap();
            db.dashboard.heatmap = SEED.dashboard.heatmap;
            save();
        },
        logActivity,
        getDashboardMetrics,

        // Staff
        getStaff: () => db.staff,
        addStaff(item) {
            const maxNum = db.staff.reduce((max, s) => {
                const n = parseInt(String(s.id).replace(/\D/g, ''), 10) || 0;
                return n > max ? n : max;
            }, 2040);
            item.id = item.id || 'BS' + (maxNum + 1);
            db.staff.unshift(item);
            db.roadmap.unshift({
                id: item.id,
                name: item.name,
                title: item.title,
                level: 'L2',
                course: 'Onboarding Bosch',
                status: 'Chưa bắt đầu'
            });
            save();
            logActivity('Nhân sự', `Thêm nhân sự ${item.name} (${item.id})`);
            return item;
        },
        updateStaff(id, patch) {
            const i = db.staff.findIndex((s) => s.id === id);
            if (i === -1) return null;
            db.staff[i] = { ...db.staff[i], ...patch };
            save();
            logActivity('Nhân sự', `Cập nhật nhân sự ${id}`);
            return db.staff[i];
        },
        deleteStaff(ids) {
            db.staff = db.staff.filter((s) => !ids.includes(s.id));
            db.roadmap = db.roadmap.filter((r) => !ids.includes(r.id));
            db.participation = db.participation.filter((p) => !ids.includes(p.staffId));
            save();
            logActivity('Nhân sự', `Xóa ${ids.length} nhân sự`);
        },

        getRoadmap: () => db.roadmap,
        addRoadmap(item) {
            const staff = db.staff.find((s) => s.id === item.id);
            if (staff) {
                item.name = item.name || staff.name;
                item.title = item.title || staff.title;
            }
            // Nếu có courseId riêng thì thêm mới, không ghi đè
            if (item.courseId) {
                db.roadmap.unshift(item);
            } else {
                const exists = db.roadmap.findIndex((r) => r.id === item.id && !r.courseId);
                if (exists >= 0) db.roadmap[exists] = { ...db.roadmap[exists], ...item };
                else db.roadmap.unshift(item);
            }
            save();
            logActivity('Nhân sự', `Cập nhật lộ trình ${item.id}`);
            return item;
        },
        updateRoadmap(id, patch) {
            const i = db.roadmap.findIndex((r) => r.id === id);
            if (i === -1) return null;
            db.roadmap[i] = { ...db.roadmap[i], ...patch };
            const staff = db.staff.find((s) => s.id === id);
            if (staff && patch.name) staff.name = patch.name;
            if (staff && patch.title) staff.title = patch.title;
            save();
            logActivity('Nhân sự', `Sửa lộ trình ${id}`);
            return db.roadmap[i];
        },
        syncRoadmapFromStaff() {
            db.staff.forEach((s) => {
                const r = db.roadmap.find((x) => x.id === s.id);
                if (r) {
                    r.name = s.name;
                    r.title = s.title;
                }
            });
            save();
        },

        getDevices: () => db.devices,
        logoutOtherDevices() {
            db.devices.forEach((d) => {
                if (!d.active) return;
                d.active = false;
                d.time = 'Vừa đăng xuất';
            });
            const current = db.devices.find((d) => d.id === 'd1');
            if (current) {
                current.active = true;
                current.time = 'Hiện tại';
            }
            save();
            logActivity('Bảo mật', 'Đăng xuất tất cả thiết bị khác');
        },

        recalcBudgetFromProjects() {
            db.projects.forEach((p) => {
                const sl = db.serviceLines.find((s) => p.serviceLine && s.name.includes(p.serviceLine.split(' ')[0]));
                const rate = sl?.rate || 1500000;
                p.revenue = p.revenue || Math.round((p.budget || 0) * (p.progress || 0) / 100);
            });
            db.participation.forEach((p) => {
                const s = db.staff.find((x) => x.id === p.staffId);
                if (s) {
                    p.name = s.name;
                    p.title = s.title;
                    p.project = s.project;
                    p.actual = s.workload;
                }
            });
            save();
            logActivity('Ngân sách', 'Đồng bộ doanh thu & tham gia');
        },

        // Customers
        getCustomers: () => db.customers,
        addCustomer(c) {
            c.id = c.id || nextId('KH', 'customer');
            db.customers.push(c);
            save();
            logActivity('Vận hành', `Thêm khách hàng ${c.company}`);
            return c;
        },
        updateCustomer(id, patch) {
            const i = db.customers.findIndex((c) => c.id === id);
            if (i === -1) return null;
            db.customers[i] = { ...db.customers[i], ...patch };
            save();
            logActivity('Vận hành', `Cập nhật khách hàng ${id}`);
            return db.customers[i];
        },
        deleteCustomers(ids) {
            db.customers = db.customers.filter((c) => !ids.includes(c.id));
            save();
            logActivity('Vận hành', `Xóa ${ids.length} khách hàng`);
        },

        getContracts: () => db.contracts,
        addContract(c) {
            c.id = c.id || nextId('HD', 'contract');
            db.contracts.push(c);
            save();
            logActivity('Vận hành', `Tạo hợp đồng ${c.id}`);
            return c;
        },
        updateContract(id, patch) {
            const i = db.contracts.findIndex((c) => c.id === id);
            if (i === -1) return null;
            db.contracts[i] = { ...db.contracts[i], ...patch };
            save();
            logActivity('Vận hành', `Cập nhật hợp đồng ${id}`);
            return db.contracts[i];
        },
        deleteContracts(ids) {
            db.contracts = db.contracts.filter((c) => !ids.includes(c.id));
            save();
        },

        getProjects: () => db.projects,
        addProject(p) {
            p.id = p.id || nextId('PRJ', 'project');
            db.projects.push(p);
            save();
            logActivity('Dự án', `Tạo dự án ${p.name}`);
            return p;
        },
        updateProject(id, patch) {
            const i = db.projects.findIndex((p) => p.id === id);
            if (i === -1) return null;
            db.projects[i] = { ...db.projects[i], ...patch };
            save();
            logActivity('Dự án', `Cập nhật dự án ${id}`);
            return db.projects[i];
        },
        deleteProjects(ids) {
            db.projects = db.projects.filter((p) => !ids.includes(p.id));
            save();
        },

        // Project Assignments
        getProjectAssignments(projectId) {
            if (!db.projectAssignments) db.projectAssignments = {};
            return db.projectAssignments[projectId] || [];
        },
        setProjectAssignments(projectId, assignments) {
            if (!db.projectAssignments) db.projectAssignments = {};
            db.projectAssignments[projectId] = assignments;
            // Cập nhật leader trên project
            const leader = assignments.find(a => a.isLeader);
            const pi = db.projects.findIndex(p => p.id === projectId);
            if (pi !== -1 && leader) db.projects[pi].leader = leader.name;
            save();
            logActivity('Dự án', `Cập nhật phân công nhân sự cho ${projectId}`);
        },
        deleteProjectAssignments(projectId) {
            if (!db.projectAssignments) return;
            delete db.projectAssignments[projectId];
            save();
        },

        getResources: () => db.resources,
        addResource(r) {
            r.id = r.id || nextId('REQ', 'resource');
            db.resources.push(r);
            save();
            logActivity('Nguồn lực', `Tạo yêu cầu ${r.id}`);
            return r;
        },
        updateResource(id, patch) {
            const i = db.resources.findIndex((r) => r.id === id);
            if (i === -1) return null;
            db.resources[i] = { ...db.resources[i], ...patch };
            save();
            return db.resources[i];
        },
        deleteResources(ids) {
            db.resources = db.resources.filter((r) => !ids.includes(r.id));
            save();
        },

        getServiceLines() {
            if (!db.serviceLines || db.serviceLines.length === 0) {
                db.serviceLines = JSON.parse(JSON.stringify(SEED.serviceLines));
                save();
            }
            db.serviceLines.forEach(sl => {
                const prefix = sl.name.split(' ')[0];
                sl.contracts = db.contracts.filter(c => c.serviceLine && c.serviceLine.includes(prefix)).length;
                sl.projects = db.projects.filter(p => p.serviceLine && p.serviceLine.includes(prefix)).length;
            });
            return db.serviceLines;
        },
        addServiceLine(sl) {
            sl.id = sl.id || nextId('SL', 'serviceLine');
            db.serviceLines.push(sl);
            save();
            logActivity('Ngân sách', `Tạo dòng dịch vụ ${sl.id}`);
            return sl;
        },
        updateServiceLine(id, patch) {
            const i = db.serviceLines.findIndex((s) => s.id === id);
            if (i === -1) return null;
            db.serviceLines[i] = { ...db.serviceLines[i], ...patch };
            save();
            logActivity('Ngân sách', `Cập nhật ${id}`);
            return db.serviceLines[i];
        },
        deleteServiceLines(ids) {
            db.serviceLines = db.serviceLines.filter((s) => !ids.includes(s.id));
            save();
        },

        getParticipation: () => db.participation,
        updateParticipation(staffId, patch) {
            const i = db.participation.findIndex((p) => p.staffId === staffId);
            if (i === -1) return null;
            db.participation[i] = { ...db.participation[i], ...patch };
            save();
            logActivity('Ngân sách', `Cập nhật tham gia ${staffId}`);
            return db.participation[i];
        },

        getOrgGroups: () => db.orgGroups,
        addOrgGroup(g) {
            g.id = g.id || 'g-' + Date.now();
            db.orgGroups.push(g);
            save();
            logActivity('Tổ chức', `Tạo group ${g.name}`);
            return g;
        },
        getOrgTeams: () => db.orgTeams,
        addOrgTeam(t) {
            t.id = t.id || 't-' + Date.now();
            db.orgTeams.push(t);
            save();
            logActivity('Tổ chức', `Tạo team ${t.name}`);
            return t;
        },

        getActivityLogs: () => db.activityLogs,
        getSettings: () => db.settings,
        updateSettings(patch) {
            db.settings = { ...db.settings, ...patch };
            save();
        }
    };

    window.MockStore = store;
    console.log('📦 MockStore loaded —', db.staff.length, 'nhân sự,', db.projects.length, 'dự án');
})();
