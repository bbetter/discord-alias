import { WordPackService } from '../services/WordPackService.js';

const wordPackService = new WordPackService();

console.log('🧪 Testing default.wordspack...\n');

// Test 1: Check if default.wordspack exists
const defaultPack = wordPackService.getWordPack('default');
if (!defaultPack) {
  console.error('❌ default.wordspack not found!');
  process.exit(1);
}

console.log('✅ default.wordspack loaded successfully');
console.log(`   Name: ${defaultPack.metadata.name}`);
console.log(`   Description: ${defaultPack.metadata.description}`);
console.log(`   Category: ${defaultPack.metadata.category}`);
console.log(`   Language: ${defaultPack.metadata.language}`);
console.log(`   Total words: ${defaultPack.words.length}`);

// Test 2: Check difficulty distribution
const easyWords = defaultPack.words.filter(w => w.difficulty === 'easy');
const mediumWords = defaultPack.words.filter(w => w.difficulty === 'medium');
const hardWords = defaultPack.words.filter(w => w.difficulty === 'hard');

console.log('\n📊 Difficulty distribution:');
console.log(`   Easy: ${easyWords.length} words`);
console.log(`   Medium: ${mediumWords.length} words`);
console.log(`   Hard: ${hardWords.length} words`);

// Test 3: Show sample words
console.log('\n📝 Sample words:');
console.log(`   Easy: ${easyWords.slice(0, 5).map(w => w.word).join(', ')}`);
console.log(`   Medium: ${mediumWords.slice(0, 5).map(w => w.word).join(', ')}`);
console.log(`   Hard: ${hardWords.slice(0, 5).map(w => w.word).join(', ')}`);

// Test 4: List all word packs
console.log('\n📦 All word packs:');
const allPacks = wordPackService.listWordPacks();
allPacks.forEach(pack => {
  console.log(`   - ${pack.id}: ${pack.metadata.name} (${pack.wordCount} words)`);
});

console.log('\n✅ All tests passed!');
