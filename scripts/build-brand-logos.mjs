/** Sync local brand assets. Sources: content/brand-assets.json.
 * Keeps existing brand metadata and uploaded logos. npm run brands:sync [-- --refresh]
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(root, 'content/seed.json');
const manifest = JSON.parse(await readFile(path.join(root, 'content/brand-assets.json'), 'utf8'));
const seed = JSON.parse(await readFile(seedPath, 'utf8'));
const icons = await import('simple-icons');
function frameSvg(svg, asset) {
  // Trim only the full white canvas used by some source files, keeping white
  // details inside the actual mark. The drawing paths themselves are unchanged.
  if (asset.removeCanvas) {
    svg = svg.replace(/<path fill="#fff" d="M0 0h[\d.]+v[\d.]+H0V0z"\s*\/>/, '');
  }
  if (asset.viewBox) {
    svg = svg.replace(/<svg\b[^>]*>/, (tag) => tag
      .replace(/\s(?:width|height|viewBox)="[^"]*"/g, '')
      .replace(/>$/, ` viewBox="${asset.viewBox}">`));
  }
  return svg;
}
await mkdir(path.join(root, 'public/brands'), { recursive: true });
// Complete downloads before updating seed or database.
await Promise.all(Object.entries(manifest).map(async ([slug, asset]) => {
  const destination = path.join(root, 'public', asset.file);
  if (asset.icon) {
    const icon = icons[asset.icon];
    if (!icon?.path) throw new Error(`Unknown Simple Icons asset: ${asset.icon}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${asset.viewBox || '0 0 24 24'}"><path fill="#${icon.hex}" d="${icon.path}"/></svg>\n`;
    await writeFile(destination, frameSvg(svg, asset));
    return;
  }
  if (!process.argv.includes('--refresh')) {
    try {
      await access(destination);
      if (asset.file.endsWith('.svg')) await writeFile(destination, frameSvg(await readFile(destination, 'utf8'), asset));
      return;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const response = await fetch(asset.url, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${slug}: asset HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (asset.file.endsWith('.svg')) {
    const svg = bytes.toString('utf8');
    if (!svg.includes('<svg') || /<script\b|<foreignObject\b|\bon\w+\s*=/i.test(svg)) throw new Error(`${slug}: invalid SVG`);
  } else if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`${slug}: invalid PNG`);
  }
  await writeFile(destination, asset.file.endsWith('.svg') ? frameSvg(bytes.toString('utf8'), asset) : bytes);
}));
for (const brand of seed.brands) {
  const asset = manifest[brand.slug];
  if (asset && (!brand.logo_key || brand.logo_key.startsWith('/brands/'))) brand.logo_key = `/${asset.file}`;
}
await writeFile(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
const dbFile = process.env.DATABASE_FILE || path.join(root, 'data/app.db');
let dbExists = false;
try { await access(dbFile); dbExists = true; } catch { /* Fresh installs use seed. */ }
if (dbExists) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(dbFile);
  db.exec('PRAGMA busy_timeout = 5000');
  const insert = db.prepare(`INSERT INTO brands
    (slug, name, legal_name, logo_key, brand_color, website, categories,
     supply_relation, supply_note, internal_note, is_public, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`);
  const update = db.prepare(`UPDATE brands SET logo_key = ? WHERE slug = ?
    AND (logo_key = '' OR logo_key LIKE '/brands/%')`);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const brand of seed.brands) {
      insert.run(brand.slug, brand.name, brand.legal_name || '', brand.logo_key || '',
        brand.brand_color, brand.website || '', brand.categories || '',
        brand.supply_relation || 'to_be_confirmed', brand.supply_note || '',
        brand.internal_note || '', brand.is_public ? 1 : 0, brand.sort ?? 100);
      if (manifest[brand.slug]) update.run(`/${manifest[brand.slug].file}`, brand.slug);
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}
console.log(`Synced ${Object.keys(manifest).length} logos and ${seed.brands.length} catalog entries.`);
