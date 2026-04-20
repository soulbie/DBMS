use dbms;
SET GLOBAL event_scheduler = ON;
USE DBMS; -- Đảm bảo sử dụng đúng database của bạn

DELIMITER $$

DROP EVENT IF EXISTS evt_CancelUnpaidOrders $$

CREATE EVENT evt_CancelUnpaidOrders
-- Thiết lập chạy định kỳ mỗi 1 giờ
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    -- Khai báo biến để đếm số đơn hàng bị tác động
    DECLARE total_cancelled INT DEFAULT 0;

    -- 1. Cập nhật trạng thái đơn hàng: 1 (Pending) -> 0 (Cancelled)
    -- Sử dụng INTERVAL 1 DAY để xác định mốc 24 giờ
    UPDATE `Order`
    SET OrderStatus = 0,
        Note = CONCAT(IFNULL(Note, ''), ' [Hệ thống: Tự động hủy do quá hạn thanh toán 24h]')
    WHERE OrderStatus = 1 
      AND OrderDate <= (NOW() - INTERVAL 1 DAY);

    -- Lưu số lượng đơn hàng vừa bị cập nhật vào biến
    SET total_cancelled = ROW_COUNT();

    -- 2. Ghi Log vào bảng AuditLog (nếu có đơn bị hủy)
    -- Dựa theo cấu trúc bảng AuditLog bạn đã tạo trong table.sql
    IF total_cancelled > 0 THEN
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (
            NULL, -- NULL vì đây là hệ thống tự động, không phải Admin cụ thể
            'SYSTEM_AUTO_CANCEL', 
            'Order', 
            NULL, 
            CONCAT('Đã tự động hủy ', total_cancelled, ' đơn hàng quá hạn thanh toán.')
        );
    END IF;
END $$

DELIMITER ;