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
 * The PNG is saved to `public/og/` (mirroring the original path structure).
 * This directory is gitignored via `/public/og/` in `.gitignore`.
 * If the PNG already exists and is newer than the SVG, it skips the conversion.
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
	const pngPath = resolve(projectRoot, 'public', pngUrl.replace(/^\//, ''));

	// Check if PNG already exists and is up-to-date
	try {
		const svgStat = await stat(svgPath);
		try {
			const pngStat = await stat(pngPath);
			if (pngStat.mtimeMs >= svgStat.mtimeMs) {
				return pngUrl; // PNG is already up-to-date
			}
		} catch {
			// PNG doesn't exist yet — will create it below
		}
	} catch {
		// SVG doesn't exist either — return original src
		return src;
	}

	// Convert SVG → PNG using Sharp
	const sharp = await getSharp();
	const svgBuffer = await readFile(svgPath);
	const pngBuffer = await sharp(svgBuffer).png().toBuffer();

	// Ensure output directory exists
	await mkdir(dirname(pngPath), { recursive: true });
	await writeFile(pngPath, pngBuffer);

	console.log(`[rasterize] Converted ${src} → ${pngUrl}`);

	return pngUrl;
}
