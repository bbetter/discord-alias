import type { Category, Difficulty } from '../shared/types/game.js';
import { WordPackService } from './services/WordPackService.js';

interface WordObject {
  word: string;
  difficulty: string;
}

// Initialize WordPackService
const wordPackService = new WordPackService();

// Dynamic word bank - categories are discovered from wordpacks
const wordBank: Map<string, WordObject[]> = new Map();

export function loadCategory(category: string): WordObject[] {
  // Check cache
  if (wordBank.has(category)) {
    return wordBank.get(category)!;
  }

  const words: WordObject[] = [];

  // Load words from all word packs for this category
  const allPacks = wordPackService.listWordPacks();

  for (const packSummary of allPacks) {
    const pack = wordPackService.getWordPack(packSummary.id);
    if (pack) {
      // Filter words by category field (defaults to 'різне' if not specified)
      const categoryWords = pack.words
        .filter(w => (w.category || 'різне') === category)
        .map(w => ({ word: w.word, difficulty: w.difficulty }));
      words.push(...categoryWords);
    }
  }

  // Cache the result
  wordBank.set(category, words);

  return words;
}

export function loadAllCategories(): void {
  // Discover categories from all wordpacks
  const categories = getCategories();
  categories.forEach((category) => {
    if (category !== 'змішані') {
      loadCategory(category);
    }
  });
}

const difficultyMap: Record<string, string> = {
  легкі: 'easy',
  середні: 'medium',
  складні: 'hard',
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
};

export function filterByDifficulty(words: WordObject[], difficulty: Difficulty): WordObject[] {
  if (difficulty === 'змішані') {
    return words;
  }

  const targetDifficulty = difficultyMap[difficulty] || difficulty;
  return words.filter((wordObj) => wordObj.difficulty === targetDifficulty);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRandomWords(
  category: Category,
  difficulty: Difficulty,
  count: number,
  usedWords: string[] = []
): WordObject[] {
  let words: WordObject[] = [];

  if (category === 'змішані') {
    // Load all words from all categories
    const allWords: WordObject[] = [];
    const categories = getCategories();
    categories.forEach((cat) => {
      if (cat !== 'змішані') {
        const categoryWords = loadCategory(cat);
        allWords.push(...categoryWords);
      }
    });
    words = allWords;
  } else {
    words = loadCategory(category);
  }

  // Filter by difficulty
  let filteredWords = filterByDifficulty(words, difficulty);

  // Filter out used words
  if (usedWords.length > 0) {
    const usedWordsSet = new Set(usedWords);
    filteredWords = filteredWords.filter((wordObj) => !usedWordsSet.has(wordObj.word));
  }

  if (filteredWords.length === 0) {
    console.warn(`No words found for category: ${category}, difficulty: ${difficulty}`);
    console.warn(`Total words in category: ${words.length}, Used words: ${usedWords.length}`);

    // If we've run out of words, reset and use all words again
    console.warn('Word pool exhausted, resetting to use all words again');
    filteredWords = filterByDifficulty(words, difficulty);
  }

  if (filteredWords.length < count) {
    console.warn(`Requested ${count} words but only ${filteredWords.length} available`);
  }

  const shuffled = shuffleArray(filteredWords);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getCategories(): Category[] {
  const categoriesSet = new Set<string>();

  // Scan all wordpacks to discover unique categories
  const allPacks = wordPackService.listWordPacks();

  for (const packSummary of allPacks) {
    const pack = wordPackService.getWordPack(packSummary.id);
    if (pack) {
      pack.words.forEach(word => {
        const category = word.category || 'різне';
        categoriesSet.add(category);
      });
    }
  }

  // Convert to sorted array and add 'змішані' at the beginning
  const categories = Array.from(categoriesSet).sort();
  return ['змішані', ...categories];
}

export function getWordCount(category: string): number {
  const words = loadCategory(category);
  return words.length;
}

// Reload word bank (useful when word packs are updated)
export function reloadWordBank(): void {
  // Clear the cache
  wordBank.clear();

  // Reload all categories
  loadAllCategories();

  console.log('Word bank reloaded');
}

// Initialize: Load all categories on startup
loadAllCategories();

console.log('Word loader initialized. Categories loaded:');
const categories = getCategories();
categories.forEach((category) => {
  if (category !== 'змішані') {
    const count = getWordCount(category);
    console.log(`  ${category}: ${count} words`);
  }
});
