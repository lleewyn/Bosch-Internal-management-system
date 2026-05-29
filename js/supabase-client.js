/**
 * SUPABASE CLIENT
 * Kết nối thật với Supabase project: KienTapProject
 */

const SUPABASE_URL      = 'https://fnlaikizesijkzseauup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubGFpa2l6ZXNpamt6c2VhdXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODU4MDgsImV4cCI6MjA5MzM2MTgwOH0.zxm3T1yb1F7HJk7vLEYaxYeBFYd-8dLwBniad2H3p4Y';

// Script này chạy sau khi CDN đã load (nhờ defer + thứ tự đúng)
// window.supabase chắc chắn có mặt ở đây
if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected:', SUPABASE_URL);
} else {
    console.error('❌ Supabase SDK chưa load. Kiểm tra lại thứ tự script.');
    window.supabaseClient = null;
}
