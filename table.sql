CREATE DATABASE IF NOT EXISTS DBMS;
USE DBMS;

-- 1. Category (Danh mục, tự tham chiếu)
CREATE TABLE Category (
    CategoryID INT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    CategoryThumbnail VARCHAR(255),
    CategoryStatus INT NOT NULL,
    Description TEXT,
    Location VARCHAR(255),
    ParentID INT,
    CONSTRAINT fk_category_parent
        FOREIGN KEY (ParentID) REFERENCES Category(CategoryID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tour
CREATE TABLE Tour (
    TourID INT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Vehicle VARCHAR(100),
    Timeline VARCHAR(255),
    DeparturePlace VARCHAR(255),
    DepartureDate DATETIME,
    Duration VARCHAR(100),
    CostPerPerson DECIMAL(18,2),
    MaxParticipants INT NOT NULL,             
    TourThumbnail VARCHAR(255),
    TourStatus INT,
    CategoryID INT,
    CONSTRAINT fk_tour_category
        FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tour Image
CREATE TABLE Tour_Image (
    ImageID INT PRIMARY KEY,
    Source VARCHAR(255),
    TourID INT,
    CONSTRAINT fk_image_tour
        FOREIGN KEY (TourID) REFERENCES Tour(TourID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. User (Khách hàng)
CREATE TABLE User (
    UserID INT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    DateOfBirth DATE,                         
    Address VARCHAR(255),
    Email VARCHAR(100) UNIQUE,
    Password VARCHAR(255),
    PhoneNumber VARCHAR(20),
    Status INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Order (Đơn hàng)
CREATE TABLE `Order` (
    OrderID INT PRIMARY KEY,
    PaymentMethod VARCHAR(100),
    OrderDate DATETIME,
    OrderStatus INT,
    Note TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. BookedTour (Chi tiết đặt tour)
CREATE TABLE BookedTour (
    UserID INT,
    TourID INT,
    OrderID INT,
    Quantity INT,
    PriceAtBooking DECIMAL(18,2),
    PRIMARY KEY (UserID, TourID, OrderID),
    CONSTRAINT fk_bt_user
        FOREIGN KEY (UserID) REFERENCES User(UserID),
    CONSTRAINT fk_bt_tour
        FOREIGN KEY (TourID) REFERENCES Tour(TourID),
    CONSTRAINT fk_bt_order
        FOREIGN KEY (OrderID) REFERENCES `Order`(OrderID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Admin
CREATE TABLE Admin (
    AdminID INT PRIMARY KEY,
    FullName VARCHAR(255),
    Address VARCHAR(255),
    Email VARCHAR(100) UNIQUE,
    Password VARCHAR(255),
    PhoneNumber VARCHAR(20),
    Status INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Role
CREATE TABLE Role (
    RoleID INT PRIMARY KEY,
    RoleName VARCHAR(100),
    RoleDescription TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. AdminRoles
CREATE TABLE AdminRoles (
    AdminID INT,
    RoleID INT,
    PRIMARY KEY (AdminID, RoleID),
    FOREIGN KEY (AdminID) REFERENCES Admin(AdminID),
    FOREIGN KEY (RoleID) REFERENCES Role(RoleID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Permission
CREATE TABLE Permission (
    PermissionID INT PRIMARY KEY,
    PermissionType VARCHAR(100),
    PermissionDescription TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. RolePermission
CREATE TABLE RolePermission (
    RoleID INT,
    PermissionID INT,
    PRIMARY KEY (RoleID, PermissionID),
    FOREIGN KEY (RoleID) REFERENCES Role(RoleID),
    FOREIGN KEY (PermissionID) REFERENCES Permission(PermissionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. AuditLog
CREATE TABLE AuditLog (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    AdminID INT,
    Action VARCHAR(50),
    TargetTable VARCHAR(100),
    TargetID INT,
    ActionTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    Details TEXT,
    FOREIGN KEY (AdminID) REFERENCES Admin(AdminID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;