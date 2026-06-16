-- Tạo Composite Index trên bảng Order để tối ưu lọc trạng thái và ngày đặt tour
CREATE INDEX idx_order_status_date 
ON `Order` (OrderStatus, OrderDate);

-- Tạo Fulltext Index trên bảng Tour để tối ưu lọc tên Tour
ALTER TABLE Tour ADD FULLTEXT INDEX ft_idx_tour_title (Title);