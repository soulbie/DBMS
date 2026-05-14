-- Tạo các tài khoản với mật khẩu tạm thời (hãy đổi 'password123' thành mật khẩu thực của bạn)
CREATE USER IF NOT EXISTS 'super@sys.com'@'%' IDENTIFIED BY 'password123';
CREATE USER IF NOT EXISTS 'tour@sys.com'@'%' IDENTIFIED BY 'password123';
CREATE USER IF NOT EXISTS 'sale@sys.com'@'%' IDENTIFIED BY 'password123';
CREATE USER IF NOT EXISTS 'support@sys.com'@'%' IDENTIFIED BY 'password123';

-- 1. Đảm bảo sử dụng đúng database
USE dbms;

-- 2. Tạo Role
CREATE ROLE IF NOT EXISTS 'role_super_admin', 'role_tour_manager', 'role_sale', 'role_support';

-- 3. Gán quyền chi tiết (Đã sửa tên DB và thêm ngoặc huyền cho `order`)
GRANT ALL PRIVILEGES ON dbms.* TO 'role_super_admin';

GRANT SELECT, INSERT, UPDATE, DELETE ON dbms.tour TO 'role_tour_manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON dbms.tour_image TO 'role_tour_manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON dbms.category TO 'role_tour_manager';
GRANT SELECT ON dbms.bookedtour TO 'role_tour_manager';

GRANT SELECT ON dbms.tour TO 'role_sale';
GRANT SELECT ON dbms.tour_image TO 'role_sale';
GRANT SELECT, INSERT, UPDATE ON dbms.`order` TO 'role_sale';
GRANT SELECT, INSERT, UPDATE ON dbms.bookedtour TO 'role_sale';
GRANT SELECT, INSERT, UPDATE ON dbms.user TO 'role_sale';

GRANT SELECT ON dbms.tour TO 'role_support';
GRANT SELECT ON dbms.`order` TO 'role_support';
GRANT SELECT ON dbms.user TO 'role_support';
GRANT INSERT ON dbms.auditlog TO 'role_support';

-- 4. Gán Role cho từng User (Đảm bảo các User này đã được CREATE USER trước đó)
GRANT 'role_super_admin' TO 'super@sys.com'@'%';
GRANT 'role_tour_manager' TO 'tour@sys.com'@'%';
GRANT 'role_sale' TO 'sale@sys.com'@'%';
GRANT 'role_support' TO 'support@sys.com'@'%';

-- 5. Thiết lập Role mặc định (Đã xóa ký tự lạ, viết liền mạch)
SET DEFAULT ROLE ALL TO 'super@sys.com'@'%', 'tour@sys.com'@'%', 'sale@sys.com'@'%', 'support@sys.com'@'%';

-- 6. Cập nhật thay đổi
FLUSH PRIVILEGES;