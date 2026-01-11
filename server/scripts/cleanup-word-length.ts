import { WordPackService } from '../services/WordPackService.js';

const wordPackService = new WordPackService();

console.log('🧹 Cleaning up words with more than 2 words...\n');

const defaultPack = wordPackService.getWordPack('default');
if (!defaultPack) {
  console.error('❌ default.wordspack not found!');
  process.exit(1);
}

const originalCount = defaultPack.words.length;
const removed: Array<{ word: string; wordCount: number; category?: string }> = [];

// Filter out words with more than 2 words
defaultPack.words = defaultPack.words.filter(entry => {
  const wordCount = entry.word.trim().split(/\s+/).length;
  if (wordCount > 2) {
    removed.push({
      word: entry.word,
      wordCount,
      category: entry.category,
    });
    return false; // Remove this word
  }
  return true; // Keep this word
});

if (removed.length === 0) {
  console.log('✅ No words to remove (all words are valid)');
} else {
  console.log(`🗑️  Removed ${removed.length} words:\n`);

  // Group by category
  const byCategory: Record<string, typeof removed> = {};
  removed.forEach(v => {
    const cat = v.category || 'різне';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(v);
  });

  Object.entries(byCategory).forEach(([category, items]) => {
    console.log(`${category}:`);
    items.forEach(item => {
      console.log(`   - "${item.word}" (${item.wordCount} words)`);
    });
    console.log();
  });

  // Save updated pack
  const success = wordPackService.saveWordPack('default', defaultPack);

  if (success) {
    console.log('✅ Saved updated default.wordspack');
    console.log(`   Original words: ${originalCount}`);
    console.log(`   Removed: ${removed.length}`);
    console.log(`   Final count: ${defaultPack.words.length}`);

    // Validate the updated pack
    const validation = wordPackService.validateWordPack(defaultPack);
    if (validation.valid) {
      console.log('\n✅ Validation passed - all words are now valid!');
    } else {
      console.log('\n⚠️  Validation warnings:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
  } else {
    console.error('❌ Failed to save updated default.wordspack');
    process.exit(1);
  }
}
