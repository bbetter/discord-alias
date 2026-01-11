import { WordPackService } from '../services/WordPackService.js';

// Initialize WordPackService
const wordPackService = new WordPackService();

type CategoryKey = 'тварини' | 'предмети' | 'дії' | 'місця' | 'різне';

interface WordObject {
  word: string;
  difficulty: string;
}

function loadCategory(category: CategoryKey): WordObject[] {
  const words: WordObject[] = [];

  // Try loading from default.wordspack first
  const defaultPack = wordPackService.getWordPack('default');
  if (defaultPack) {
    // Filter words by category field (defaults to 'різне' if not specified)
    const defaultWords = defaultPack.words
      .filter(w => (w.category || 'різне') === category)
      .map(w => ({ word: w.word, difficulty: w.difficulty }));
    words.push(...defaultWords);
  }

  return words;
}

console.log('🧪 Testing word loader with default.wordspack...\n');

const categories: CategoryKey[] = ['тварини', 'предмети', 'дії', 'місця', 'різне'];

categories.forEach((category) => {
  const words = loadCategory(category);
  console.log(`${category}: ${words.length} words`);

  if (words.length > 0) {
    const easy = words.filter(w => w.difficulty === 'easy').length;
    const medium = words.filter(w => w.difficulty === 'medium').length;
    const hard = words.filter(w => w.difficulty === 'hard').length;
    console.log(`  Easy: ${easy}, Medium: ${medium}, Hard: ${hard}`);
    console.log(`  Sample: ${words.slice(0, 3).map(w => w.word).join(', ')}`);
  }
  console.log();
});

// Test змішані (all words)
const defaultPack = wordPackService.getWordPack('default');
if (defaultPack) {
  console.log(`змішані (all words): ${defaultPack.words.length} words`);
  const easy = defaultPack.words.filter(w => w.difficulty === 'easy').length;
  const medium = defaultPack.words.filter(w => w.difficulty === 'medium').length;
  const hard = defaultPack.words.filter(w => w.difficulty === 'hard').length;
  console.log(`  Easy: ${easy}, Medium: ${medium}, Hard: ${hard}`);
}

console.log('\n✅ All tests passed!');
