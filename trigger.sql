-- Trigger for audit log

SET @current_admin_id = 1;
DELIMITER $$

-- 1. Tour
-- 1.1 Trigger cho hành động INSERT
DROP TRIGGER IF EXISTS after_tour_insert $$
CREATE TRIGGER after_tour_insert
AFTER INSERT ON tour 
FOR EACH ROW
BEGIN 
	INSERT INTO auditlog(AdminID, Action, TargetTable, TargetID, Details)
    VALUES (@current_admin_id, 'INSERT', 'tour', NEW.TourID, CONCAT('Thêm mới tour: ', NEW.Title));
END $$

-- 1.2 Trigger cho hành động INSERT
DROP TRIGGER IF EXISTS after_tour_update $$
CREATE TRIGGER after_tour_update
AFTER UPDATE ON tour
FOR EACH ROW
BEGIN
	IF (OLD.Title <> NEW.Title OR OLD.CostPerPerson <> NEW.CostPerPerson OR OLD.TourStatus <> NEW.TourStatus) THEN
        INSERT INTO AuditLog (Action, TargetTable, TargetID, Details)
        VALUES (
            'UPDATE', 
            'Tour', 
            NEW.TourID, 
            CONCAT(
                'Thay đổi: ',
                IF(OLD.Title <> NEW.Title, CONCAT('Tiêu đề [', OLD.Title, ' -> ', NEW.Title, '] '), ''),
                IF(OLD.CostPerPerson <> NEW.CostPerPerson, CONCAT('Giá [', OLD.CostPerPerson, ' -> ', NEW.CostPerPerson, '] '), ''),
                IF(OLD.TourStatus <> NEW.TourStatus, CONCAT('Trạng thái [', OLD.TourStatus, ' -> ', NEW.TourStatus, '] '), '')
            )
        );
    END IF;
END$$

-- 1.3 Trigger cho hành động DELETE
DROP TRIGGER IF EXISTS after_tour_delete $$
CREATE TRIGGER after_tour_delete
AFTER DELETE ON Tour
FOR EACH ROW
BEGIN
    INSERT INTO AuditLog (Action, TargetTable, TargetID, Details)
    VALUES (
        'DELETE', 
        'Tour', 
        OLD.TourID, 
        CONCAT('Xóa tour: ', OLD.Title, ' (ID: ', OLD.TourID, ')')
    );
END$$

-- 1.4 Ngăn chặn xóa tour khi có đơn hàng 
DROP TRIGGER IF EXISTS before_tour_delete_check_booking $$
CREATE TRIGGER before_tour_delete_check_booking
BEFORE DELETE ON Tour
FOR EACH ROW
BEGIN
    DECLARE booking_count INT;
    SELECT COUNT(*) INTO booking_count FROM BookedTour WHERE TourID = OLD.TourID;
    
    IF booking_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Không thể xóa Tour này vì đang có khách hàng đặt chỗ!';
    END IF;
END $$


-- 2. Trigger cho Category
-- 2.1 Khi thay đổi trạng thái danh mục thì tự đọng cập nhật trạng thái của các tour trong danh mục đấy
DROP TRIGGER IF EXISTS after_category_status_update $$
CREATE TRIGGER after_category_status_update
AFTER UPDATE ON Category
FOR EACH ROW
BEGIN
    -- Trường hợp 1: Nếu Danh mục chuyển sang "Tạm dừng" (0)
    IF (OLD.CategoryStatus <> NEW.CategoryStatus AND NEW.CategoryStatus = 0) THEN
        UPDATE Tour 
        SET TourStatus = 0 
        WHERE CategoryID = NEW.CategoryID;

        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (@current_admin_id, 'SYSTEM_HIDDEN', 'Tour', NULL, 
                CONCAT('Tự động ẨN các tour do danh mục [', NEW.Name, '] tạm dừng.'));

    -- Trường hợp 2: Nếu Danh mục chuyển sang "Hoạt động" (1)
    ELSEIF (OLD.CategoryStatus <> NEW.CategoryStatus AND NEW.CategoryStatus = 1) THEN
        UPDATE Tour 
        SET TourStatus = 1 
        WHERE CategoryID = NEW.CategoryID;

        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (@current_admin_id, 'SYSTEM_SHOW', 'Tour', NULL, 
                CONCAT('Tự động MỞ lại các tour do danh mục [', NEW.Name, '] hoạt động trở lại.'));
    END IF;
END $$


-- 2.2 Ngăn chặn xóa danh mục khi có tour 
DROP TRIGGER IF EXISTS before_category_delete $$
CREATE TRIGGER before_category_delete
BEFORE DELETE ON Category
FOR EACH ROW
BEGIN
    DECLARE tour_count INT;
    
    -- Kiểm tra số lượng tour thuộc danh mục này
    SELECT COUNT(*) INTO tour_count FROM Tour WHERE CategoryID = OLD.CategoryID;
    
    IF tour_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Không thể xóa: Danh mục này đang chứa tour. Hãy xóa hoặc chuyển tour sang danh mục khác trước!';
    END IF;
END $$

-- 2.3 Đồng bộ hóa trạng thái cha - con 
DROP TRIGGER IF EXISTS after_category_parent_status_update $$
CREATE TRIGGER after_category_parent_status_update
AFTER UPDATE ON Category
FOR EACH ROW
BEGIN
    -- Nếu trạng thái thay đổi từ Hoạt động -> Ẩn
    IF OLD.CategoryStatus = 1 AND NEW.CategoryStatus = 0 THEN
        UPDATE Category 
        SET CategoryStatus = 0 
        WHERE ParentID = NEW.CategoryID;
    END IF;
END $$


-- 3. Trigger cho BookedTour 
-- 3.1 Kiểm tra số lượng chỗ còn trống
CREATE TRIGGER before_bookedtour_insert_check_slots
BEFORE INSERT ON BookedTour
FOR EACH ROW
BEGIN
    DECLARE v_max_slots INT;
    DECLARE v_current_booked INT;

    -- 1. Lấy sức chứa tối đa của Tour
    SELECT MaxParticipants INTO v_max_slots 
    FROM Tour WHERE TourID = NEW.TourID;

    -- 2. Tính tổng số chỗ đã được đặt (Nếu bạn không dùng cột CurrentParticipants)
    SELECT COALESCE(SUM(Quantity), 0) INTO v_current_booked 
    FROM BookedTour WHERE TourID = NEW.TourID;

    -- 3. Kiểm tra
    IF (v_current_booked + NEW.Quantity) > v_max_slots THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Lỗi: Số lượng khách vượt quá chỗ trống còn lại của Tour!';
    END IF;
END $$

-- 3.2 Ngăn chặn thay đổi chi tiết khi đơn hàng đã thanh toán
CREATE TRIGGER before_bookedtour_update_protected
BEFORE UPDATE ON BookedTour
FOR EACH ROW
BEGIN
    DECLARE v_status INT;
    SELECT OrderStatus INTO v_status FROM `Order` WHERE OrderID = OLD.OrderID;

    IF v_status = 2 THEN -- Giả sử 2 là trạng thái Đã thanh toán
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Không thể chỉnh sửa tour trong đơn hàng đã thanh toán!';
    END IF;
END $$
DELIMITER ;

