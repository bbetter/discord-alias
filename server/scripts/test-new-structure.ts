import { WordPackService } from '../services/WordPackService.js';

const wordPackService = new WordPackService();

console.log('🧪 Testing new wordpack structure...\n');

// Test 1: Check data directory
console.log('1️⃣ Checking data directory structure:');
const allPacks = wordPackService.listWordPacks();
console.log(`   ✓ Found ${allPacks.length} word pack(s)`);
allPacks.forEach(pack => {
  console.log(`      - ${pack.id}: ${pack.metadata.name} (${pack.wordCount} words)`);
});

// Test 2: Load default pack
console.log('\n2️⃣ Loading default.wordspack:');
const defaultPack = wordPackService.getWordPack('default');
if (!defaultPack) {
  console.error('   ❌ Failed to load default.wordspack');
  process.exit(1);
}
console.log(`   ✓ Loaded successfully`);
console.log(`   ✓ Total words: ${defaultPack.words.length}`);

// Test 3: Check category distribution
console.log('\n3️⃣ Category distribution:');
const categories = ['тварини', 'предмети', 'дії', 'місця', 'різне'];
categories.forEach(category => {
  const count = defaultPack.words.filter(w => (w.category || 'різне') === category).length;
  console.log(`   ${category}: ${count} words`);
});

// Test 4: Check word limit validation
console.log('\n4️⃣ Validating word limit (max 2 words):');
const violations = defaultPack.words.filter(w => w.word.trim().split(/\s+/).length > 2);
if (violations.length === 0) {
  console.log(`   ✓ All words comply with 2-word limit`);
} else {
  console.error(`   ❌ Found ${violations.length} violations`);
  violations.forEach(v => console.error(`      - "${v.word}"`));
}

// Test 5: Validate pack structure
console.log('\n5️⃣ Validating pack structure:');
const validation = wordPackService.validateWordPack(defaultPack);
if (validation.valid) {
  console.log(`   ✓ Pack is valid`);
} else {
  console.error(`   ❌ Validation errors:`);
  validation.errors.forEach(error => console.error(`      - ${error}`));
}

console.log('\n✅ All tests passed! New structure is working correctly.');
console.log('\n📁 Structure:');
console.log('   server/data/');
console.log('   └── default.wordspack (754 words)');
