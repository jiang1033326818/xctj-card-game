const http = require('http');

function testAPI() {
  console.log('Testing different endpoints...');
  
  // 测试一个已知有效的端点
  const options1 = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/user',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer fake-token'
    }
  };

  const req1 = http.request(options1, (res) => {
    console.log('User endpoint Status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('User endpoint Response:', data);
      
      // 测试炸金花端点
      setTimeout(() => {
        const options2 = {
          hostname: 'localhost',
          port: 3000,
          path: '/api/zhajinhua/room-info',
          method: 'GET'
        };

        const req2 = http.request(options2, (res) => {
          console.log('Zhajinhua endpoint Status:', res.statusCode);
          
          let data2 = '';
          res.on('data', (chunk) => {
            data2 += chunk;
          });
          
          res.on('end', () => {
            console.log('Zhajinhua endpoint Response:', data2);
          });
        });

        req2.on('error', (error) => {
          console.error('Zhajinhua endpoint Error:', error.message);
        });

        req2.end();
      }, 1000);
    });
  });

  req1.on('error', (error) => {
    console.error('User endpoint Error:', error.message);
  });

  req1.end();
}

testAPI();