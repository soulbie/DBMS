use dbms;

DELIMITER $$

-- 1. Doanh thu theo khoảng ngày 
-- (Đã rút gọn nhờ gọi vw_BookingDetails, không cần JOIN Order và BookedTour nữa)
DROP PROCEDURE IF EXISTS sp_GetRevenueByDateRange $$
CREATE PROCEDURE sp_GetRevenueByDateRange (
    IN p_StartDate DATE,
    IN p_EndDate DATE
)
BEGIN
    SELECT 
        DATE(OrderDate) AS TransactionDate,
        COUNT(DISTINCT OrderID) AS TotalOrders,
        COALESCE(SUM(LineTotal), 0) AS DailyRevenue
    FROM vw_BookingDetails
    WHERE 
        OrderStatus = 2
        AND OrderDate >= p_StartDate
        AND OrderDate < DATE_ADD(p_EndDate, INTERVAL 1 DAY)
    GROUP BY DATE(OrderDate)
    ORDER BY TransactionDate ASC;
END $$
CALL sp_GetRevenueByDateRange('2026-01-01', '2026-05-31');

-- 2. Doanh thu theo danh mục
DROP PROCEDURE IF EXISTS sp_GetRevenueByCategory $$
CREATE PROCEDURE sp_GetRevenueByCategory(
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_CategoryName VARCHAR(255)
)
BEGIN
    SELECT 
        c.CategoryID,
        c.Name AS CategoryName,
        COALESCE(SUM(b.Quantity), 0) AS TicketsSold,
        COALESCE(SUM(b.LineTotal), 0) AS TotalRevenue
    FROM Category c
    LEFT JOIN Tour t ON c.CategoryID = t.CategoryID
    LEFT JOIN vw_BookingDetails b 
        ON t.TourID = b.TourID 
        AND b.OrderStatus = 2
        AND b.OrderDate >= p_StartDate
        AND b.OrderDate < DATE_ADD(p_EndDate, INTERVAL 1 DAY)
    WHERE 
        p_CategoryName IS NULL
        OR p_CategoryName = ''
        OR c.Name LIKE CONCAT('%', p_CategoryName, '%')
    GROUP BY c.CategoryID, c.Name
    ORDER BY TotalRevenue DESC;
END $$
CALL sp_GetRevenueByCategory('2026-04-01', '2026-04-30', '7');


-- 3. Doanh thu Thực tế vs Dự kiến
DROP PROCEDURE IF EXISTS sp_RevenueActualVsExpected $$
CREATE PROCEDURE sp_RevenueActualVsExpected(
    IN p_StartDate DATE,
    IN p_EndDate DATE
)
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN OrderStatus = 2 THEN LineTotal ELSE 0 END), 0) AS ActualRevenue,
        COALESCE(SUM(CASE WHEN OrderStatus = 1 THEN LineTotal ELSE 0 END), 0) AS PendingRevenue,
        COALESCE(SUM(CASE WHEN OrderStatus = 0 THEN LineTotal ELSE 0 END), 0) AS LostRevenue,
        COALESCE(SUM(CASE WHEN OrderStatus IN (1,2) THEN LineTotal ELSE 0 END), 0) AS ExpectedRevenue,
        IF(
            SUM(CASE WHEN OrderStatus IN (1,2) THEN LineTotal ELSE 0 END) = 0,
            0,
            ROUND(
                SUM(CASE WHEN OrderStatus = 2 THEN LineTotal ELSE 0 END) /
                SUM(CASE WHEN OrderStatus IN (1,2) THEN LineTotal ELSE 0 END) * 100,
            2)
        ) AS CompletionRatePercent
    FROM vw_BookingDetails
    WHERE OrderDate >= p_StartDate AND OrderDate < DATE_ADD(p_EndDate, INTERVAL 1 DAY);
END $$
CALL sp_RevenueActualVsExpected('2026-04-01', '2026-04-30');

-- 4. Top Tour bán chạy nhất
DROP PROCEDURE IF EXISTS sp_GetTopBestSellingToursByMonth $$
CREATE PROCEDURE sp_GetTopBestSellingToursByMonth (
    IN p_Year INT,
    IN p_Month INT,
    IN p_Limit INT
)
BEGIN
    SELECT
        t.TourID,
        t.Title AS TourName,
        COUNT(DISTINCT b.OrderID) AS TotalOrders,
        SUM(b.Quantity) AS TotalCustomers,
        SUM(b.LineTotal) AS TotalRevenue
    FROM Tour t
    JOIN vw_BookingDetails b ON t.TourID = b.TourID
    WHERE 
        b.OrderStatus = 2
        AND YEAR(b.OrderDate) = p_Year
        AND MONTH(b.OrderDate) = p_Month
    GROUP BY t.TourID, t.Title
    ORDER BY TotalCustomers DESC
    LIMIT p_Limit;
END $$
CALL sp_GetTopBestSellingToursByMonth(2026, 4, 5);

-- 5. Tỷ lệ lấp đầy
-- (Cực kỳ ngắn vì vw_TourOccupancy đã lo hết việc tính toán % và số ghế dư)
DROP PROCEDURE IF EXISTS sp_GetTourOccupancyByName $$
CREATE PROCEDURE sp_GetTourOccupancyByName(
    IN p_TourTitle VARCHAR(255)
)
BEGIN
    SELECT
        TourID,
        TourName AS Title,
        MaxParticipants,
        SoldSeats,
        OccupancyRate
    FROM vw_TourOccupancy
    WHERE TourName LIKE CONCAT('%', p_TourTitle, '%');
END $$
CALL sp_GetTourOccupancyByName('Đà Lạt');

-- 6. Top Tour bị hủy nhiều nhất
DROP PROCEDURE IF EXISTS sp_TopCancelledTours $$
CREATE PROCEDURE sp_TopCancelledTours(
    IN p_Limit INT
)
BEGIN
    SELECT
        t.TourID,
        t.Title,
        COUNT(b.OrderID) AS CancelledOrders,
        IFNULL(SUM(b.Quantity), 0) AS CancelledSeats
    FROM Tour t
    JOIN vw_BookingDetails b ON t.TourID = b.TourID
    WHERE b.OrderStatus = 0
    GROUP BY t.TourID, t.Title
    ORDER BY CancelledOrders DESC
    LIMIT p_Limit;
END $$
CALL sp_TopCancelledTours(5);

-- 7. Tour tồn kho cao (Tour ế)
DROP PROCEDURE IF EXISTS sp_HighInventoryTours $$
CREATE PROCEDURE sp_HighInventoryTours(
    IN p_DaysAhead INT
)
BEGIN
    SELECT
        TourID, TourName AS Title, DepartureDate, MaxParticipants, 
        SoldSeats, RemainingSeats, OccupancyRate
    FROM vw_TourOccupancy
    WHERE
        DepartureDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL p_DaysAhead DAY)
        AND OccupancyRate < 30
    ORDER BY DepartureDate ASC, OccupancyRate ASC;
END $$
CALL sp_HighInventoryTours(14);

-- 8. Top khách hàng VIP
-- (Tận dụng vw_CustomerStats đã gom nhóm sẵn tiền và số đơn của từng khách)
DROP PROCEDURE IF EXISTS GetTopVIPCustomers $$
CREATE PROCEDURE GetTopVIPCustomers (
    IN p_limit INT,
    IN p_mode INT   
)
BEGIN
    IF p_mode = 1 THEN
        SELECT UserID, FullName, Email, TotalOrders, TotalSpent
        FROM vw_CustomerStats 
        ORDER BY TotalSpent DESC LIMIT p_limit;
    ELSEIF p_mode = 2 THEN
        SELECT UserID, FullName, Email, TotalOrders, TotalSpent
        FROM vw_CustomerStats 
        ORDER BY TotalOrders DESC LIMIT p_limit;
    END IF;
END $$
CALL GetTopVIPCustomers(10, 1); 
CALL GetTopVIPCustomers(10, 2);

-- 9. Thống kê nhân khẩu học (Độ tuổi & Vị trí)
-- (Không còn khối CASE WHEN khổng lồ vì vw_UserDemographics đã làm thay)
DROP PROCEDURE IF EXISTS GetCustomerDemographicStats $$
CREATE PROCEDURE GetCustomerDemographicStats (
    IN p_type VARCHAR(20),      
    IN p_order_status INT       
)
BEGIN
    IF p_type = 'AGE' THEN
        SELECT u.AgeGroup AS DemographicGroup, COUNT(DISTINCT u.UserID) AS TotalCustomers
        FROM vw_UserDemographics u
        JOIN vw_BookingDetails b ON u.UserID = b.UserID
        WHERE b.OrderStatus = p_order_status
        GROUP BY u.AgeGroup
        ORDER BY TotalCustomers DESC;

    ELSEIF p_type = 'LOCATION' THEN
        SELECT u.Address AS DemographicGroup, COUNT(DISTINCT u.UserID) AS TotalCustomers
        FROM vw_UserDemographics u
        JOIN vw_BookingDetails b ON u.UserID = b.UserID
        WHERE b.OrderStatus = p_order_status
        GROUP BY u.Address
        ORDER BY TotalCustomers DESC;
    END IF;
END $$
CALL GetCustomerDemographicStats('AGE', 2);    
CALL GetCustomerDemographicStats('LOCATION', 2);

-- 10. Tỷ lệ khách hàng quay lại
DROP PROCEDURE IF EXISTS GetCustomerRetentionRate $$
CREATE PROCEDURE GetCustomerRetentionRate (
    IN p_order_status INT -- (Lưu ý: vw_CustomerStats mặc định chỉ tính đơn Status=2, nên tham số này có thể bỏ qua trong thực tế, nhưng tôi giữ lại cấu trúc cho bạn)
)
BEGIN
    SELECT
        SUM(CASE WHEN TotalOrders >= 2 THEN 1 ELSE 0 END) AS ReturningCustomers,
        SUM(CASE WHEN TotalOrders = 1 THEN 1 ELSE 0 END) AS OneTimeCustomers,
        ROUND(
            SUM(CASE WHEN TotalOrders >= 2 THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN TotalOrders >= 1 THEN 1 ELSE 0 END), 0) * 100,
            2
        ) AS RetentionRatePercent
    FROM vw_CustomerStats;
END $$
CALL GetCustomerRetentionRate(2);

DELIMITER ;