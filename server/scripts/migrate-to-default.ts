import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { WordPack, WordEntry } from '../../shared/types/wordpack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WordEntryWithCategory extends WordEntry {
  category: string;
}

// Map of filename to category
const categoryMap: Record<string, string> = {
  'тварини.txt': 'тварини',
  'предмети.txt': 'предмети',
  'дії.txt': 'дії',
  'місця.txt': 'місця',
  'різне.txt': 'різне',
};

function parseWordFile(filePath: string, category: string): WordEntryWithCategory[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const words: WordEntryWithCategory[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const parts = trimmed.split('|');
      if (parts.length === 2) {
        const [word, difficulty] = parts;
        const diff = difficulty.trim() as 'easy' | 'medium' | 'hard';

        if (diff === 'easy' || diff === 'medium' || diff === 'hard') {
          words.push({
            word: word.trim(),
            difficulty: diff,
            category,
          });
        }
      }
    }

    return words;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

async function migrateToDefault() {
  const wordsDir = path.join(__dirname, '..', 'words');
  const dataDir = path.join(__dirname, '..', 'data');

  // Check if words directory exists
  if (!fs.existsSync(wordsDir)) {
    console.error('❌ Words directory not found. Migration already completed or files missing.');
    console.log('   This script is for initial migration from .txt to .wordspack format.');
    process.exit(1);
  }

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('🔄 Migrating all words to default.wordspack...\n');

  const allWords: WordEntryWithCategory[] = [];
  const stats: Record<string, number> = {};

  // Read all .txt files
  for (const [filename, category] of Object.entries(categoryMap)) {
    const filePath = path.join(wordsDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filename}`);
      continue;
    }

    console.log(`📖 Reading ${filename}...`);
    const words = parseWordFile(filePath, category);
    allWords.push(...words);
    stats[category] = words.length;
    console.log(`   ✓ Loaded ${words.length} words from ${category}`);
  }

  console.log('\n📊 Statistics:');
  console.log(`   Total words: ${allWords.length}`);
  Object.entries(stats).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} words`);
  });

  // Create default word pack (preserve category in each word entry)
  const now = new Date().toISOString();
  const defaultPack: WordPack = {
    metadata: {
      name: 'Default Ukrainian Words',
      description: 'Default word collection for Alias game including animals, objects, actions, places, and miscellaneous words',
      category: 'змішані',
      author: 'Alias Team',
      version: '1.0.0',
      language: 'uk',
      createdAt: now,
      updatedAt: now,
    },
    words: allWords.map(({ word, difficulty, category }) => ({ word, difficulty, category })),
  };

  // Save to file
  const outputPath = path.join(dataDir, 'default.wordspack');
  fs.writeFileSync(outputPath, JSON.stringify(defaultPack, null, 2), 'utf-8');

  console.log('\n✅ Created default.wordspack');
  console.log(`   Location: ${outputPath}`);
  console.log(`   Total words: ${defaultPack.words.length}`);
  console.log(`   Categories are embedded in each word entry`);

  // Clean up old files
  console.log('\n🧹 Cleaning up...');

  // Remove old .txt files and words directory
  if (fs.existsSync(wordsDir)) {
    fs.rmSync(wordsDir, { recursive: true, force: true });
    console.log(`   ✓ Removed server/words/ directory with .txt files`);
  }

  // Remove old wordpacks directory if it exists
  const oldWordpacksDir = path.join(__dirname, '..', 'wordpacks');
  if (fs.existsSync(oldWordpacksDir)) {
    fs.rmSync(oldWordpacksDir, { recursive: true, force: true });
    console.log(`   ✓ Removed old server/wordpacks/ directory`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Migration complete!');
  console.log('═══════════════════════════════════════\n');
  console.log('📝 All words are now in server/data/default.wordspack');
  console.log('   Legacy .txt files have been removed.');
  console.log('');
}

// Run migration
migrateToDefault().catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
