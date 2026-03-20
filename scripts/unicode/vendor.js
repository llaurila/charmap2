import path from 'node:path';
import { ensureDirectory, unicodeBaseUrl, vendorDir, vendoredSourceFiles } from './shared';
const shouldOverwrite = process.argv.includes('--force');
const run = async () => {
    await ensureDirectory(vendorDir);
    for (const fileName of vendoredSourceFiles) {
        const targetPath = path.join(vendorDir, fileName);
        if (!shouldOverwrite) {
            try {
                await import('node:fs/promises').then(({ stat }) => stat(targetPath));
                console.log(`skip ${fileName}`);
                continue;
            }
            catch {
                // File does not exist yet.
            }
        }
        const response = await fetch(`${unicodeBaseUrl}/${fileName}`);
        if (!response.ok) {
            throw new Error(`Failed to download ${fileName}: ${response.status}`);
        }
        const source = await response.text();
        await import('node:fs/promises').then(({ writeFile }) => writeFile(targetPath, source, 'utf8'));
        console.log(`saved ${fileName}`);
    }
};
run().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
});
