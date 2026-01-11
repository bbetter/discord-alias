import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { WordPack, WordPackSummary, WordEntry } from '../../shared/types/wordpack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WordPackService {
  private wordPacksDir: string;

  constructor() {
    this.wordPacksDir = path.join(__dirname, '..', 'data');
    this.ensureWordPacksDir();
  }

  private ensureWordPacksDir(): void {
    if (!fs.existsSync(this.wordPacksDir)) {
      fs.mkdirSync(this.wordPacksDir, { recursive: true });
      console.log(`Created data directory: ${this.wordPacksDir}`);
    }
  }

  private getWordPackPath(id: string): string {
    return path.join(this.wordPacksDir, `${id}.wordspack`);
  }

  // List all word packs
  listWordPacks(): WordPackSummary[] {
    const files = fs.readdirSync(this.wordPacksDir);
    const summaries: WordPackSummary[] = [];

    for (const file of files) {
      if (file.endsWith('.wordspack')) {
        try {
          const id = file.replace('.wordspack', '');
          const wordPack = this.getWordPack(id);

          if (wordPack) {
            summaries.push({
              id,
              metadata: wordPack.metadata,
              wordCount: wordPack.words.length,
            });
          }
        } catch (error) {
          console.error(`Error reading word pack ${file}:`, error);
        }
      }
    }

    return summaries.sort((a, b) =>
      new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
    );
  }

  // Get a specific word pack
  getWordPack(id: string): WordPack | null {
    const filePath = this.getWordPackPath(id);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const wordPack = JSON.parse(content) as WordPack;
      return wordPack;
    } catch (error) {
      console.error(`Error reading word pack ${id}:`, error);
      return null;
    }
  }

  // Create or update a word pack
  saveWordPack(id: string, wordPack: WordPack): boolean {
    try {
      // Update timestamps
      wordPack.metadata.updatedAt = new Date().toISOString();
      if (!wordPack.metadata.createdAt) {
        wordPack.metadata.createdAt = wordPack.metadata.updatedAt;
      }

      const filePath = this.getWordPackPath(id);
      fs.writeFileSync(filePath, JSON.stringify(wordPack, null, 2), 'utf-8');
      console.log(`Saved word pack: ${id} (${wordPack.words.length} words)`);
      return true;
    } catch (error) {
      console.error(`Error saving word pack ${id}:`, error);
      return false;
    }
  }

  // Delete a word pack
  deleteWordPack(id: string): boolean {
    const filePath = this.getWordPackPath(id);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted word pack: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting word pack ${id}:`, error);
      return false;
    }
  }

  // Import from legacy .txt format
  importFromTxt(txtFilePath: string, metadata: Partial<WordPack['metadata']>): WordPack | null {
    try {
      const content = fs.readFileSync(txtFilePath, 'utf-8');
      const lines = content.split('\n');
      const words: WordEntry[] = [];

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
            });
          }
        }
      }

      const now = new Date().toISOString();
      const wordPack: WordPack = {
        metadata: {
          name: metadata.name || 'Untitled Pack',
          description: metadata.description || '',
          category: metadata.category || 'різне',
          author: metadata.author,
          version: metadata.version || '1.0.0',
          language: metadata.language || 'uk',
          createdAt: now,
          updatedAt: now,
        },
        words,
      };

      return wordPack;
    } catch (error) {
      console.error(`Error importing from txt file ${txtFilePath}:`, error);
      return null;
    }
  }

  // Export to legacy .txt format
  exportToTxt(id: string): string | null {
    const wordPack = this.getWordPack(id);
    if (!wordPack) {
      return null;
    }

    const lines: string[] = [];
    lines.push(`# ${wordPack.metadata.name}`);
    lines.push(`# ${wordPack.metadata.description}`);
    lines.push(`# Format: word|difficulty (easy, medium, hard)`);
    lines.push('');

    // Group by difficulty
    const easy = wordPack.words.filter((w) => w.difficulty === 'easy');
    const medium = wordPack.words.filter((w) => w.difficulty === 'medium');
    const hard = wordPack.words.filter((w) => w.difficulty === 'hard');

    if (easy.length > 0) {
      lines.push('# Easy');
      easy.forEach((w) => lines.push(`${w.word}|${w.difficulty}`));
      lines.push('');
    }

    if (medium.length > 0) {
      lines.push('# Medium');
      medium.forEach((w) => lines.push(`${w.word}|${w.difficulty}`));
      lines.push('');
    }

    if (hard.length > 0) {
      lines.push('# Hard');
      hard.forEach((w) => lines.push(`${w.word}|${w.difficulty}`));
      lines.push('');
    }

    return lines.join('\n');
  }

  // Validate word pack structure
  validateWordPack(wordPack: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!wordPack.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!wordPack.metadata.name || wordPack.metadata.name.trim() === '') {
        errors.push('Metadata: name is required');
      }
      if (!wordPack.metadata.category || wordPack.metadata.category.trim() === '') {
        errors.push('Metadata: category is required');
      }
      if (!wordPack.metadata.language || wordPack.metadata.language.trim() === '') {
        errors.push('Metadata: language is required');
      }
    }

    if (!Array.isArray(wordPack.words)) {
      errors.push('Words must be an array');
    } else {
      if (wordPack.words.length === 0) {
        errors.push('Word pack must contain at least one word');
      }

      wordPack.words.forEach((word: any, index: number) => {
        if (!word.word || typeof word.word !== 'string') {
          errors.push(`Word at index ${index}: invalid or missing word field`);
        } else {
          // Check word count (max 2 words)
          const wordCount = word.word.trim().split(/\s+/).length;
          if (wordCount > 2) {
            errors.push(`Word at index ${index} ("${word.word}"): exceeds maximum of 2 words (has ${wordCount})`);
          }
        }
        if (!word.difficulty || !['easy', 'medium', 'hard'].includes(word.difficulty)) {
          errors.push(`Word at index ${index}: difficulty must be 'easy', 'medium', or 'hard'`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Get words by category (for use in word-loader)
  getWordsByCategory(category: string): WordEntry[] {
    const allPacks = this.listWordPacks();
    const matchingPacks = allPacks.filter(
      (pack) => pack.metadata.category === category
    );

    const words: WordEntry[] = [];
    for (const packSummary of matchingPacks) {
      const pack = this.getWordPack(packSummary.id);
      if (pack) {
        words.push(...pack.words);
      }
    }

    return words;
  }
}
