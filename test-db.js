const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL);
    
    const connection = await mysql.createConnection({
      host: '103.92.209.102',
      user: 'spasi',
      password: 'spasi45',
      database: 'spasi_db'
    });
    
    console.log('✅ Koneksi berhasil!');
    
    // Test simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Query result:', rows);
    
    // Get database info
    const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db, USER() as current_user');
    console.log('Database info:', dbInfo[0]);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Koneksi gagal:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

testConnection();
