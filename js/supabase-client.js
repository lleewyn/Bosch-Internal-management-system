const supabaseUrl = 'https://fnlaikizesijkzseauup.supabase.co';
// Lưu ý: Thường key này bắt đầu bằng 'eyJ...', nhưng mình đang dùng đúng key bạn gửi.
// Nếu gặp lỗi Unauthorized, bạn hãy vào Supabase -> Project Settings -> API -> copy 'anon' public key dán vào đây nhé.
const supabaseKey = 'sb_publishable_rMiGJyVeAui-gzVraUYGLw_xR67obDc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
