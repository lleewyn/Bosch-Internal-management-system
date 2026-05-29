/**
 * DB SERVICE — Tất cả các truy vấn Supabase tập trung tại đây
 * Các trang chỉ cần gọi DB.xxx() thay vì viết query trực tiếp
 */
window.DB = (() => {

    // ── Helpers ──────────────────────────────────────────────────────────────
    function client() {
        if (!window.supabaseClient) {
            console.error('[DB] supabaseClient chưa khởi tạo');
            return null;
        }
        return window.supabaseClient;
    }

    async function query(fn) {
        try {
            const sb = client();
            if (!sb) return { data: null, error: { message: 'No client' } };
            return await fn(sb);
        } catch (err) {
            console.error('[DB] Exception:', err);
            return { data: null, error: err };
        }
    }

    // ── AUTH / USER ───────────────────────────────────────────────────────────
    const Auth = {
        currentUser() {
            try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
        }
    };

    // ── EMPLOYEES ─────────────────────────────────────────────────────────────
    const Employees = {
        async getAll() {
            return query(sb => sb
                .from('employees')
                .select(`
                    employee_id, employee_code, full_name, gender,
                    day_of_birth, phone_number, personal_email, hire_date,
                    status, manager_id, position_id, jl_id,
                    positions ( position_name ),
                    job_levels ( level_name, level_order ),
                    employee_organizations (
                        status,
                        groups ( group_name ),
                        teams ( team_name ),
                        sub_teams ( sub_team_name )
                    )
                `)
                .order('employee_code')
            );
        },

        async getById(id) {
            return query(sb => sb
                .from('employees')
                .select(`
                    *,
                    positions ( position_name ),
                    job_levels ( level_name )
                `)
                .eq('employee_id', id)
                .single()
            );
        },

        async create(payload) {
            return query(sb => sb.from('employees').insert(payload).select().single());
        },

        async update(id, payload) {
            return query(sb => sb.from('employees').update(payload).eq('employee_id', id));
        },

        async delete(id) {
            // Xóa các bảng liên quan trước (tránh FK constraint)
            await query(sb => sb.from('employee_organizations').delete().eq('employee_id', id));
            await query(sb => sb.from('project_assignments').delete().eq('employee_id', id));
            await query(sb => sb.from('employee_study').delete().eq('employee_id', id));
            await query(sb => sb.from('users').delete().eq('employee_id', id));
            return query(sb => sb.from('employees').delete().eq('employee_id', id));
        }
    };

    // ── CUSTOMERS ─────────────────────────────────────────────────────────────
    const Customers = {
        async getAll() {
            return query(sb => sb
                .from('customers')
                .select('*')
                .order('company_name')
            );
        },

        async create(payload) {
            return query(sb => sb.from('customers').insert(payload).select().single());
        },

        async update(id, payload) {
            return query(sb => sb.from('customers').update(payload).eq('customer_id', id));
        },

        async delete(id) {
            return query(sb => sb.from('customers').delete().eq('customer_id', id));
        }
    };

    // ── CONTRACTS ─────────────────────────────────────────────────────────────
    const Contracts = {
        async getAll() {
            return query(sb => sb
                .from('contracts')
                .select(`
                    *,
                    customers ( company_name, contact_person, contact_email, phone ),
                    service_lines ( service_line_name )
                `)
                .order('created_at', { ascending: false })
            );
        },

        async create(payload) {
            return query(sb => sb.from('contracts').insert(payload).select().single());
        },

        async update(id, payload) {
            return query(sb => sb.from('contracts').update(payload).eq('contract_id', id));
        },

        async delete(id) {
            return query(sb => sb.from('contracts').delete().eq('contract_id', id));
        }
    };

    // ── PROJECTS ──────────────────────────────────────────────────────────────
    const Projects = {
        async getAll() {
            return query(sb => sb
                .from('projects')
                .select(`
                    *,
                    customers ( company_name, contact_person ),
                    contracts ( contract_code, service_line_id,
                        service_lines ( service_line_name )
                    )
                `)
                .order('created_at', { ascending: false })
            );
        },

        async create(payload) {
            return query(sb => sb.from('projects').insert(payload).select().single());
        },

        async update(id, payload) {
            return query(sb => sb.from('projects').update(payload).eq('project_id', id));
        },

        async delete(id) {
            return query(sb => sb.from('projects').delete().eq('project_id', id));
        }
    };

    // ── SERVICE LINES ─────────────────────────────────────────────────────────
    const ServiceLines = {
        async getAll() {
            return query(sb => sb
                .from('service_lines')
                .select('*')
                .order('service_line_name')
            );
        },

        async getRates(serviceLineId) {
            return query(sb => sb
                .from('service_line_rates')
                .select('*')
                .eq('service_line_id', serviceLineId)
                .order('effective_from', { ascending: false })
            );
        },

        async create(payload) {
            return query(sb => sb.from('service_lines').insert(payload).select().single());
        },

        async update(id, payload) {
            return query(sb => sb.from('service_lines').update(payload).eq('service_line_id', id));
        },

        async delete(id) {
            return query(sb => sb.from('service_lines').delete().eq('service_line_id', id));
        }
    };

    // ── GROUPS / TEAMS / SUB-TEAMS ────────────────────────────────────────────
    const Org = {
        async getGroups() {
            return query(sb => sb.from('groups').select('*').order('group_name'));
        },

        async getTeams(groupId = null) {
            return query(sb => {
                let q = sb.from('teams').select('*, groups(group_name)').order('team_name');
                if (groupId) q = q.eq('group_id', groupId);
                return q;
            });
        },

        async getSubTeams(teamId = null) {
            return query(sb => {
                let q = sb.from('sub_teams').select('*, teams(team_name)').order('sub_team_name');
                if (teamId) q = q.eq('team_id', teamId);
                return q;
            });
        }
    };

    // ── POSITIONS & JOB LEVELS ────────────────────────────────────────────────
    const Meta = {
        async getPositions() {
            return query(sb => sb.from('positions').select('*').eq('is_active', true).order('position_name'));
        },

        async getJobLevels() {
            return query(sb => sb.from('job_levels').select('*').order('level_order'));
        },

        async getRoles() {
            return query(sb => sb.from('roles').select('*').eq('is_active', true));
        }
    };

    // ── PROJECT ASSIGNMENTS ───────────────────────────────────────────────────
    const Assignments = {
        async getAll() {
            return query(sb => sb
                .from('project_assignments')
                .select(`
                    *,
                    employees ( full_name, employee_code ),
                    project_resource_requests (
                        project_resource_request_id,
                        project_id
                    ),
                    sub_teams ( sub_team_name )
                `)
                .order('assignment_id', { ascending: false })
            );
        },

        async getByProject(projectId) {
            // Bước 1: lấy tất cả request_id của project
            const reqRes = await query(sb => sb
                .from('project_resource_requests')
                .select('project_resource_request_id')
                .eq('project_id', projectId)
            );
            if (reqRes.error || !reqRes.data?.length) return { data: [], error: reqRes.error };
            const requestIds = reqRes.data.map(r => r.project_resource_request_id);

            // Bước 2: lấy assignments theo request IDs
            return query(sb => sb
                .from('project_assignments')
                .select(`
                    assignment_id, allocation_percent, employee_id,
                    employees ( employee_code, full_name, position_id )
                `)
                .in('project_resource_request_id', requestIds)
            );
        },

        async getByRequest(requestId) {
            return query(sb => sb
                .from('project_assignments')
                .select(`
                    *,
                    employees ( full_name, employee_code ),
                    project_resource_requests (
                        project_resource_request_id,
                        project_id
                    ),
                    sub_teams ( sub_team_name )
                `)
                .eq('project_resource_request_id', requestId)
            );
        },

        async create(payload) {
            return query(sb => sb
                .from('project_assignments')
                .insert(payload)
                .select()
                .single()
            );
        },

        async update(id, payload) {
            return query(sb => sb
                .from('project_assignments')
                .update(payload)
                .eq('assignment_id', id)
            );
        },

        async delete(id) {
            return query(sb => sb
                .from('project_assignments')
                .delete()
                .eq('assignment_id', id)
            );
        },

        async deleteByProject(projectId) {
            // Bước 1: lấy request IDs
            const reqRes = await query(sb => sb
                .from('project_resource_requests')
                .select('project_resource_request_id')
                .eq('project_id', projectId)
            );
            if (reqRes.error || !reqRes.data?.length) return { data: null, error: null };
            const requestIds = reqRes.data.map(r => r.project_resource_request_id);

            // Bước 2: xóa assignments
            return query(sb => sb
                .from('project_assignments')
                .delete()
                .in('project_resource_request_id', requestIds)
            );
        }
    };

    // ── AUDIT / ACTIVITY LOGS ─────────────────────────────────────────────────
    const Logs = {
        async getAuditLogs(limit = 200) {
            return query(sb => sb
                .from('audit_logs')
                .select(`
                    *,
                    users ( username, company_email )
                `)
                .order('action_time', { ascending: false })
                .limit(limit)
            );
        },

        async getLoginLogs(limit = 200) {
            return query(sb => sb
                .from('login_logs')
                .select(`
                    *,
                    users ( username, company_email )
                `)
                .order('login_time', { ascending: false })
                .limit(limit)
            );
        },

        async addAuditLog(payload) {
            const user = Auth.currentUser();
            return query(sb => sb.from('audit_logs').insert({
                user_id:     user?.user_id || null,
                action_type: payload.action_type,
                table_name:  payload.table_name  || null,
                record_id:   payload.record_id   || null,
                old_value:   payload.old_value   ? JSON.stringify(payload.old_value) : null,
                new_value:   payload.new_value   ? JSON.stringify(payload.new_value) : null,
                action_time: new Date().toISOString()
            }));
        }
    };

    // ── BUDGETS ───────────────────────────────────────────────────────────────
    const Budgets = {
        async getAll() {
            return query(sb => sb
                .from('budgets')
                .select('*')
                .order('created_at', { ascending: false })
            );
        },

        async getAllocations() {
            return query(sb => sb
                .from('budget_allocations')
                .select(`
                    *,
                    projects ( project_name, project_code )
                `)
                .order('created_at', { ascending: false })
            );
        }
    };

    // ── EFFORT / PARTICIPATION ────────────────────────────────────────────────
    const Effort = {
        async getAll() {
            return query(sb => sb
                .from('effort_projects')
                .select(`
                    *,
                    project_assignments (
                        allocation_percent,
                        employee_id,
                        employees ( employee_code, full_name, position_id ),
                        project_resource_requests (
                            projects ( project_name, project_code )
                        )
                    )
                `)
                .order('effort_year', { ascending: false })
            );
        }
    };

    // ── RESOURCE REQUESTS ─────────────────────────────────────────────────────
    const ResourceRequests = {
        async getByProject(projectId) {
            return query(sb => sb
                .from('project_resource_requests')
                .select('project_resource_request_id, position_id, quantity, is_ot')
                .eq('project_id', projectId)
            );
        },

        async create(payload) {
            return query(sb => sb
                .from('project_resource_requests')
                .insert(payload)
                .select()
                .single()
            );
        }
    };

    // ── STORAGE — Upload file ─────────────────────────────────────────────────
    const Storage = {
        async uploadFile(bucket, path, file) {
            try {
                const sb = client();
                if (!sb) return { url: null, error: { message: 'No client' } };
                const { data, error } = await sb.storage
                    .from(bucket)
                    .upload(path, file, { upsert: true });
                if (error) return { url: null, error };
                const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
                return { url: urlData.publicUrl, error: null };
            } catch (err) {
                return { url: null, error: err };
            }
        }
    };

    // ── AUTO AUDIT LOGGING ────────────────────────────────────────────────────
    // Wrap các hàm CRUD để tự động ghi audit_log sau mỗi thao tác thành công
    function withAudit(tableName, actionType, fn) {
        return async function(...args) {
            const result = await fn(...args);
            if (!result.error) {
                const user = Auth.currentUser();
                query(sb => sb.from('audit_logs').insert({
                    user_id:     user?.user_id || null,
                    action_type: actionType,
                    table_name:  tableName,
                    record_id:   result.data?.id || result.data?.[tableName.slice(0,-1)+'_id'] || null,
                    action_time: new Date().toISOString()
                }));
            }
            return result;
        };
    }

    // Áp dụng auto-audit cho các bảng chính
    Customers.create = withAudit('customers', 'INSERT', Customers.create.bind(Customers));
    Customers.update = withAudit('customers', 'UPDATE', Customers.update.bind(Customers));
    Customers.delete = withAudit('customers', 'DELETE', Customers.delete.bind(Customers));
    Contracts.create = withAudit('contracts', 'INSERT', Contracts.create.bind(Contracts));
    Contracts.update = withAudit('contracts', 'UPDATE', Contracts.update.bind(Contracts));
    Contracts.delete = withAudit('contracts', 'DELETE', Contracts.delete.bind(Contracts));
    Projects.create  = withAudit('projects',  'INSERT', Projects.create.bind(Projects));
    Projects.update  = withAudit('projects',  'UPDATE', Projects.update.bind(Projects));
    Projects.delete  = withAudit('projects',  'DELETE', Projects.delete.bind(Projects));
    Employees.create = withAudit('employees', 'INSERT', Employees.create.bind(Employees));
    Employees.update = withAudit('employees', 'UPDATE', Employees.update.bind(Employees));
    Employees.delete = withAudit('employees', 'DELETE', Employees.delete.bind(Employees));

    return { Auth, Employees, Customers, Contracts, Projects, ServiceLines, Org, Meta, Assignments, ResourceRequests, Logs, Budgets, Effort, Storage };
})();
