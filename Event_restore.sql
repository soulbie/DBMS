-- Chạy file này sau khi test xong để restore event production
USE DBMS;
DROP EVENT IF EXISTS evt_CancelUnpaidOrders_TEST;
DROP EVENT IF EXISTS evt_CancelUnpaidOrders;

CREATE EVENT evt_CancelUnpaidOrders
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DECLARE total_cancelled INT DEFAULT 0;
    UPDATE `Order`
    SET OrderStatus = 0,
        Note = CONCAT(IFNULL(Note, ''), ' [He thong: Tu dong huy do qua han thanh toan 24h]')
    WHERE OrderStatus = 1
      AND OrderDate <= (NOW() - INTERVAL 1 DAY);
    SET total_cancelled = ROW_COUNT();
    IF total_cancelled > 0 THEN
        INSERT INTO AuditLog (AdminID, Action, TargetTable, TargetID, Details)
        VALUES (NULL, 'SYSTEM_AUTO_CANCEL', 'Order', NULL,
            CONCAT('Da tu dong huy ', total_cancelled, ' don hang qua han thanh toan.'));
    END IF;
END;

SHOW EVENTS;
