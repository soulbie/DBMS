# Skyline Tours — Hệ thống Đặt Tour Du lịch

> Ứng dụng web đặt tour du lịch full-stack được xây dựng bằng **Node.js / Express** và kiến trúc **"Database-Centric"** với MySQL, minh họa việc áp dụng thực tế của View, Stored Procedure, Transaction, Trigger và Event trong một hệ thống thương mại.

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3. [Cấu trúc dự án](#3-cấu-trúc-dự-án)
4. [Kiến trúc cơ sở dữ liệu](#4-kiến-trúc-cơ-sở-dữ-liệu)
5. [Luồng hoạt động hệ thống](#5-luồng-hoạt-động-hệ-thống)
6. [Các thành phần Database Object](#6-các-thành-phần-database-object)
   - [Views (Bảng ảo)](#61-views-bảng-ảo)
   - [Stored Procedures (Thủ tục lưu trữ)](#62-stored-procedures-thủ-tục-lưu-trữ)
   - [Transactions (Giao dịch nguyên tử)](#63-transactions-giao-dịch-nguyên-tử)
   - [Triggers (Bộ kích hoạt tự động)](#64-triggers-bộ-kích-hoạt-tự-động)
   - [Events (Sự kiện định kỳ)](#65-events-sự-kiện-định-kỳ)
7. [Danh mục API](#7-danh-mục-api)
8. [Hướng dẫn cài đặt](#8-hướng-dẫn-cài-đặt)

---

## 1. Tổng quan dự án

**Skyline Tours** là nền tảng đặt tour du lịch thương mại cho phép khách hàng duyệt, lọc và đặt các gói du lịch trực tuyến, đồng thời cung cấp cho quản trị viên một bảng điều khiển đầy đủ để phân tích dữ liệu, quản lý đơn hàng và giám sát hệ thống.

Dự án áp dụng triết lý kiến trúc **"Database-Centric"** — toàn bộ logic nghiệp vụ quan trọng (thao tác ghi, kiểm tra hợp lệ, đảm bảo tính toàn vẹn) được xử lý trực tiếp trong MySQL thông qua Stored Procedure và Trigger, giữ cho tầng Node.js mỏng nhẹ, nhanh và an toàn.

---

## 2. Công nghệ sử dụng

| Tầng | Công nghệ |
|---|---|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Cơ sở dữ liệu** | MySQL 8.0 (InnoDB) |
| **Frontend** | Vanilla HTML / CSS / JavaScript |
| **Truy vấn CSDL** | Raw SQL thông qua `mysql2` — không dùng ORM |
| **Kiến trúc** | Monolith MVC — Database-Centric |

---

## 3. Cấu trúc dự án

```
/
├── src/
│   ├── app.js                  # Cấu hình Express & middleware
│   ├── server.js               # Điểm khởi động HTTP server
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── controllers/            # Xử lý request (tầng mỏng)
│   ├── services/               # Logic nghiệp vụ & kiểm tra dữ liệu
│   ├── models/                 # Truy cập dữ liệu (gọi SP & View)
│   ├── routes/                 # Định nghĩa route Express
│   └── utils/                  # Tiện ích: response, logger, errors
│
├── views/
│   └── pages/
│       ├── home.html           # Trang danh sách tour cho khách hàng
│       └── admin/
│           └── dashboard.html  # Bảng điều khiển quản trị (Command Center)
│
├── public/
│   ├── css/                    # Stylesheet
│   └── js/                     # Script frontend
│
├── table.sql                   # Lược đồ cơ sở dữ liệu (DDL)
├── view.sql                    # Định nghĩa các View
├── trigger.sql                 # Định nghĩa các Trigger
├── SP.sql                      # Stored Procedure phân tích dữ liệu
├── Transaction.sql             # Stored Procedure giao dịch
├── Event.sql                   # Event định kỳ (production — 24 giờ)
├── Event_test.sql              # Event kiểm thử (1 phút)
├── Event_restore.sql           # Khôi phục Event production sau khi test
└── .env                        # Biến môi trường
```

---

## 4. Kiến trúc cơ sở dữ liệu

Schema được tổ chức xung quanh ba miền tính năng chính:

| Miền tính năng | Các bảng liên quan |
|---|---|
| **Danh mục Tour** | `Tour`, `Tour_Image`, `Category` |
| **Quản lý Đặt hàng** | `BookedTour`, `Order` |
| **Phân quyền Quản trị** | `Admin`, `Role`, `AdminRoles`, `Permission`, `RolePermission`, `AuditLog` |
| **Khách hàng** | `User` |

**Chiến lược khóa chính:** Tất cả PK được quản lý thủ công bằng `INT` thông qua pattern `SELECT COALESCE(MAX(ID), 0) + 1 FROM Table FOR UPDATE` bên trong transaction (ngoại trừ `AuditLog.LogID` dùng `AUTO_INCREMENT`).

**Quy ước mã trạng thái:**

| Thực thể | Cột | Giá trị |
|---|---|---|
| `Order` | `OrderStatus` | `0` = Đã hủy, `1` = Chờ xử lý, `2` = Hoàn thành |
| `Tour` | `TourStatus` | `0` = Ẩn, `1` = Đang bán |
| `Category` | `CategoryStatus` | `0` = Ẩn, `1` = Đang hoạt động |

---

## 5. Luồng hoạt động hệ thống

Hệ thống tuân thủ kiến trúc phân tầng chặt chẽ. Dưới đây là toàn bộ vòng đời của một yêu cầu **"Đặt Tour"**:

```
Trình duyệt (Vanilla JS)
  │  POST /api/bookings  { tourId, quantity, paymentMethod }
  ▼
Route → Controller
  │  Lấy tham số, gọi Service
  ▼
Tầng Service
  │  Kiểm tra tour tồn tại & còn chỗ (truy vấn Model)
  ▼
Tầng Model
  │  CALL sp_CreateBooking(userId, tourId, qty, method, note)
  ▼
MySQL — Stored Procedure (sp_CreateBooking)
  │  START TRANSACTION
  │    1. Lấy giá hiện tại: SELECT CostPerPerson FROM Tour
  │    2. Tạo OrderID mới
  │    3. INSERT INTO `Order`
  │    4. INSERT INTO BookedTour ──► Trigger: before_bookedtour_insert_check_slots
  │                                  (tự động chặn nếu không đủ chỗ)
  │  COMMIT  (hoặc ROLLBACK nếu có lỗi bất kỳ)
  │  SELECT 'Đặt tour thành công!', v_OrderID AS OrderID_Created
  ▼
Phản hồi ngược về: Model → Service → Controller → Frontend (Toast thông báo)
```

---

## 6. Các thành phần Database Object

### 6.1 Views (Bảng ảo)

**Vai trò:** View đóng vai trò là **nguồn chân lý duy nhất** cho các thao tác đọc dữ liệu. View che giấu sự phức tạp của các câu `JOIN` nhiều bảng và các hàm tổng hợp, giúp tầng Node.js không cần tự xử lý logic đó trong code JavaScript.

| View | Mục đích | Được dùng bởi |
|---|---|---|
| `vw_TourCatalogue` | Tour đang bán kèm số ghế còn lại | Trang chủ khách hàng |
| `vw_TourOccupancy` | Tỷ lệ lấp đầy từng tour | SP phân tích tồn kho, Catalog |
| `vw_BookingDetails` | Đơn hàng join chi tiết đặt, tính `LineTotal` | SP doanh thu, Bảng quản lý đơn |
| `vw_CustomerStats` | Tổng đơn & chi tiêu mỗi khách | SP VIP & Tỷ lệ quay lại |
| `vw_UserDemographics` | Phân nhóm độ tuổi khách hàng | SP nhân khẩu học |
| `vw_AdminAccessControl` | Admin → Vai trò → Quyền hạn (phẳng hóa) | Trang quản lý Admin |

**Ví dụ sử dụng trong Node.js:**
```javascript
// tour.model.js — đọc từ View thay vì JOIN nhiều bảng thủ công
const [rows] = await db.query(`
  SELECT * FROM vw_TourCatalogue WHERE RemainingSeats > 0
`);
```

---

### 6.2 Stored Procedures (Thủ tục lưu trữ)

**Toàn bộ thao tác ghi** trong dự án đều bắt buộc phải đi qua Stored Procedure. Tầng Model Node.js **không bao giờ** thực thi trực tiếp câu `INSERT`, `UPDATE`, hay `DELETE` thô — đảm bảo mọi quy tắc nghiệp vụ luôn được áp dụng nhất quán tại tầng CSDL.

#### Nhóm Phân tích (`SP.sql`) — 10 Stored Procedure

| Stored Procedure | Mô tả |
|---|---|
| `sp_GetRevenueByDateRange` | Doanh thu theo ngày trong khoảng thời gian |
| `sp_GetRevenueByCategory` | Doanh thu phân tích theo danh mục tour |
| `sp_RevenueActualVsExpected` | So sánh doanh thu thực tế vs. kỳ vọng vs. đã mất |
| `sp_GetTopBestSellingToursByMonth` | Top N tour bán chạy nhất trong tháng |
| `sp_GetTourOccupancyByName` | Tỷ lệ lấp đầy theo tên tour |
| `sp_TopCancelledTours` | Top N tour bị hủy nhiều nhất |
| `sp_HighInventoryTours` | Tour ế — chiếm <30% chỗ trong N ngày tới |
| `GetTopVIPCustomers` | Top khách VIP theo chi tiêu hoặc số đơn |
| `GetCustomerDemographicStats` | Thống kê khách theo nhóm tuổi hoặc địa điểm |
| `GetCustomerRetentionRate` | Tỷ lệ khách quay lại vs. khách một lần |

#### Nhóm Giao dịch (`Transaction.sql`) — 8 Stored Procedure

| Stored Procedure | Mô tả |
|---|---|
| `sp_CreateBooking` | Tạo `Order` + `BookedTour`; kích hoạt kiểm tra slot |
| `sp_UpdateOrderStatus` | Cập nhật trạng thái đơn + ghi AuditLog |
| `sp_CancelBooking` | Hủy đơn (`OrderStatus = 0`); chặn nếu đã hoàn thành |
| `sp_CreateTourWithImage` | Tạo tour + hình ảnh trong một transaction |
| `sp_SafeDeleteTour` | Xóa ảnh trước rồi xóa tour; Trigger chặn nếu còn đơn pending |
| `sp_CreateAdminWithRole` | Tạo tài khoản Admin + gán vai trò nguyên tử |
| `sp_ApplyCategoryDiscount` | Giảm giá hàng loạt theo % cho toàn bộ tour trong danh mục |
| `sp_MergeCategories` | Gộp danh mục: chuyển tất cả tour sang danh mục mới |

---

### 6.3 Transactions (Giao dịch nguyên tử)

**Vai trò:** Đảm bảo nguyên lý **Atomicity** — "tất cả hoặc không có gì". Ngăn ngừa tình trạng dữ liệu bị gãy giữa chừng (ví dụ: tạo được `Order` nhưng `BookedTour` lỗi → đơn hàng mồ côi không có chi tiết).

Mọi Stored Procedure ghi dữ liệu đều sử dụng mẫu bắt lỗi tự động:

```sql
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    ROLLBACK;   -- Hoàn tác toàn bộ thay đổi trong transaction này
    RESIGNAL;   -- Ném lỗi ra ngoài để frontend nhận được thông báo lỗi
END;

START TRANSACTION;
  -- ... các thao tác ghi ...
COMMIT;
```

**Ví dụ thực tế:** Khi `sp_CreateBooking` chạy và Trigger kiểm tra slot phát hiện không đủ chỗ, nó ném `SIGNAL SQLSTATE '45000'`. `SQLEXCEPTION` được kích hoạt → `ROLLBACK` tự động hủy bỏ lệnh `INSERT INTO Order` đã chạy trước đó → không để lại đơn hàng mồ côi nào trong CSDL.

---

### 6.4 Triggers (Bộ kích hoạt tự động)

**Vai trò:** Hoạt động như những **"người gác cổng vô hình"** — tự động kích hoạt khi có sự kiện DML xảy ra mà tầng ứng dụng không cần biết đến sự tồn tại của chúng. Bảo vệ toàn vẹn dữ liệu ở mức engine CSDL.

| Trigger | Sự kiện | Hành vi |
|---|---|---|
| `before_bookedtour_insert_check_slots` | `BEFORE INSERT` trên `BookedTour` | **Chặn** insert nếu số lượng vượt quá chỗ còn lại |
| `before_bookedtour_update_protected` | `BEFORE UPDATE` trên `BookedTour` | **Chặn** sửa chi tiết đơn đã hoàn thành |
| `before_tour_delete_check_booking` | `BEFORE DELETE` trên `Tour` | **Chặn** hard delete — dùng `sp_SafeDeleteTour` |
| `before_category_delete` | `BEFORE DELETE` trên `Category` | **Chặn** hard delete danh mục |
| `before_user_delete` | `BEFORE DELETE` trên `User` | **Chặn** hard delete tài khoản khách |
| `after_tour_insert` | `AFTER INSERT` trên `Tour` | Tự động ghi AuditLog khi tạo tour mới |
| `after_tour_update` | `AFTER UPDATE` trên `Tour` | Ghi log thay đổi tên, giá hoặc trạng thái tour |
| `after_tour_delete` | `AFTER DELETE` trên `Tour` | Tự động ghi AuditLog khi xóa tour |
| `after_category_status_update` | `AFTER UPDATE` trên `Category` | Cascade thay đổi trạng thái xuống toàn bộ tour con |
| `after_category_parent_status_update` | `AFTER UPDATE` trên `Category` | Cascade trạng thái xuống danh mục con |

---

### 6.5 Events (Sự kiện định kỳ)

**Vai trò:** MySQL Events cung cấp khả năng **tự động hóa nền** theo lịch trình định sẵn, thay thế hoàn toàn cho cron job hoặc scheduler bên ngoài.

| Event | Tần suất | Hành động |
|---|---|---|
| `evt_CancelUnpaidOrders` | Mỗi 1 giờ | Hủy tất cả đơn hàng `Pending` quá 24 giờ chưa thanh toán, ghi AuditLog |
| `evt_CancelUnpaidOrders_TEST` | Mỗi 30 giây | Phiên bản kiểm thử — hủy đơn quá **1 phút** |

**Kích hoạt bộ lập lịch MySQL:**
```sql
SET GLOBAL event_scheduler = ON;
-- Kiểm tra trạng thái:
SHOW VARIABLES LIKE 'event_scheduler';
```

**Quy trình kiểm thử & khôi phục:**
```powershell
# Chạy event kiểm thử (hủy sau 1 phút)
Get-Content Event_test.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p DBMS

# Khôi phục event production (hủy sau 24 giờ) sau khi test xong
Get-Content Event_restore.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p DBMS
```

---

## 7. Danh mục API

### Xác thực
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập khách hàng |
| `POST` | `/api/auth/register` | Đăng ký tài khoản khách hàng |
| `POST` | `/api/auth/admin-login` | Đăng nhập cổng quản trị |

### Tour
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/tours` | Danh sách tour đang bán (qua `vw_TourCatalogue`) |
| `POST` | `/api/tours` | Tạo tour + hình ảnh (`sp_CreateTourWithImage`) |
| `DELETE` | `/api/tours/:id` | Xóa tour an toàn (`sp_SafeDeleteTour`) |

### Đặt hàng & Đơn hàng
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/bookings` | Tạo đặt tour (`sp_CreateBooking`) |
| `GET` | `/api/bookings/orders` | Danh sách 20 đơn hàng mới nhất |
| `PATCH` | `/api/bookings/:id/status` | Cập nhật trạng thái đơn (`sp_UpdateOrderStatus`) |
| `PATCH` | `/api/bookings/:id/cancel` | Hủy đơn hàng (`sp_CancelBooking`) |

### Danh mục
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/categories` | Danh sách danh mục đang hoạt động |
| `PATCH` | `/api/categories/:id/discount` | Giảm giá hàng loạt (`sp_ApplyCategoryDiscount`) |
| `POST` | `/api/categories/merge` | Gộp danh mục (`sp_MergeCategories`) |

### Quản trị viên
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/list` | Danh sách 10 Admin mới nhất (qua `vw_AdminAccessControl`) |
| `POST` | `/api/admin/create-admin-role` | Tạo Admin với vai trò (`sp_CreateAdminWithRole`) |
| `GET` | `/api/admin/audit-logs` | Xem nhật ký hệ thống |

### Phân tích (10 Stored Procedure)
| Phương thức | Endpoint | Stored Procedure |
|---|---|---|
| `GET` | `/api/analytics/revenue` | `sp_GetRevenueByDateRange` |
| `GET` | `/api/analytics/revenue/category` | `sp_GetRevenueByCategory` |
| `GET` | `/api/analytics/revenue/actual-vs-expected` | `sp_RevenueActualVsExpected` |
| `GET` | `/api/analytics/tours/best-selling` | `sp_GetTopBestSellingToursByMonth` |
| `GET` | `/api/analytics/tours/occupancy` | `sp_GetTourOccupancyByName` |
| `GET` | `/api/analytics/tours/cancelled` | `sp_TopCancelledTours` |
| `GET` | `/api/analytics/tours/high-inventory` | `sp_HighInventoryTours` |
| `GET` | `/api/analytics/customers/vip` | `GetTopVIPCustomers` |
| `GET` | `/api/analytics/customers/demographics` | `GetCustomerDemographicStats` |
| `GET` | `/api/analytics/customers/retention` | `GetCustomerRetentionRate` |

---

## 8. Hướng dẫn cài đặt

### Yêu cầu hệ thống

- Node.js v18 trở lên
- MySQL 8.0

### Các bước thiết lập

**1. Cài đặt các dependency:**
```bash
npm install
```

**2. Cấu hình biến môi trường:**
```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin kết nối database của bạn
```

Nội dung file `.env`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=DBMS
```

**3. Khởi tạo cơ sở dữ liệu (chạy theo thứ tự):**
```sql
-- Trong MySQL Workbench hoặc CLI:
source table.sql         -- Tạo các bảng
source view.sql          -- Tạo các View
source trigger.sql       -- Tạo các Trigger
source SP.sql            -- Tạo SP phân tích
source Transaction.sql   -- Tạo SP giao dịch
source Event.sql         -- Tạo Event định kỳ
```

**4. Khởi động server:**
```bash
npm start
```

**5. Truy cập ứng dụng:**
- Trang khách hàng: [http://localhost:3000](http://localhost:3000)
- Bảng điều khiển Admin: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)

---

> **Lưu ý:** Bảng điều khiển Admin yêu cầu thông tin đăng nhập hợp lệ đã có trong bảng `Admin`. Sử dụng `sp_CreateAdminWithRole` hoặc chèn bản ghi seed trực tiếp để tạo tài khoản Admin đầu tiên.
