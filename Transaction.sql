-- Dat tour
use dbms;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_CreateBooking $$
CREATE PROCEDURE sp_CreateBooking(
    IN p_UserID INT,
    IN p_TourID INT,
    IN p_Quantity INT,
    IN p_PaymentMethod VARCHAR(100),
    IN p_Note TEXT
)
BEGIN
    DECLARE v_Price DECIMAL(18,2);
    DECLARE v_OrderID INT;
    
    -- BỘ BẮT LỖI (Bí mật của Transaction nằm ở đây)
    -- Bất cứ khi nào có lỗi SQL hoặc lỗi do Trigger ném ra, khối này sẽ chạy.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK; -- Hủy toàn bộ thay đổi
        RESIGNAL; -- Ném lỗi ra màn hình để bạn/frontend biết
    END;

    -- BẮT ĐẦU TRANSACTION
    START TRANSACTION;

        -- 1. Lấy giá hiện tại của Tour
        SELECT CostPerPerson INTO v_Price FROM Tour WHERE TourID = p_TourID;

        -- 2. Tự động lấy OrderID tiếp theo (Vì bảng Order của bạn không có AUTO_INCREMENT)
        SELECT COALESCE(MAX(OrderID), 0) + 1 INTO v_OrderID FROM `Order` FOR UPDATE;
        
        -- 3. Tạo Hóa đơn tổng (Trạng thái 1: Pending)
        INSERT INTO `Order` (OrderID, PaymentMethod, OrderDate, OrderStatus, Note)
        VALUES (v_OrderID, p_PaymentMethod, NOW(), 1, p_Note);

        -- 4. Thêm chi tiết tour vào hóa đơn
        -- LƯU Ý: Khi chạy dòng này, Trigger "before_bookedtour_insert_check_slots" sẽ tự động chạy để ktra chỗ!
        INSERT INTO BookedTour (UserID, TourID, OrderID, Quantity, PriceAtBooking)
        VALUES (p_UserID, p_TourID, v_OrderID, p_Quantity, v_Price);

    -- NẾU MỌI THỨ SUÔN SẺ -> LƯU THAY ĐỔI
    COMMIT;
    
    -- Trả về thông báo thành công
    SELECT 'Đặt tour thành công!' AS Message, v_OrderID AS OrderID_Created;

END $$
DELIMITER ;

-- Cap nhat trang thai
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_UpdateOrderStatus $$
CREATE PROCEDURE sp_UpdateOrderStatus(
    IN p_OrderID INT,
    IN p_NewStatus INT,
    IN p_AdminID INT -- ID của Admin đang thao tác
)
BEGIN
    -- BỘ BẮT LỖI
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- 1. Cập nhật trạng thái đơn
        UPDATE `Order` 
        SET OrderStatus = p_NewStatus 
        WHERE OrderID = p_OrderID;

        -- 2. Ghi lại bằng chứng vào hệ thống Log
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (
            p_AdminID, 
            'UPDATE_ORDER_STATUS', 
            'Order', 
            p_OrderID, 
            CONCAT('Chuyển trạng thái đơn hàng thành: ', 
                CASE p_NewStatus 
                    WHEN 0 THEN 'Đã hủy' 
                    WHEN 1 THEN 'Chờ xử lý' 
                    WHEN 2 THEN 'Hoàn thành' 
                    ELSE 'Khác' 
                END
            )
        );

    COMMIT;
    
    SELECT 'Cập nhật trạng thái thành công!' AS Message;
END $$
DELIMITER ;

-- Huy Tour
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_CancelBooking $$
CREATE PROCEDURE sp_CancelBooking(
    IN p_OrderID INT,
    IN p_AdminID INT, -- Nếu là khách tự hủy, truyền NULL hoặc ID đại diện hệ thống
    IN p_Reason TEXT
)
BEGIN
    DECLARE v_CurrentStatus INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- Kiểm tra trạng thái đơn hiện tại
        SELECT OrderStatus INTO v_CurrentStatus FROM `Order` WHERE OrderID = p_OrderID FOR UPDATE;
        
        IF v_CurrentStatus = 2 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể hủy đơn hàng đã hoàn tất thanh toán!';
        END IF;

        -- Cập nhật đơn hàng
        UPDATE `Order` 
        SET OrderStatus = 0, Note = CONCAT(IFNULL(Note, ''), '\n[ĐÃ HỦY] Lý do: ', p_Reason)
        WHERE OrderID = p_OrderID;

        -- Ghi log
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (p_AdminID, 'CANCEL_ORDER', 'Order', p_OrderID, CONCAT('Hủy đơn hàng: ', p_Reason));

    COMMIT;
    SELECT 'Hủy đơn hàng thành công!' AS Message;
END $$
DELIMITER ;

-- Tao tour co anh
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_CreateTourWithImage $$
CREATE PROCEDURE sp_CreateTourWithImage(
    IN p_Title VARCHAR(255),
    IN p_Vehicle VARCHAR(100),
    IN p_DeparturePlace VARCHAR(255),
    IN p_Cost DECIMAL(18,2),
    IN p_MaxParticipants INT,
    IN p_CategoryID INT,
    IN p_ImageSource VARCHAR(255) -- Link ảnh
)
BEGIN
    DECLARE v_TourID INT;
    DECLARE v_ImageID INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- Lấy ID mới nhất cho Tour (Vì bạn không dùng AUTO_INCREMENT)
        SELECT COALESCE(MAX(TourID), 0) + 1 INTO v_TourID FROM Tour;
        
        -- 1. Tạo Tour
        INSERT INTO Tour (TourID, Title, Vehicle, DeparturePlace, CostPerPerson, MaxParticipants, CategoryID, TourStatus)
        VALUES (v_TourID, p_Title, p_Vehicle, p_DeparturePlace, p_Cost, p_MaxParticipants, p_CategoryID, 1);

        -- Lấy ID mới nhất cho Image
        SELECT COALESCE(MAX(ImageID), 0) + 1 INTO v_ImageID FROM Tour_Image;

        -- 2. Tạo Ảnh liên kết với Tour vừa tạo
        INSERT INTO Tour_Image (ImageID, Source, TourID)
        VALUES (v_ImageID, p_ImageSource, v_TourID);

    COMMIT;
    SELECT 'Tạo Tour và Hình ảnh thành công!' AS Message, v_TourID AS NewTourID;
END $$
DELIMITER ;

-- Xoa Tour an toan
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_SafeDeleteTour $$
CREATE PROCEDURE sp_SafeDeleteTour(
    IN p_TourID INT,
    IN p_AdminID INT
)
BEGIN
    DECLARE v_TourTitle VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
        
        -- Lấy tên Tour để ghi log trước khi xóa
        SELECT Title INTO v_TourTitle FROM Tour WHERE TourID = p_TourID;

        -- 1. Xóa các hình ảnh phụ thuộc trước (Tránh lỗi Foreign Key)
        DELETE FROM Tour_Image WHERE TourID = p_TourID;

        -- 2. Xóa Tour (Lưu ý: Trigger before_tour_delete_check_booking sẽ tự chặn nếu tour đang có đơn hàng)
        DELETE FROM Tour WHERE TourID = p_TourID;

        -- 3. Ghi Log
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (p_AdminID, 'SAFE_DELETE', 'Tour', p_TourID, CONCAT('Đã xóa an toàn tour: ', IFNULL(v_TourTitle, '')));

    COMMIT;
    SELECT 'Xóa Tour an toàn thành công!' AS Message;
END $$
DELIMITER ;

-- Tao admin co quyen 
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_CreateAdminWithRole $$
CREATE PROCEDURE sp_CreateAdminWithRole(
    IN p_FullName VARCHAR(255),
    IN p_Email VARCHAR(100),
    IN p_Password VARCHAR(255),
    IN p_RoleID INT
)
BEGIN
    DECLARE v_AdminID INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        SELECT COALESCE(MAX(AdminID), 0) + 1 INTO v_AdminID FROM Admin;

        -- 1. Tạo tài khoản Admin
        INSERT INTO Admin (AdminID, FullName, Email, Password, Status)
        VALUES (v_AdminID, p_FullName, p_Email, p_Password, 1);

        -- 2. Gán Role
        INSERT INTO AdminRoles (AdminID, RoleID)
        VALUES (v_AdminID, p_RoleID);

    COMMIT;
    SELECT 'Tạo tài khoản và cấp quyền thành công!' AS Message, v_AdminID AS NewAdminID;
END $$
DELIMITER ;

-- Uu dai
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_ApplyCategoryDiscount $$
CREATE PROCEDURE sp_ApplyCategoryDiscount(
    IN p_CategoryID INT,
    IN p_DiscountPercent DECIMAL(5,2), -- Ví dụ truyền 10.00 cho 10%
    IN p_AdminID INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- 1. Cập nhật giá (Giảm theo % truyền vào)
        UPDATE Tour 
        SET CostPerPerson = CostPerPerson * (1 - p_DiscountPercent / 100)
        WHERE CategoryID = p_CategoryID;

        -- 2. Ghi Log hành động
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (p_AdminID, 'BULK_DISCOUNT', 'Category', p_CategoryID, CONCAT('Giảm giá ', p_DiscountPercent, '% cho toàn bộ Tour trong danh mục ', p_CategoryID));

    COMMIT;
    SELECT 'Áp dụng giảm giá hàng loạt thành công!' AS Message;
END $$
DELIMITER ;

-- Gop cac danh muc
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_MergeCategories $$
CREATE PROCEDURE sp_MergeCategories(
    IN p_OldCategoryID INT,
    IN p_NewCategoryID INT,
    IN p_AdminID INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- 1. Đổi toàn bộ Tour sang danh mục mới
        UPDATE Tour 
        SET CategoryID = p_NewCategoryID 
        WHERE CategoryID = p_OldCategoryID;

        -- 2. Xóa danh mục cũ (Bây giờ đã trống nên Trigger không chặn nữa)
        DELETE FROM Category WHERE CategoryID = p_OldCategoryID;

        -- 3. Ghi Log
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (p_AdminID, 'MERGE_CATEGORY', 'Category', p_OldCategoryID, CONCAT('Đã chuyển tour và xóa danh mục ID: ', p_OldCategoryID, ' sang ID: ', p_NewCategoryID));

    COMMIT;
    SELECT 'Gộp danh mục thành công!' AS Message;
END $$
DELIMITER ;