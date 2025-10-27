const http = require('http');

console.log('🔍 Testing server connectivity...');

// Test if server is running locally
const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/health',
  method: 'GET',
  headers: {
    'Origin': 'http://localhost:5173'
  }
};

const req = http.request(options, (res) => {
  console.log(`✅ Server is running! Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📋 Server response:', response);
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Cannot connect to server:', err.message);
  console.log('');
  console.log('🔧 Troubleshooting steps:');
  console.log('1. Make sure you have a .env file in space-server-side/');
  console.log('2. Check that your database is running');
  console.log('3. Run: cd space-server-side && npm start');
  console.log('4. Look for any error messages in the server console');
});

req.end();

setTimeout(() => {
  console.log('⏰ Test completed');
  process.exit(0);
}, 5000);