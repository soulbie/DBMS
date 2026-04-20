-- ============================================================
-- TEST EVENT: Tự động hủy đơn hàng nếu quá 1 PHÚT chưa thanh toán
-- Chỉ dùng để TEST, không dùng ở production!
-- Sau khi test xong, chạy phần "Restore Production Event" ở dưới
-- ============================================================

USE DBMS;
SET GLOBAL event_scheduler = ON;

-- Xóa event cũ (production) tạm thời
DROP EVENT IF EXISTS evt_CancelUnpaidOrders;

-- Tạo event TEST: chạy mỗi 30 giây, hủy đơn quá 1 phút
DELIMITER $$

CREATE EVENT evt_CancelUnpaidOrders_TEST
ON SCHEDULE EVERY 30 SECOND
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DECLARE total_cancelled INT DEFAULT 0;

    -- Hủy đơn PENDING quá 1 phút chưa thanh toán
    UPDATE `Order`
    SET OrderStatus = 0,
        Note = CONCAT(IFNULL(Note, ''), ' [TEST: Tự động hủy do quá 1 phút chưa thanh toán]')
    WHERE OrderStatus = 1
      AND OrderDate <= (NOW() - INTERVAL 1 MINUTE);

    SET total_cancelled = ROW_COUNT();

    -- Ghi log nếu có đơn bị hủy
    IF total_cancelled > 0 THEN
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (
            NULL,
            'SYSTEM_AUTO_CANCEL',
            'Order',
            NULL,
            CONCAT('[TEST] Đã tự động hủy ', total_cancelled, ' đơn hàng quá 1 phút chưa thanh toán.')
        );
    END IF;
END $$

DELIMITER ;

-- Xem danh sách events để confirm
SHOW EVENTS;


-- ============================================================
-- SAU KHI TEST XONG: Khôi phục event production (24 giờ)
-- Chạy đoạn dưới để restore lại
-- ============================================================
/*
DROP EVENT IF EXISTS evt_CancelUnpaidOrders_TEST;

DELIMITER $$
CREATE EVENT evt_CancelUnpaidOrders
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DECLARE total_cancelled INT DEFAULT 0;

    UPDATE `Order`
    SET OrderStatus = 0,
        Note = CONCAT(IFNULL(Note, ''), ' [Hệ thống: Tự động hủy do quá hạn thanh toán 24h]')
    WHERE OrderStatus = 1
      AND OrderDate <= (NOW() - INTERVAL 1 DAY);

    SET total_cancelled = ROW_COUNT();

    IF total_cancelled > 0 THEN
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (
            NULL,
            'SYSTEM_AUTO_CANCEL',
            'Order',
            NULL,
            CONCAT('Đã tự động hủy ', total_cancelled, ' đơn hàng quá hạn thanh toán.')
        );
    END IF;
END $$
DELIMITER ;
*/
