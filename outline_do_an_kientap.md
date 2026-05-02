# KẾ HOẠCH & ĐỀ CƯƠNG ĐỒ ÁN KIẾN TẬP TẠI BGSV
**Đề tài gợi ý:** Phân tích yêu cầu và thiết kế phần mềm quản lý nội bộ dành cho cấp Quản lý tại Bosch Global Software Technologies (BGSV).

> [!TIP]
> **Hướng dẫn sử dụng:** Dưới mỗi đề mục, tôi đã bổ sung phần trích dẫn mờ mô tả chính xác những gì bạn cần viết/vẽ. Bạn hãy bám sát vào những gợi ý này để làm nháp nội dung.

---

## MỤC LỤC CHI TIẾT (REPORT OUTLINE)

### LỜI MỞ ĐẦU / ABSTRACT
> *Viết gì:* Nêu lý do chọn đề tài thực tập. Cảm ơn trường và công ty BGSV đã hỗ trợ.

### PHẦN 1: TỔNG QUAN VỀ ĐƠN VỊ KIẾN TẬP
- `[ ]` **1.1 Lịch sử hình thành & phát triển.** 
  > *Viết gì:* Trình bày ngắn gọn bối cảnh thành lập Tập đoàn Bosch toàn cầu và đưa ra các cột mốc nổi bật của chi nhánh BGSV tại Việt Nam.
- `[ ]` **1.2 Tầm nhìn, Sứ mệnh và Giá trị cốt lõi.**
  > *Viết gì:* Trích dẫn trực tiếp từ website của công ty. Nêu bật văn hóa doanh nghiệp mà bạn cảm nhận được.
- `[ ]` **1.3 Lĩnh vực hoạt động chính.**
  > *Viết gì:* Kể tên các mảng kinh doanh (Phần mềm nhúng ô tô, giải pháp CNTT doanh nghiệp, ERP...).
- `[ ]` **1.4 Cơ cấu tổ chức.**
  > *Viết gì:* Vẽ 1 sơ đồ khối tổ chức công ty. Khoanh vùng rõ phòng ban (Department) bạn đang thực tập và chỉ định rõ người quản lý trực tiếp (Supervisor).

### PHẦN 2: TỔNG QUAN VỀ DỰ ÁN
- `[ ]` **2.1 Bài toán của doanh nghiệp.**
  > *Viết gì:* Nêu thực trạng quản lý đang phải dùng email/Excel thủ công ra sao. Chỉ ra các "nỗi đau" (Pain points) như: mất thời gian tổng hợp, dễ sai sót dữ liệu tính toán.
- `[ ]` **2.2 Mục tiêu của sản phẩm phần mềm.**
  > *Viết gì:* Đặt ra đích đến nếu có phần mềm: Tính toán ngân sách tự động 100%, tạo ra không gian tập trung hóa dữ liệu an toàn.
- `[ ]` **2.3 Phạm vi dự án.**
  > *Viết gì:* Ghi rõ giới hạn của phần mềm chỉ hỗ trợ Module Nhân sự, Ngân sách và Dashboard. (Để giáo viên không bẻ sang bắt làm thêm chức năng Khách hàng hay Marketing).

### PHẦN 3: PHƯƠNG PHÁP LUẬN VÀ QUẢN TRỊ DỰ ÁN (AGILE/SCRUM)
- `[ ]` **3.1 Lựa chọn mô hình vận hành dự án.**
  > *Viết gì:* Giải thích ngắn gọn lý do vì sao dự án nội bộ này đòi hỏi sự linh hoạt thay đổi yêu cầu liên tục, nên công ty chốt chạy bằng Agile/Scrum thay vì Waterfall truyền thống.
- `[ ]` **3.2 Quản trị luồng công việc qua Product Backlog và Sprint Backlog.**
  > *Viết gì:* Chụp ảnh màn hình bảng Kanban hoặc Jira của dự án. Mô tả cách team chẻ yêu cầu thành các User Stories nhỏ đưa vào Backlog.
- `[ ]` **3.3 Quản trị tiến độ và các chu kỳ phát triển.**
  > *Viết gì:* Kể "nhật ký" của 1 Sprint mẫu. Team họp Planning ra sao, Daily gặp lỗi gì và Review sản phẩm demo cuối Sprint như thế nào.
- `[ ]` **3.4 Quản trị rủi ro và kiểm soát thay đổi yêu cầu.**
  > *Viết gì:* Kể 1 Case-study thực tế: Quản lý muốn thay đổi giao diện biểu đồ giữa chừng, team xử lý cập nhật lại Backlog ra sao để không vỡ kế hoạch.

### PHẦN 4: MÔ TẢ VÀ PHÂN TÍCH YÊU CẦU HỆ THỐNG
*(Lưu ý: Các thiết kế dưới đây là sản phẩm được làm ra trong quá trình chạy khối Agile bên trên)*
- `[ ]` **4.1 Xác định và phân loại người dùng (Actors).**
  > *Viết gì:* Liệt kê các quyền đăng nhập bảo mật (Ví dụ: Department Manager, HR Admin) và phân quyền ai được nhìn thấy dữ liệu nào.
- `[ ]` **4.2 Mô tả quy trình nghiệp vụ.**
  > *Viết gì:* Vẽ sơ đồ BPMN. Mô tả luồng các bước từ lúc có yêu cầu kiểm duyệt ngân sách đến lúc được Manager phê duyệt.
- `[ ]` **4.3 Mô tả Yêu cầu hệ thống:**
  - `[ ]` **4.3.1 Yêu cầu chức năng:**
    > *Viết gì:* Gạch đầu dòng danh sách các tính năng. (VD: Thêm/Sửa/Xóa User, Xem biểu đồ Pie-chart thống kê...).
  - `[ ]` **4.3.2 Yêu cầu phi chức năng:**
    > *Viết gì:* Tốc độ load < 3 giây, tuân thủ bộ tiêu chuẩn bảo mật của Bosch, UI/UX hiện đại.
- `[ ]` **4.4 Mô hình hóa hướng đối tượng (Dựa trên UML):**
  - `[ ]` **4.4.1 Biểu đồ Use Case:**
    > *Viết gì:* Vẽ 1 hình Use Case toàn hệ thống. Viết 2 bảng "Đặc tả Use Case" thật chi tiết (Step-by-step) cho 2 chức năng lớn nhất.
  - `[ ]` **4.4.2 Biểu đồ Hoạt động (Activity Diagram):**
    > *Viết gì:* Vẽ biểu đồ khối hộp, các rẽ nhánh If/Else thể hiện dòng chảy click chuột đi qua các màn hình và logic nghiệp vụ.
  - `[ ]` **4.4.3 Biểu đồ Tuần tự (Sequence Diagram):**
    > *Viết gì:* Vẽ sơ đồ tuần tự hệ thống (System) gọi API gửi Frontend - Backend - Database cho chức năng duyệt ngân sách phức tạp nhất.

### PHẦN 5: MÔ HÌNH HÓA DỮ LIỆU & THIẾT KẾ
- `[ ]` **5.1 Mô hình hóa Dữ liệu:**
  - `[ ]` **5.1.1 Biểu đồ Thực thể Liên kết (ERD):**
    > *Viết gì:* Hình vẽ các bảng dữ liệu (Employees, Budgets) kết nối với nhau bằng mối quan hệ 1-N.
  - `[ ]` **5.1.2 Thiết kế cơ sở dữ liệu quan hệ (Data Dictionary):**
    > *Viết gì:* Kẻ bảng Excel trình bày các trường dữ liệu tĩnh (Tên bảng, Cột, Primary Key, Kiểu dữ liệu INT/VARCHAR). 
- `[ ]` **5.2 Thiết kế Kiến trúc hệ thống:**
  > *Viết gì:* Vẽ cấu trúc 3 tầng (3-tier: Client - Server - Database). Liệt kê ngôn ngữ/framework: React, Java Spring, PostgreSQL.
- `[ ]` **5.3 Thiết kế Giao diện người dùng (UI/UX - Mockup):**
  > *Viết gì:* Chèn các ảnh chụp thiết kế trắng đen (Wireframe) hoặc file Figma màu thật sắc nét vào đây báo cáo.

### PHẦN 6: KẾT QUẢ ĐẠT ĐƯỢC VÀ TỔNG KẾT
- `[ ]` **6.1 Kết quả đạt được.**
  > *Viết gì:* Chụp lại các màn hình thể hiện các chức năng cốt lõi ĐÃ CHẠY ĐƯỢC thực tế trên code thật. Tóm tắt lại xem đã đáp ứng được bao nhiêu % Mục tiêu đề ra ở Phần 2.
- `[ ]` **6.2 Đánh giá sản phẩm và quy trình thực hiện:**
  - `[ ]` **6.2.1 Ưu điểm:** 
    > *Viết gì:* Khen ngợi tốc độ xử lý nhanh, logic tài chính khớp, quy trình Scrum tốt.
  - `[ ]` **6.2.2 Nhược điểm / Hạn chế:** 
    > *Viết gì:* Chỉ ra điểm yếu (VD: Mới thiết kế riêng bản PC, chưa đáp ứng giao diện trên Điện thoại mobile).
- `[ ]` **6.3 Hướng phát triển phần mềm trong tương lai.**
  > *Viết gì:* Đề xuất kế hoạch Phase 2: Áp dụng AI phân tích dự báo ngân sách, làm Native App truy cập từ xa.

### 📎 TÀI LIỆU THAM KHẢO & PHỤ LỤC (APPENDIX)
- `[ ]` **Danh mục Tài liệu tham khảo:** Trích dẫn các đầu sách, website về Agile hoặc công nghệ.
- `[ ]` **Phụ lục 1 - Liên kết hệ thống:** 
  > *Viết gì:* Cung cấp Link Web App thực tế, Link Source Code (Github/Gitlab), hoặc Link thư mục Video đính kèm (Lưu ý về quy định bảo mật mã nguồn của Bosch nếu có).
- `[ ]` **Phụ lục 2 - Biểu mẫu thực tập:** Các biểu mẫu ký duyệt của BGSV và Giảng viên.

---

## TIMELINE TRIỂN KHAI (ACTION PLAN)

| Giai đoạn | Tuần thực hiện | Mục tiêu công việc chính | Kết quả đầu ra |
| :--- | :---: | :--- | :--- |
| **Giai đoạn 1** | Tuần 1-2 | Khảo sát thông tin, xác định khuôn khổ Quản trị dự án | - Xong Content **Phần 1, 2 & 3** |
| **Giai đoạn 2** | Tuần 3-4 | Vẽ luồng nghiệp vụ BPMN, vẽ UML | - Xong Content **Phần 4** |
| **Giai đoạn 3** | Tuần 5-6 | Vẽ ERD, cấu trúc DB, thiết kế UI (Figma) | - Xong Content **Phần 5** |
| **Giai đoạn 4** | Tuần 7-8 | Hoàn thiện code, chụp Demo sản phẩm, chốt báo cáo | - Xong Content **Phần 6 & Phụ lục** |
