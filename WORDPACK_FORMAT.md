# Word Pack Format (.wordspack)

The `.wordspack` format is a JSON-based format for creating and managing custom word packs for the Alias game.

## Format Specification

A `.wordspack` file is a JSON file with the following structure:

```json
{
  "metadata": {
    "name": "Pack Name",
    "description": "Description of the word pack",
    "category": "category-name",
    "author": "Author Name (optional)",
    "version": "1.0.0 (optional)",
    "language": "uk",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  },
  "words": [
    {
      "word": "слово",
      "difficulty": "easy|medium|hard",
      "category": "тварини (optional, defaults to 'різне' if not specified)"
    }
  ]
}
```

## Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name of the word pack |
| `description` | string | Yes | Brief description of the pack contents |
| `category` | string | Yes | Category identifier (e.g., "тварини", "предмети", "дії", "custom-name") |
| `author` | string | No | Name of the pack creator |
| `version` | string | No | Version number (semver recommended) |
| `language` | string | Yes | Language code (e.g., "uk" for Ukrainian, "en" for English) |
| `createdAt` | string | Auto | ISO 8601 timestamp of creation |
| `updatedAt` | string | Auto | ISO 8601 timestamp of last update |

## Word Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `word` | string | Yes | The word to be guessed (max 2 words) |
| `difficulty` | string | Yes | Must be one of: "easy", "medium", "hard" |
| `category` | string | No | Category of the word (e.g., "тварини", "предмети", "дії", "місця", etc.). Defaults to "різне" if not specified |

## Categories

Categories are **dynamically discovered** from word packs at runtime. There are no hardcoded categories.

### How Categories Work

1. **Pack-level category** (in metadata): Used for organizing word packs in the admin interface
2. **Word-level category** (in each word entry): Used for filtering words during gameplay

### Category Discovery

The system automatically scans all `.wordspack` files and extracts unique categories from the `category` field in word entries:
- Words without a category field default to `"різне"` (miscellaneous)
- Categories are sorted alphabetically in the UI
- `"змішані"` (mixed) is a special meta-category that includes all words from all categories

### Example Categories

The default word pack includes:
- `тварини` (animals)
- `предмети` (objects)
- `дії` (actions)
- `місця` (places)
- `різне` (miscellaneous)

You can create custom categories by simply using a new category name in your word entries:
```json
{
  "word": "example",
  "difficulty": "easy",
  "category": "my-custom-category"
}
```

### Gameplay

When creating a game, players can select any discovered category. The system will:
1. Scan all word packs
2. Filter words based on the `category` field
3. Combine words from all packs that match the selected category

This allows:
- A single word pack to contain words from multiple categories
- Multiple word packs to contribute words to the same category
- Completely custom category schemes

## Creating a Word Pack

### Option 1: Manually create JSON file

1. Create a new file with `.wordspack` extension
2. Follow the format specification above
3. Place it in the `server/data/` directory or upload via Admin Panel

### Option 2: Use the Admin Panel

1. Navigate to the Admin Panel
2. Go to the "Word Packs" tab
3. Click "Upload .wordspack" button
4. Select your `.wordspack` file

The uploaded file will be saved to `server/data/` directory.

## Editing Word Packs

You can edit word packs directly in the Admin Panel:

1. Go to the "Word Packs" tab
2. Click on a word pack from the list
3. Click the "Edit" button
4. Make your changes:
   - Add new words with the "+ Add Word" button
   - Edit word text inline
   - Change difficulty levels with dropdowns
   - Delete words with the 🗑️ button
5. Click "Save" to persist changes

## Best Practices

1. **Organize by category**: Use meaningful category names that match your game themes
2. **Balance difficulty**: Include a good mix of easy, medium, and hard words
3. **Quality over quantity**: Focus on words that work well for the Alias game format
4. **Keep it concise**: Limit each word entry to 1-2 words for better gameplay experience
5. **Version your packs**: Update the version number when making significant changes
6. **Add descriptions**: Help users understand what types of words are in your pack
7. **Test your packs**: Play a few rounds to ensure words are appropriate and fun

## Validation Rules

The system validates word packs with the following rules:

1. Metadata must include `name`, `category`, and `language`
2. Must contain at least one word
3. Each word must have both `word` and `difficulty` fields
4. Difficulty must be one of: "easy", "medium", "hard"
5. Each word entry can contain at most 2 words (e.g., "кіт", "білий ведмідь" are valid, but "голка для шиття" is not)
6. File size limit: 5MB

## Example

See `example-wordpack.wordspack` in the project root for a complete working example.

## File Structure

All word packs are stored in the `server/data/` directory:
- `server/data/default.wordspack` - The default word pack containing all standard Ukrainian words
- `server/data/custom-pack-name.wordspack` - Any custom word packs uploaded via admin panel

## API Endpoints

For programmatic access:

- `GET /admin/api/wordpacks` - List all word packs
- `GET /admin/api/wordpacks/:id` - Get specific word pack
- `PUT /admin/api/wordpacks/:id` - Update word pack
- `POST /admin/api/wordpacks/upload` - Upload new word pack
- `DELETE /admin/api/wordpacks/:id` - Delete word pack
