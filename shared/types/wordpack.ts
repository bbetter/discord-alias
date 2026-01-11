export interface WordEntry {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string; // Optional category (e.g., 'тварини', 'предмети', etc.). Defaults to 'різне' if not specified.
}

export interface WordPackMetadata {
  name: string;
  description: string;
  category: string; // e.g., 'тварини', 'предмети', 'дії', 'custom-category-name'
  author?: string;
  version?: string;
  language: string; // e.g., 'uk', 'en'
  createdAt: string;
  updatedAt: string;
}

export interface WordPack {
  metadata: WordPackMetadata;
  words: WordEntry[];
}

export interface WordPackSummary {
  id: string; // filename without .wordspack
  metadata: WordPackMetadata;
  wordCount: number;
}
