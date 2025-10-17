/**
 * Parser and validator for Yu-Gi-Oh! .ydk deck files
 *
 * .ydk format:
 * - First line: Optional comment (starts with #)
 * - #main section: Main deck card IDs (one per line)
 * - #extra section: Extra deck card IDs (one per line)
 * - !side section: Side deck card IDs (one per line)
 */

export interface ParsedDeck {
  maindeck: number[];
  sidedeck: number[];
  extradeck: number[];
}

export interface ParseResult {
  success: boolean;
  deck?: ParsedDeck;
  error?: string;
}

/**
 * Parse a .ydk file content and extract card IDs
 */
export function parseYdkFile(content: string): ParseResult {
  try {
    const lines = content.split('\n').map(line => line.trim());

    const maindeck: number[] = [];
    const sidedeck: number[] = [];
    const extradeck: number[] = [];

    let currentSection: 'main' | 'extra' | 'side' | null = null;

    for (const line of lines) {
      // Skip empty lines
      if (!line) continue;

      // Check for section headers
      if (line.startsWith('#main')) {
        currentSection = 'main';
        continue;
      }
      if (line.startsWith('#extra')) {
        currentSection = 'extra';
        continue;
      }
      if (line.startsWith('!side')) {
        currentSection = 'side';
        continue;
      }

      // Skip other comments
      if (line.startsWith('#') || line.startsWith('!')) {
        continue;
      }

      // Parse card ID
      const cardId = parseInt(line, 10);

      // Validate card ID
      if (isNaN(cardId) || cardId <= 0) {
        continue; // Skip invalid lines
      }

      // Add to appropriate deck
      if (currentSection === 'main') {
        maindeck.push(cardId);
      } else if (currentSection === 'extra') {
        extradeck.push(cardId);
      } else if (currentSection === 'side') {
        sidedeck.push(cardId);
      }
    }

    // Validate deck structure
    if (maindeck.length === 0) {
      return {
        success: false,
        error: 'Main deck cannot be empty',
      };
    }

    if (maindeck.length < 40 || maindeck.length > 60) {
      return {
        success: false,
        error: `Main deck must be between 40 and 60 cards (found ${maindeck.length})`,
      };
    }

    if (extradeck.length > 15) {
      return {
        success: false,
        error: `Extra deck cannot exceed 15 cards (found ${extradeck.length})`,
      };
    }

    if (sidedeck.length > 15) {
      return {
        success: false,
        error: `Side deck cannot exceed 15 cards (found ${sidedeck.length})`,
      };
    }

    return {
      success: true,
      deck: {
        maindeck,
        sidedeck,
        extradeck,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse .ydk file',
    };
  }
}

/**
 * Validate that a file is a .ydk file
 */
export function isYdkFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.ydk');
}

/**
 * Read and parse a .ydk file from File object
 */
export async function parseYdkFromFile(file: File): Promise<ParseResult> {
  if (!isYdkFile(file.name)) {
    return {
      success: false,
      error: 'File must have .ydk extension',
    };
  }

  try {
    const content = await file.text();
    return parseYdkFile(content);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    };
  }
}
