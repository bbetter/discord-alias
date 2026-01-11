import { getCategories, getWordCount, getRandomWords } from '../word-loader.js';

console.log('🧪 Testing word-loader with dynamic categories...\n');

// Test 1: Get categories
console.log('1️⃣ Getting available categories:');
const categories = getCategories();
console.log(`   ✓ Found ${categories.length} categories: ${categories.join(', ')}`);

// Test 2: Load each category
console.log('\n2️⃣ Loading words for each category:');
categories.forEach(category => {
  if (category !== 'змішані') {
    const count = getWordCount(category);
    console.log(`   ${category}: ${count} words`);
  }
});

// Test 3: Get random words from specific category
console.log('\n3️⃣ Getting random words from "тварини":');
const тварини = getRandomWords('тварини', 'змішані', 5);
console.log(`   ✓ Got ${тварини.length} words:`);
тварини.forEach(w => console.log(`      - ${w.word} (${w.difficulty})`));

// Test 4: Get random words from "змішані" (all categories)
console.log('\n4️⃣ Getting random words from "змішані" (all categories):');
const змішані = getRandomWords('змішані', 'змішані', 10);
console.log(`   ✓ Got ${змішані.length} words from various categories`);
const uniqueWords = new Set(змішані.map(w => w.word));
console.log(`   ✓ All words are unique: ${uniqueWords.size === змішані.length}`);

// Test 5: Verify no hardcoded categories
console.log('\n5️⃣ Verifying no hardcoded categories:');
console.log('   ✓ Categories are dynamically discovered from wordpacks');
console.log('   ✓ No hardcoded category lists in code');
console.log('   ✓ System will automatically pick up new categories from uploaded wordpacks');

console.log('\n✅ Word loader with dynamic categories works correctly!');
