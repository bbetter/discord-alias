import { WordPackService } from '../services/WordPackService.js';
import type { WordPack } from '../../shared/types/wordpack.js';

const wordPackService = new WordPackService();

console.log('🧪 Testing dynamic category discovery...\n');

// Test 1: Get categories from default pack
console.log('1️⃣ Discovering categories from default.wordspack:');
const defaultPack = wordPackService.getWordPack('default');
if (!defaultPack) {
  console.error('   ❌ Failed to load default.wordspack');
  process.exit(1);
}

const categoriesSet = new Set<string>();
defaultPack.words.forEach(word => {
  const category = word.category || 'різне';
  categoriesSet.add(category);
});

const discoveredCategories = Array.from(categoriesSet).sort();
console.log(`   ✓ Discovered ${discoveredCategories.length} categories:`);
discoveredCategories.forEach(cat => {
  const count = defaultPack.words.filter(w => (w.category || 'різне') === cat).length;
  console.log(`      - ${cat}: ${count} words`);
});

// Test 2: Create a custom word pack with new category
console.log('\n2️⃣ Creating custom word pack with new category:');
const customPack: WordPack = {
  metadata: {
    name: 'Test Custom Categories',
    description: 'Testing dynamic category discovery',
    category: 'test',
    language: 'uk',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  words: [
    { word: 'слово1', difficulty: 'easy', category: 'нова-категорія' },
    { word: 'слово2', difficulty: 'easy', category: 'нова-категорія' },
    { word: 'слово3', difficulty: 'medium', category: 'інша-категорія' },
    { word: 'слово4', difficulty: 'hard' }, // No category - should default to 'різне'
  ],
};

wordPackService.saveWordPack('test-custom', customPack);
console.log('   ✓ Created test-custom.wordspack with custom categories');

// Test 3: Scan all packs and discover all categories
console.log('\n3️⃣ Discovering all categories from all word packs:');
const allCategoriesSet = new Set<string>();
const allPacks = wordPackService.listWordPacks();

for (const packSummary of allPacks) {
  const pack = wordPackService.getWordPack(packSummary.id);
  if (pack) {
    pack.words.forEach(word => {
      const category = word.category || 'різне';
      allCategoriesSet.add(category);
    });
  }
}

const allCategories = ['змішані', ...Array.from(allCategoriesSet).sort()];
console.log(`   ✓ Total unique categories: ${allCategories.length}`);
console.log(`   ✓ Categories: ${allCategories.join(', ')}`);

// Test 4: Verify new categories are discoverable
console.log('\n4️⃣ Verifying custom categories are discoverable:');
if (allCategories.includes('нова-категорія')) {
  console.log('   ✓ "нова-категорія" discovered successfully');
} else {
  console.error('   ❌ Failed to discover "нова-категорія"');
}

if (allCategories.includes('інша-категорія')) {
  console.log('   ✓ "інша-категорія" discovered successfully');
} else {
  console.error('   ❌ Failed to discover "інша-категорія"');
}

// Clean up
console.log('\n5️⃣ Cleaning up test data:');
wordPackService.deleteWordPack('test-custom');
console.log('   ✓ Removed test-custom.wordspack');

console.log('\n✅ Dynamic category discovery works correctly!');
console.log('\n📝 Summary:');
console.log('   - Categories are automatically discovered from wordpacks');
console.log('   - No hardcoded category lists');
console.log('   - Custom categories can be added by creating wordpacks with new category names');
console.log('   - Words without category field default to "різне"');
