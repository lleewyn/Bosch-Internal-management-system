/**
 * MOCK SUPABASE CLIENT
 * Chế độ Offline: Sử dụng dữ liệu giả lập để không phụ thuộc vào Internet/Supabase
 */

// 1. Dữ liệu giả lập (Local Data)
const mockData = {
    users: [
        {
            user_id: "u001",
            employee_id: "e001",
            email: "admin@bosch.com",
            password_hash: "123456",
            username: "admin_bosch",
            avatar: "https://ui-avatars.com/api/?name=Admin+Bosch&background=007bc0&color=fff"
        },
        {
            user_id: "u002",
            employee_id: "e002",
            email: "user@bosch.com",
            password_hash: "123",
            username: "user_test",
            avatar: null
        }
    ],
    employees: [
        {
            employee_id: "e001",
            full_name: "Nguyễn Văn Admin",
            phone_number: "0901234567",
            position_id: "p001"
        },
        {
            employee_id: "e002",
            full_name: "Trần Thị User",
            phone_number: "0987654321",
            position_id: "p002"
        }
    ],
    positions: [
        { position_id: "p001", position_name: "Quản trị viên hệ thống" },
        { position_id: "p002", position_name: "Nhân viên phòng ban" }
    ]
};

// 2. Mock Supabase Client Object
const supabaseClient = {
    from: function(tableName) {
        const table = mockData[tableName] || [];
        
        return {
            select: function(columns) {
                return {
                    eq: function(field, value) {
                        return {
                            eq: function(field2, value2) {
                                return {
                                    single: async function() {
                                        let result = table.find(item => item[field] === value && item[field2] === value2);
                                        
                                        // CHẾ ĐỘ "BẤT CHẤP": Nếu không tìm thấy, tự tạo một user giả để đăng nhập luôn
                                        if (!result && tableName === 'users') {
                                            console.log(`[Mock DB] Không tìm thấy user ${value}, đang tạo user tạm thời...`);
                                            result = {
                                                user_id: "u_temp_" + Math.random().toString(36).substr(2, 5),
                                                employee_id: "e_temp_" + Math.random().toString(36).substr(2, 5),
                                                email: value,
                                                username: value.split('@')[0],
                                                avatar: null
                                            };
                                        }

                                        return result ? { data: result, error: null } : { data: null, error: { message: "Not found" } };
                                    }
                                };
                            },
                            single: async function() {
                                let result = table.find(item => item[field] === value);
                                
                                // CHẾ ĐỘ "BẤT CHẤP": Nếu không tìm thấy thông tin Employee, tự tạo data để hiển thị
                                if (!result && tableName === 'employees') {
                                    result = {
                                        employee_id: value,
                                        full_name: "User Demo",
                                        phone_number: "0123-456-789",
                                        position_id: "p002"
                                    };
                                }
                                
                                return result ? { data: result, error: null } : { data: null, error: { message: "Not found" } };
                            }
                        };
                    }
                };
            },
            update: function(updateData) {
                return {
                    eq: function(field, value) {
                        // Cập nhật vào mockData
                        const index = table.findIndex(item => item[field] === value);
                        if (index !== -1) {
                            mockData[tableName][index] = { ...table[index], ...updateData };
                            console.log(`[Mock DB] Updated ${tableName}:`, mockData[tableName][index]);
                        }
                        return Promise.resolve({ error: null });
                    }
                };
            }
        };
    }
};

console.log("🚀 Supabase is disconnected. Running in OFFLINE mode with mock data.");
