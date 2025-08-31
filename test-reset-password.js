// 测试重置admin密码功能
const http = require('http');

// 测试重置admin密码API
function testResetAdminPassword() {
  const postData = JSON.stringify({
    username: 'admin',
    password: '068162'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/reset-admin-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('状态码:', res.statusCode);
      console.log('响应数据:', data);
      
      try {
        const result = JSON.parse(data);
        if (result.success) {
          console.log('✅ 密码重置成功:', result.message);
        } else {
          console.log('❌ 密码重置失败:', result.error);
        }
      } catch (e) {
        console.log('解析响应数据失败:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error('请求出错:', e.message);
  });

  req.write(postData);
  req.end();
}

// 运行测试
console.log('测试重置admin密码功能...');
testResetAdminPassword();