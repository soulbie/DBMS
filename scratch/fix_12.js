const db = require('../src/config/db');
const buffer = require('../src/utils/queryBuffer');

async function fix() {
  try {
    await db.query(`UPDATE Role SET RoleName = 'Super Admin' WHERE RoleID = 1`);
    await db.query(`UPDATE Role SET RoleName = 'Tour Manager' WHERE RoleID = 2`);
    buffer.flush();
    console.log('DONE');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
