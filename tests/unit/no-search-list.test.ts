/**
 * Architectural compliance test:
 * Verifies that the codebase NEVER calls or references YouTube's `search.list` API.
 * Source: AGENTS.md §8 & §12: "Never use search.list. Use playlists.list, playlistItems.list and videos.list."
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function scanFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'screenshots') {
      continue;
    }
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanFiles(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs')) {
      // Exclude this test file itself from the scan
      if (!fullPath.endsWith('no-search-list.test.ts')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

describe('YouTube Compliance: no search.list', () => {
  it('no TypeScript or JavaScript file uses or calls search.list', () => {
    const rootDir = process.cwd();
    const sourceFiles = scanFiles(rootDir);
    expect(sourceFiles.length).toBeGreaterThan(10);

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf-8');
      // Prohibit search.list and /v3/search
      expect(
        content.includes('search.list') || content.includes('/youtube/v3/search'),
        `Forbidden YouTube search API call found in: ${filePath}`
      ).toBe(false);
    }
  });
});
