# Cẩm nang Hoạt động & Kiến trúc Tích hợp Database Dự án Bán Tour

Tài liệu này mô tả chi tiết luồng xử lý của hệ thống (Flow System) cùng với cách mà các thành phần cốt lõi của hệ thống Cơ sở dữ liệu (Database Objects: Trigger, Stored Procedure, Transaction, View) được áp dụng chặt chẽ vào mã nguồn Node.js/Express của dự án.

---

## 1. Luồng hoạt động tổng quan (Request & Data Flow)

Hệ thống hoạt động theo mô hình Monolith MVC với kiến trúc **"Database-Centric"** (Kiến trúc lấy Cơ sở dữ liệu làm trọng tâm). Business Logic phần lớn được đẩy xuống CSDL để đảm bảo tính nhất quán và bảo mật.

**Luồng đi của một tính năng (Ví dụ: Đặt Tour):**

1. **Frontend (Browser):** Người dùng bấm "Đặt Tour", Frontend sử dụng Vanilla JS gọi API `fetch POST /api/bookings`.
2. **Controller (`src/controllers/`):** Nhận request, lấy tham số và gọi đến tầng Service.
3. **Service (`src/services/`):** Xử lý hoặc kiểm tra logic nghiệp vụ cơ bản (VD: tính hợp lệ dữ liệu) rồi gọi tầng Model.
4. **Model (`src/models/`):** Chứa Data Access Logic. **ĐẶC BIỆT:** Model KHÔNG dùng Raw SQL `INSERT`, `UPDATE`, hay `DELETE` để thay đổi dữ liệu một cách trực tiếp.
   - Thay vào đó, Model tiến hành việc ghi dữ liệu bằng cách gọi: `CALL sp_CreateBooking(...)`.
   - Nếu để đọc dữ liệu báo cáo, nó thực hiện: `SELECT * FROM vw_...`.
5. **Database (MySQL):**
   - **Stored Procedure (SP)** tiếp nhận `CALL`.
   - SP bắt đầu một **Transaction**.
   - Các hành động trong quá trình chạy sẽ ngầm kích hoạt các **Trigger** (VD: Trigger check xem còn đủ vé không, Trigger lưu Audit Log).
   - SP tính toán xong sẽ `COMMIT` hoặc tự động `ROLLBACK` nếu Trigger báo lỗi.
6. Kết quả trả ngược về Model -> Service -> Controller -> Frontend (Hiển thị Toast / Chuyển hướng).

---

## 2. Chi tiết cách áp dụng các Database Objects vào dự án

Hệ thống xoay quanh 4 thành thần chính trong SQL để thực thi tính toàn vẹn và tối ưu hóa hệ thống Backend:

### 2.1. Views (Bảng ảo - Computed Read Models)

**Vai trò:** Giấu đi sự phức tạp của các câu `JOIN` lằng nhằng hoặc các hàm tổng hợp tính toán khối lượng lớn. Đóng vai trò là "Single source of truth" (Nguồn chân lý duy nhất) cho các tính năng xem báo cáo và danh sách động. 

**Cách áp dụng vào dự án:**
- Thay vì Express backend phải gọi nhiều bảng (như `Order` join với `BookedTour`) rồi tự Reduce/Map trong Array Node.js để tính tổng, hệ thống đã tạo sẵn view `vw_BookingDetails` để tự động tính `LineTotal`.
- Tính năng tính tỷ lệ lấp đầy được thiết lập bằng View `vw_TourOccupancy`. Backend khi hiển thị danh sách Tour ra trang chủ chỉ cần query `SELECT * FROM vw_TourOccupancy` để biết ngay Tour nào đang `Active` và còn trống bao nhiêu ghế.

### 2.2. Stored Procedures (Quy trình chuẩn hóa mọi thao tác Ghi/Đọc phức tạp)

**Vai trò:** Gom nhóm toàn bộ SQL Logic (Business logic cập nhật, xóa, thêm mới) tạo thành 1 API nội bộ dưới Database.

**Cách áp dụng vào dự án:**
- **100% các hành động Write** trong Model Node.js bắt buộc phải qua SP. 
- *Ví dụ ở `src/models/booking.model.js`:*
  ```javascript
  // Model backend chỉ cần gọi SP với tham số, mọi thứ để SP lo.
  const [rows] = await db.query('CALL sp_CreateBooking(?, ?, ?, ?, ?)', [userId, tourId, ...]);
  ```
- Việc gọi SP như `sp_SafeDeleteTour` hay `sp_CreateBooking` giúp API phía Backend cực ngắn, đồng thời ngăn chặn các lỗi bất đồng bộ do phải query nhiều lần từ code JS.

### 2.3. Transactions (Bảo toàn tính nguyên vẹn dữ liệu)

**Vai trò:** Đảm bảo nguyên lý Atomicity (Tất cả hoặc không gì cả), giữ dữ liệu không bị hỏng gãy (ví dụ: Tạo được Order nhưng lỗi BookedTour dẫn tới đơn hàng mồ côi).

**Cách áp dụng vào dự án:**
- Transactions được **nhúng mặc định** vào bên trong chính các Stored Procedures liên quan tới dữ liệu quan trọng, Frontend/Backend không cần gọi lệnh mở kết nối Transaction nào cả.
- *Cách thức bảo vệ:* Code SP (trong `Transaction.sql`) thiết lập bắt lỗi ngay trên đầu. 
  ```sql
  DECLARE EXIT HANDLER FOR SQLEXCEPTION 
  BEGIN 
    ROLLBACK; 
    RESIGNAL; 
  END;
  ```
- Nếu có đoạn code nào trong SP cập nhật bị vướng lỗi (Ví dụ: `BookedTour` không insert được vì hết chỗ do Trigger báo), `SQLEXCEPTION` sẽ được ném, Transaction tự động `ROLLBACK` và khôi phục những bước trước đó, hủy bỏ lệnh `INSERT` của `Order`.

### 2.4. Triggers (Phản hồi tự động, Validation ngầm & Ràng buộc)

**Vai trò:** Đóng vai trò là "Người gác cổng" hoạt động ngầm (Backend Node.js hoàn toàn không biết cấu trúc bên dưới của nó), bảo vệ dữ liệu ở mức độ database engine.

**Cách áp dụng vào dự án:**
1. **Kiểm tra nghiệp vụ ngầm (Slot Check):** 
   - Có 1 trigger `before_bookedtour_insert_check_slots`. Khi SP cố gắng chèn booking mới, Trigger này ngầm chạy. Nếu `Quantity` đăng ký lớn hơn lượng chỗ còn lại của Tour, trigger gọi `SIGNAL SQLSTATE '45000'` và chối bỏ lệnh Insert (từ đó kích hoạt Transaction Rollback ở SP).
2. **Chống Hard Delete (Bảo vệ dữ liệu cứng):**
   - Các Backend dev khi viết Query lỡ tay viết raw SQL: `DELETE FROM Tour WHERE TourID = 1`. Để chống lại điều này, dự án áp dụng soft delete (chỉ đổi thời gian DeletedAt).
   - Trigger `before_tour_delete_check_booking` hoặc `before_category_delete` lập tức báo lỗi đỏ chặn đứng mọi lệnh Hard Delete nếu tour này đang nằm ở các Booking chưa hoàn thành.
3. **Audit Logging (Bám vết tự động):**
   - Triggers `after_tour_insert`, `after_tour_update` được bắt vào các bảng quan trọng (như bám vào bảng Tour). Bất kỳ khi nào một Admin thao tác chỉnh sửa giá hay trạng thái, Trigger sẽ âm thầm tự động tạo lưu 1 log vào cấu trúc hệ thống bảng `AuditLog`.

---

## Tổng kết

Bằng việc kết hợp nhuần nhuyễn **View - Stored Procedure - Transaction - Trigger**, hệ thống Backend Node.js của dự án đã trở nên rất "mỏng" (Thin Controller / Thin Model), tốc độ xử lý nhanh, bảo mật cấu trúc gốc vững vàng và bất khả xâm phạm. Bất kỳ lỗi logic nghiệp vụ nào từ ứng dụng API cũng không thể chạm và làm vỡ tới hệ thống kho dữ liệu trung tâm này.
