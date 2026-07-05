import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';

type SharpFn = (input?: Buffer | string) => import('sharp').Sharp;

let sharpInstance: SharpFn | null = null;

async function getSharp(): Promise<SharpFn> {
	if (!sharpInstance) {
		const mod = await import('sharp');
		sharpInstance = mod.default as SharpFn;
	}
	return sharpInstance;
}

/**
 * Converts an SVG image at the given URL path to a PNG using Sharp.
 *
 * The PNG is written to both `public/og/` (served by Vite dev server)
 * and `dist/og/` (build output — `public/` is copied to `dist/` before
 * components render, so a direct write to `dist/` is needed).
 * Both directories are gitignored.
 * If the PNG already exists and is newer than the SVG, it skips conversion.
 * If the image is not an SVG, the original path is returned unchanged.
 *
 * @param src - URL path to the image (e.g. `"/projects/foo/image.svg"`)
 * @param projectRoot - Absolute path to the project root (defaults to `process.cwd()`)
 * @returns The URL path to the PNG, or the original path if no conversion was needed
 */
export async function rasterizeOgImage(
	src: string,
	projectRoot: string = process.cwd(),
): Promise<string> {
	if (!src.endsWith('.svg')) {
		return src;
	}

	const svgPath = resolve(projectRoot, 'public', src.replace(/^\//, ''));
	const relPngPath = src.replace(/^\//, '').replace(/\.svg$/, '.png');
	const pngUrl = `/og/${relPngPath}`;
	const pngPathPublic = resolve(projectRoot, 'public', pngUrl.replace(/^\//, ''));
	const pngPathDist = resolve(projectRoot, 'dist', pngUrl.replace(/^\//, ''));

	// Check if PNG already exists and is up-to-date (check either location)
	try {
		const svgStat = await stat(svgPath);
		const cachedPath = await stat(pngPathPublic).catch(() => stat(pngPathDist).catch(() => null));
		if (cachedPath && cachedPath.mtimeMs >= svgStat.mtimeMs) {
			return pngUrl; // PNG is already up-to-date
		}
	} catch {
		// SVG doesn't exist — return original src
		return src;
	}

	// Convert SVG → PNG using Sharp
	const sharp = await getSharp();
	const svgBuffer = await readFile(svgPath);
	const pngBuffer = await sharp(svgBuffer).png().toBuffer();

	// Write to public/ (served by Vite dev server)
	await mkdir(dirname(pngPathPublic), { recursive: true });
	await writeFile(pngPathPublic, pngBuffer);

	// Also write to dist/ (build output — public/ is copied before components render)
	await mkdir(dirname(pngPathDist), { recursive: true });
	await writeFile(pngPathDist, pngBuffer);

	console.log(`[rasterize] Converted ${src} → ${pngUrl}`);

	return pngUrl;
}
