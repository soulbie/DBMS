const db = require('../src/config/db');

async function insertAdmins() {
  try {
    console.log('Đang kết nối database để chèn dữ liệu Admin...');
    
    // 1. Thêm Roles
    const roles = [
      [1, 'Super Admin', 'Toàn quyền hệ thống'],
      [2, 'Tour Manager', 'Quản lý tour và lịch trình'],
      [3, 'Sale', 'Quản lý bán hàng và đơn hàng'],
      [4, 'Support', 'Hỗ trợ khách hàng']
    ];
    
    for (const role of roles) {
      await db.query('INSERT IGNORE INTO Role (RoleID, RoleName, RoleDescription) VALUES (?, ?, ?)', role);
    }
    console.log('✅ Đã thêm các Role');

    // 2. Thêm Admins
    const admins = [
      [1, 'Super Admin', '123 Main St', 'super@sys.com', 'super', '0123456780', 1],
      [2, 'Lê Thị Tour', '456 Main St', 'tour@sys.com', 'tour', '0123456781', 1],
      [3, 'Phạm Văn Sale', '789 Main St', 'sale@sys.com', 'sale', '0123456782', 1],
      [4, 'Nguyễn Support', '012 Main St', 'support@sys.com', 'support', '0123456783', 1]
    ];

    for (const admin of admins) {
      await db.query('INSERT IGNORE INTO Admin (AdminID, FullName, Address, Email, Password, PhoneNumber, Status) VALUES (?, ?, ?, ?, ?, ?, ?)', admin);
    }
    console.log('✅ Đã thêm các tài khoản Admin');

    // 3. Phân quyền AdminRoles
    const adminRoles = [
      [1, 1], // super@sys.com -> Super Admin
      [2, 2], // tour@sys.com -> Tour Manager
      [3, 3], // sale@sys.com -> Sale
      [4, 4]  // support@sys.com -> Support
    ];

    for (const ar of adminRoles) {
      await db.query('INSERT IGNORE INTO AdminRoles (AdminID, RoleID) VALUES (?, ?)', ar);
    }
    console.log('✅ Đã phân quyền AdminRole thành công');

    console.log('\n--- TÀI KHOẢN ĐỂ BẠN TEST ---');
    console.log('1. Tên: super@sys.com   | Pass: super');
    console.log('2. Tên: tour@sys.com    | Pass: tour');
    console.log('3. Tên: sale@sys.com    | Pass: sale');
    console.log('4. Tên: support@sys.com | Pass: support');
    
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    process.exit(0);
  }
}

insertAdmins();
