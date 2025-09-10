const { readdir } = require('fs/promises');
const { join } = require('path');

async function testPaths() {
  const paths = [
    join(process.cwd(), 'public', 'cache'),           // backend/public/cache
    join(process.cwd(), '..', 'public', 'cache'),     // Nano-Generator2/public/cache
    join(__dirname, '..', '..', '..', 'public', 'cache'), 
    join(__dirname, '..', '..', 'public', 'cache'),   
  ];
  
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('');
  
  for (const path of paths) {
    try {
      const files = await readdir(path);
      console.log(`✅ SUCCESS: ${path}`);
      console.log(`   Files found: ${files.length}`);
      console.log(`   First few files: ${files.slice(0, 3).join(', ')}`);
    } catch (e) {
      console.log(`❌ FAILED: ${path}`);
      console.log(`   Error: ${e.message}`);
    }
    console.log('');
  }
}

testPaths();
