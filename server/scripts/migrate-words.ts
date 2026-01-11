import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WordPackService } from '../services/WordPackService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wordPackService = new WordPackService();

// Map of filename to metadata
const wordFileMetadata = {
  'тварини.txt': {
    name: 'Тварини',
    description: 'Свійські та дикі тварини, птахи, риби, комахи',
    category: 'тварини',
    author: 'Alias Team',
  },
  'предмети.txt': {
    name: 'Предмети',
    description: 'Побутові предмети, інструменти, речі',
    category: 'предмети',
    author: 'Alias Team',
  },
  'дії.txt': {
    name: 'Дії',
    description: 'Дієслова та дії',
    category: 'дії',
    author: 'Alias Team',
  },
  'місця.txt': {
    name: 'Місця',
    description: 'Географічні об\'єкти, будівлі, локації',
    category: 'місця',
    author: 'Alias Team',
  },
  'різне.txt': {
    name: 'Різне',
    description: 'Різноманітні слова, які не підходять до інших категорій',
    category: 'різне',
    author: 'Alias Team',
  },
};

async function migrateWords() {
  const wordsDir = path.join(__dirname, '..', 'words');
  const files = fs.readdirSync(wordsDir);

  console.log('🔄 Starting migration of .txt word files to .wordspack format...\n');

  let migrated = 0;
  let failed = 0;

  for (const file of files) {
    if (!file.endsWith('.txt')) {
      continue;
    }

    const metadata = wordFileMetadata[file as keyof typeof wordFileMetadata];
    if (!metadata) {
      console.warn(`⚠️  No metadata found for ${file}, skipping...`);
      continue;
    }

    try {
      const filePath = path.join(wordsDir, file);
      console.log(`📖 Reading ${file}...`);

      const wordPack = wordPackService.importFromTxt(filePath, {
        ...metadata,
        language: 'uk',
        version: '1.0.0',
      });

      if (!wordPack) {
        console.error(`❌ Failed to parse ${file}`);
        failed++;
        continue;
      }

      // Use category as the ID for consistency
      const packId = metadata.category;
      const success = wordPackService.saveWordPack(packId, wordPack);

      if (success) {
        console.log(`✅ Migrated ${file} → ${packId}.wordspack (${wordPack.words.length} words)`);
        migrated++;
      } else {
        console.error(`❌ Failed to save ${packId}.wordspack`);
        failed++;
      }
    } catch (error) {
      console.error(`❌ Error migrating ${file}:`, error);
      failed++;
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log(`✅ Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Failed: ${failed}`);
  console.log('═══════════════════════════════════════\n');

  if (migrated > 0) {
    console.log('📝 Next steps:');
    console.log('   1. Verify the .wordspack files in server/wordpacks/');
    console.log('   2. Test loading words in the game');
    console.log('   3. Archive the old .txt files (move to server/words/legacy/)');
    console.log('');
  }
}

// Run migration
migrateWords().catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
