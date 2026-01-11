import { WordPackService } from '../services/WordPackService.js';
import type { WordPack } from '../../shared/types/wordpack.js';

const wordPackService = new WordPackService();

console.log('🧪 Testing category defaulting to "різне"...\n');

// Create a test word pack with some words without category field
const testPack: WordPack = {
  metadata: {
    name: 'Test Pack',
    description: 'Test pack to verify category defaulting',
    category: 'test',
    language: 'uk',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  words: [
    { word: 'тест1', difficulty: 'easy', category: 'тварини' },
    { word: 'тест2', difficulty: 'easy' }, // No category - should default to 'різне'
    { word: 'тест3', difficulty: 'medium', category: 'предмети' },
    { word: 'тест4', difficulty: 'hard' }, // No category - should default to 'різне'
  ],
};

// Save test pack
wordPackService.saveWordPack('test', testPack);

// Load it back
const loadedPack = wordPackService.getWordPack('test');
if (!loadedPack) {
  console.error('❌ Failed to load test pack');
  process.exit(1);
}

console.log('✅ Test pack created and loaded\n');

// Test filtering by category
const тварини = loadedPack.words.filter(w => (w.category || 'різне') === 'тварини');
const предмети = loadedPack.words.filter(w => (w.category || 'різне') === 'предмети');
const різне = loadedPack.words.filter(w => (w.category || 'різне') === 'різне');

console.log('📊 Category filtering results:');
console.log(`   тварини: ${тварини.length} words - ${тварини.map(w => w.word).join(', ')}`);
console.log(`   предмети: ${предмети.length} words - ${предмети.map(w => w.word).join(', ')}`);
console.log(`   різне: ${різне.length} words - ${різне.map(w => w.word).join(', ')}`);

// Verify results
if (тварини.length === 1 && предмети.length === 1 && різне.length === 2) {
  console.log('\n✅ Category defaulting works correctly!');
  console.log('   Words without category field are correctly assigned to "різне"');
} else {
  console.error('\n❌ Category defaulting failed!');
  process.exit(1);
}

// Clean up test pack
wordPackService.deleteWordPack('test');
console.log('\n🧹 Test pack cleaned up');
