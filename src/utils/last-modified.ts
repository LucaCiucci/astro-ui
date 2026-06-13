import { execSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Candidates for an Astro URL pathname, in priority order.
 *
 * Examples for `/projects`:
 *   1. `src/pages/projects/index.mdx`
 *   2. `src/pages/projects/index.astro`
 *   3. `src/pages/projects.mdx`
 *   4. `src/pages/projects.astro`
 */
function sourceFileCandidates(pathname: string): string[] {
	const normalised = pathname.replace(/\/$/, '') || '/';

	if (normalised === '/') {
		return ['src/pages/index.mdx', 'src/pages/index.astro'];
	}

	return [
		`src/pages${normalised}/index.mdx`,
		`src/pages${normalised}/index.astro`,
		`src/pages${normalised}.mdx`,
		`src/pages${normalised}.astro`,
	];
}

/**
 * Map an Astro URL pathname to the expected source file path.
 * Tries `.mdx` and `.astro` extensions, checking both flat and index layouts.
 *
 * Examples:
 *   `/`              → `src/pages/index.mdx`
 *   `/projects`      → `src/pages/projects/index.mdx`
 *   `/projects/…`    → `src/pages/projects/….mdx`
 *   `/404`           → `src/pages/404.astro`
 */
export function urlPathToSourceFile(pathname: string): string {
	const candidates = sourceFileCandidates(pathname);

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	// fallback: return first candidate so git at least gets a sensible error
	return candidates[0];
}

/**
 * Get the last modified date of a page by querying git on its source file.
 * Falls back to the build time if git info is not available.
 *
 * @param pathname - The page URL pathname, i.e. `Astro.url.pathname`
 * @returns A Date object representing the last modified date
 */
export function getLastModifiedDate(pathname: string): Date {
	const sourceFile = urlPathToSourceFile(pathname);

	try {
		const output = execSync(
			`git log -1 --format="%ci" -- "${sourceFile}"`,
			{ encoding: 'utf-8', timeout: 3000, cwd: process.cwd() }
		).trim();

		if (output) {
			return new Date(output);
		}
	} catch {
		// git failed — fall through to build time
	}

	return new Date();
}

/**
 * Get the last modified date of a page by querying git on its source file.
 * Falls back to the build time if git info is not available.
 *
 * @param pathname - The page URL pathname, i.e. `Astro.url.pathname`
 * @returns A formatted date string like "June 3, 2026"
 */
export function getLastModifiedFormatted(pathname: string): string {
	const lastModifiedDate = getLastModifiedDate(pathname);
  return formatDate(lastModifiedDate);
}

function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
