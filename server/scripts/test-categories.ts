import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing categories.json...\n');

const categoriesPath = path.join(__dirname, '..', 'wordpacks', 'categories.json');

if (!fs.existsSync(categoriesPath)) {
  console.error('❌ categories.json not found!');
  process.exit(1);
}

const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

console.log('✅ categories.json loaded successfully\n');
console.log('📊 Categories:');

categoriesData.categories.forEach((cat: any) => {
  console.log(`\n   ${cat.name}:`);
  console.log(`   - Word count: ${cat.wordCount}`);
  console.log(`   - Sample words: ${cat.words.slice(0, 5).join(', ')}`);
});

console.log('\n✅ All tests passed!');
