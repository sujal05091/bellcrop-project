const mongoose = require('../server/node_modules/mongoose');
const { connectMongo } = require('../server/config/mongo');
const { ActivityLog } = require('../server/services/auditService');
const pool = require('../server/config/db');

async function cleanTestLogs() {
  try {
    await connectMongo();
    
    // Delete logs created by concurrency test script
    const result = await ActivityLog.deleteMany({
      $or: [
        { userEmail: { $regex: /^concurrency_test_/i } },
        { userId: 'concurrency-test-user' }
      ]
    });
    
    console.log(`✅ Successfully cleaned up ${result.deletedCount} concurrency test logs from MongoDB.`);

    // Clean up test bookings and users from PostgreSQL
    await pool.query("DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'concurrency_test_%')");
    const userDelRes = await pool.query("DELETE FROM users WHERE email LIKE 'concurrency_test_%'");
    console.log(`✅ Cleaned up ${userDelRes.rowCount} concurrency test users & bookings from PostgreSQL.`);
  } catch (err) {
    console.error('❌ Error cleaning test logs:', err.message);
  } finally {
    await mongoose.connection.close();
    await pool.end();
    process.exit(0);
  }
}

cleanTestLogs();
