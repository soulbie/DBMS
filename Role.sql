-- Tạo Role (nếu bạn đã tạo rồi thì có thể bỏ qua bước này)
CREATE ROLE IF NOT EXISTS 'role_super_admin', 'role_tour_manager', 'role_sale', 'role_support';

-- 2. Gán quyền chi tiết cho từng Role
-- 	1. Super Admin: Toàn quyền
GRANT ALL PRIVILEGES ON dbmss.* TO 'role_super_admin';

-- 	2. Tour Manager: Quản lý nội dung Tour và Danh mục
GRANT SELECT, INSERT, UPDATE, DELETE ON dbmss.tour TO 'role_tour_manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON dbmss.tour_image TO 'role_tour_manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON dbmss.category TO 'role_tour_manager';
GRANT SELECT ON dbmss.bookedtour TO 'role_tour_manager';

-- 	3. Sale: Tập trung vào khách hàng và đơn hàng
GRANT SELECT ON dbmss.tour TO 'role_sale';
GRANT SELECT ON dbmss.tour_image TO 'role_sale';
GRANT SELECT, INSERT, UPDATE ON dbmss.`order` TO 'role_sale';
GRANT SELECT, INSERT, UPDATE ON dbmss.bookedtour TO 'role_sale';
GRANT SELECT, INSERT, UPDATE ON dbmss.user TO 'role_sale';

-- 	4. Support: Chỉ xem để hỗ trợ, không sửa dữ liệu cốt lõi
GRANT SELECT ON dbmss.tour TO 'role_support';
GRANT SELECT ON dbmss.`order` TO 'role_support';
GRANT SELECT ON dbmss.user TO 'role_support';
GRANT INSERT ON dbmss.auditlog TO 'role_support'; -- Cho phép ghi log hỗ trợ

-- Gán quyền cho Trần Văn Super
GRANT 'role_super_admin' TO 'super@sys.com'@'%';

-- Gán quyền cho Lê Thị Tour
GRANT 'role_tour_manager' TO 'tour@sys.com'@'%';

-- Gán quyền cho Phạm Văn Sale
GRANT 'role_sale' TO 'sale@sys.com'@'%';

-- Gán quyền cho Nguyễn Support
GRANT 'role_support' TO 'support@sys.com'@'%';

-- Kích hoạt quyền ngay lập tức
SET DEFAULT ROLE ALL TO 
'super@sys.com'@'%', 
'tour@sys.com'@'%', 
'sale@sys.com'@'%', 
'support@sys.com'@'%';