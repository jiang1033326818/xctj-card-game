const bcrypt = require("bcryptjs");

async function generateHashes() {
  try {
    const adminHash = await bcrypt.hash('admin', 10);
    const testHash = await bcrypt.hash('test', 10);
    
    console.log('Admin hash:', adminHash);
    console.log('Test hash:', testHash);
  } catch (error) {
    console.error('Error:', error);
  }
}

generateHashes();