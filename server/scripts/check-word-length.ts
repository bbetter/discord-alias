import { WordPackService } from '../services/WordPackService.js';

const wordPackService = new WordPackService();

console.log('🔍 Checking words with more than 2 words...\n');

const defaultPack = wordPackService.getWordPack('default');
if (!defaultPack) {
  console.error('❌ default.wordspack not found!');
  process.exit(1);
}

const violations: Array<{ word: string; wordCount: number; category?: string }> = [];

defaultPack.words.forEach(entry => {
  const wordCount = entry.word.trim().split(/\s+/).length;
  if (wordCount > 2) {
    violations.push({
      word: entry.word,
      wordCount,
      category: entry.category,
    });
  }
});

if (violations.length === 0) {
  console.log('✅ All words are valid (1-2 words each)');
  console.log(`   Total words checked: ${defaultPack.words.length}`);
} else {
  console.log(`⚠️  Found ${violations.length} violations (words with more than 2 words):\n`);

  // Group by category
  const byCategory: Record<string, typeof violations> = {};
  violations.forEach(v => {
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

  console.log(`Total violations: ${violations.length} out of ${defaultPack.words.length} words`);
}
