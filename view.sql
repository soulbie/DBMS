-- 1. View Chi tiết Đặt Tour (Gom nhóm doanh thu)
CREATE OR REPLACE VIEW vw_BookingDetails AS
SELECT 
    o.OrderID, o.OrderDate, o.OrderStatus,
    bt.TourID, bt.UserID, bt.Quantity, bt.PriceAtBooking,
    (bt.Quantity * bt.PriceAtBooking) AS LineTotal
FROM `Order` o
JOIN BookedTour bt ON o.OrderID = bt.OrderID;

-- 2. View Thống kê Chỗ ngồi & Tỷ lệ lấp đầy
CREATE OR REPLACE VIEW vw_TourOccupancy AS
SELECT
    t.TourID, t.Title AS TourName, t.CategoryID, t.DepartureDate, t.MaxParticipants,
    IFNULL(SUM(bt.Quantity), 0) AS SoldSeats,
    (t.MaxParticipants - IFNULL(SUM(bt.Quantity), 0)) AS RemainingSeats,
    ROUND(IFNULL(SUM(bt.Quantity), 0) / t.MaxParticipants * 100, 1) AS OccupancyRate
FROM Tour t
LEFT JOIN BookedTour bt ON t.TourID = bt.TourID
LEFT JOIN `Order` o ON bt.OrderID = o.OrderID AND o.OrderStatus = 2
GROUP BY t.TourID, t.Title, t.CategoryID, t.DepartureDate, t.MaxParticipants;

-- 3. View Thống kê Khách hàng (VIP & Chi tiêu)
CREATE OR REPLACE VIEW vw_CustomerStats AS
SELECT 
    u.UserID, u.FullName, u.Email, u.Address, u.DateOfBirth,
    COUNT(DISTINCT o.OrderID) AS TotalOrders,
    COALESCE(SUM(bt.Quantity * bt.PriceAtBooking), 0) AS TotalSpent
FROM User u
LEFT JOIN BookedTour bt ON u.UserID = bt.UserID
LEFT JOIN `Order` o ON bt.OrderID = o.OrderID AND o.OrderStatus = 2
GROUP BY u.UserID, u.FullName, u.Email, u.Address, u.DateOfBirth;

-- 4. View Phân nhóm Độ tuổi
CREATE OR REPLACE VIEW vw_UserDemographics AS
SELECT 
    UserID, FullName, Address,
    CASE
        WHEN TIMESTAMPDIFF(YEAR, DateOfBirth, CURDATE()) < 18 THEN '<18'
        WHEN TIMESTAMPDIFF(YEAR, DateOfBirth, CURDATE()) BETWEEN 18 AND 25 THEN '18-25'
        WHEN TIMESTAMPDIFF(YEAR, DateOfBirth, CURDATE()) BETWEEN 26 AND 35 THEN '26-35'
        WHEN TIMESTAMPDIFF(YEAR, DateOfBirth, CURDATE()) BETWEEN 36 AND 45 THEN '36-45'
        WHEN TIMESTAMPDIFF(YEAR, DateOfBirth, CURDATE()) BETWEEN 46 AND 60 THEN '46-60'
        ELSE '>60'
    END AS AgeGroup
FROM User;

-- 5. View Danh mục Tour đang bán (Cho Website)
CREATE OR REPLACE VIEW vw_TourCatalogue AS
SELECT 
    v.*, 
    c.Name AS CategoryName
FROM vw_TourOccupancy v
JOIN Category c ON v.CategoryID = c.CategoryID
JOIN Tour t ON v.TourID = t.TourID
WHERE v.DepartureDate > NOW()   -- Bỏ t.Status = 1
  AND v.RemainingSeats > 0;

-- 6. View Phân quyền Admin
CREATE OR REPLACE VIEW vw_AdminAccessControl AS
SELECT 
    a.AdminID, 
    a.FullName,   -- Đổi a.Username thành a.FullName (hoặc a.Email tùy bảng của bạn)
    r.RoleName, 
    p.PermissionType
FROM Admin a
JOIN AdminRoles ar ON a.AdminID = ar.AdminID
JOIN Role r ON ar.RoleID = r.RoleID
JOIN RolePermission rp ON r.RoleID = rp.RoleID
JOIN Permission p ON rp.PermissionID = p.PermissionID;