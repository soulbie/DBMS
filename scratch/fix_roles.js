const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const buffer = require('../src/utils/queryBuffer');

async function fixRolesAndPermissions() {
  try {
    console.log('1. Đang chạy file Role.sql ở tầng MySQL...');
    const sqlFile = fs.readFileSync(path.join(__dirname, '../Role.sql'), 'utf-8');
    
    // Tách các lệnh SQL theo dấu chấm phẩy
    const statements = sqlFile.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (let stmt of statements) {
      if (!stmt.toUpperCase().startsWith('DELIMITER')) {
        try {
          await db.query(stmt);
        } catch (e) {
          console.warn('⚠️ Bỏ qua lệnh do lỗi (có thể do user chưa tồn tại):', e.sqlMessage);
        }
      }
    }
    console.log('✅ Đã chạy xong Role.sql');

    console.log('\n2. Cập nhật lại tên Role cho khớp với Frontend (Sales Manager, Customer Support)...');
    await db.query(`UPDATE Role SET RoleName = 'Sales Manager' WHERE RoleID = 3`);
    await db.query(`UPDATE Role SET RoleName = 'Customer Support' WHERE RoleID = 4`);
    console.log('✅ Đã cập nhật tên Role');

    console.log('\n3. Nạp dữ liệu vào bảng Permission và RolePermission để View hoạt động...');
    const permissions = [
      [1, 'ALL_ACCESS', 'Full Access'],
      [2, 'MANAGE_TOURS', 'Manage Tours'],
      [3, 'MANAGE_ORDERS', 'Manage Orders'],
      [4, 'VIEW_ONLY', 'View Only']
    ];
    for (const p of permissions) {
      await db.query('INSERT IGNORE INTO Permission (PermissionID, PermissionType, PermissionDescription) VALUES (?, ?, ?)', p);
    }
    
    const rolePerms = [
      [1, 1], // Super Admin -> ALL
      [2, 2], // Tour Manager -> MANAGE_TOURS
      [3, 3], // Sales Manager -> MANAGE_ORDERS
      [4, 4]  // Customer Support -> VIEW_ONLY
    ];
    for (const rp of rolePerms) {
      await db.query('INSERT IGNORE INTO RolePermission (RoleID, PermissionID) VALUES (?, ?)', rp);
    }
    console.log('✅ Đã nạp Permission thành công');

    // Xóa cache để hệ thống nhận diện role mới
    buffer.flush();
    console.log('\n✅ Đã xóa toàn bộ cache! Bạn có thể test lại.');

  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    process.exit(0);
  }
}

fixRolesAndPermissions();
