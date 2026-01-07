import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Category, Difficulty } from '../shared/types/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WordObject {
  word: string;
  difficulty: string;
}

type CategoryKey = Exclude<Category, 'змішані'>;

const wordBank: Partial<Record<CategoryKey, WordObject[]>> = {
  тварини: undefined,
  предмети: undefined,
  дії: undefined,
  місця: undefined,
  різне: undefined,
};

const categoryFiles: Record<Category, string | null> = {
  тварини: 'тварини.txt',
  предмети: 'предмети.txt',
  дії: 'дії.txt',
  місця: 'місця.txt',
  різне: 'різне.txt',
  змішані: null,
};

function parseWordFile(filePath: string): WordObject[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const words: WordObject[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const parts = trimmed.split('|');
      if (parts.length === 2) {
        const [word, difficulty] = parts;
        words.push({
          word: word.trim(),
          difficulty: difficulty.trim(),
        });
      }
    }

    return words;
  } catch (error) {
    console.error(`Error reading word file ${filePath}:`, error);
    return [];
  }
}

export function loadCategory(category: CategoryKey): WordObject[] {
  if (wordBank[category]) {
    return wordBank[category]!;
  }

  const fileName = categoryFiles[category];
  if (!fileName) {
    return [];
  }

  const filePath = path.join(__dirname, 'words', fileName);
  const words = parseWordFile(filePath);

  wordBank[category] = words;

  return words;
}

export function loadAllCategories(): void {
  const categories = Object.keys(categoryFiles) as Category[];
  categories.forEach((category) => {
    if (category !== 'змішані') {
      loadCategory(category as CategoryKey);
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

export function getRandomWords(category: Category, difficulty: Difficulty, count: number): WordObject[] {
  let words: WordObject[] = [];

  if (category === 'змішані') {
    const allWords: WordObject[] = [];
    const categories: CategoryKey[] = ['тварини', 'предмети', 'дії', 'місця', 'різне'];
    categories.forEach((cat) => {
      const categoryWords = loadCategory(cat);
      allWords.push(...categoryWords);
    });
    words = allWords;
  } else {
    words = loadCategory(category as CategoryKey);
  }

  const filteredWords = filterByDifficulty(words, difficulty);

  if (filteredWords.length === 0) {
    console.warn(`No words found for category: ${category}, difficulty: ${difficulty}`);
    return [];
  }

  const shuffled = shuffleArray(filteredWords);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getCategories(): Category[] {
  return Object.keys(categoryFiles) as Category[];
}

export function getWordCount(category: CategoryKey): number {
  const words = loadCategory(category);
  return words.length;
}

// Initialize: Load all categories on startup
loadAllCategories();

console.log('Word loader initialized. Categories loaded:');
const categories = Object.keys(categoryFiles) as Category[];
categories.forEach((category) => {
  if (category !== 'змішані') {
    const count = getWordCount(category as CategoryKey);
    console.log(`  ${category}: ${count} words`);
  }
});
