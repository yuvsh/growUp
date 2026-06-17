// Architecture guard for the Clinic Mode ephemeral contract.
//
// Clinic Mode must store NOTHING (docs/HLD-clinic-mode.md §8): no file under
// src/features/clinic/** may import from the data, auth, or supabase layers, and
// none may touch localStorage/sessionStorage directly. If this test fails, the
// ephemeral guarantee has been broken — fix the import, do not weaken the test.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CLINIC_DIR = dirname(fileURLToPath(import.meta.url));

/** Imports/usage that would break the "nothing is stored" guarantee. */
const FORBIDDEN_IMPORT_PATTERNS: readonly RegExp[] = [
  /from\s+['"][^'"]*\/data\//,
  /from\s+['"][^'"]*\/auth\//,
  /from\s+['"][^'"]*\/lib\/supabase/,
  // Actual web-storage access (a property/call), not mere mentions in prose.
  /(?:window\.)?localStorage\s*[.[]/,
  /(?:window\.)?sessionStorage\s*[.[]/,
];

/**
 * Strip line and block comments so the contract description inside the clinic
 * files (which names these very tokens) does not trip the guard. This is a
 * deliberately simple stripper — adequate for our own TS/TSX sources.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    // Skip this guard itself — it intentionally names the forbidden tokens.
    if (entry === 'no-persistence.test.ts') {
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Clinic Mode ephemeral contract', () => {
  const sourceFiles = collectSourceFiles(CLINIC_DIR);

  it('finds clinic source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(sourceFiles)(
    'does not import persistence/auth or touch web storage: %s',
    (filePath) => {
      const contents = stripComments(readFileSync(filePath, 'utf8'));
      for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
        expect(
          pattern.test(contents),
          `${filePath} violates the ephemeral contract (matched ${pattern})`,
        ).toBe(false);
      }
    },
  );
});
