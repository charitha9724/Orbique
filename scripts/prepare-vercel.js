// Run after `npx expo export --platform web` and before `vercel deploy`:
//   node scripts/prepare-vercel.js
//
// 1. Vercel never uploads folders called "node_modules", but the web export puts the
//    icon font under dist/assets/node_modules/... So we move it to dist/assets/vendor/
//    and update the paths inside the built files.
// 2. Any built file we change gets a new name, so phones and browsers that cached the
//    old version (cached for a year) download the fixed one.
// 3. Adds the Vercel routing settings.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');

if (fs.existsSync(from)) {
  fs.cpSync(from, to, { recursive: true });
  fs.rmSync(from, { recursive: true, force: true });
}

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const textFiles = () => walk(dist).filter((f) => /\.(js|html|css|json)$/.test(f));

// Fix the font paths, remembering which bundles changed.
const renames = [];
for (const file of textFiles()) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('/assets/node_modules/')) continue;
  const fixed = text.split('/assets/node_modules/').join('/assets/vendor/');
  if (file.includes(`${path.sep}_expo${path.sep}`) && file.endsWith('.js')) {
    // new name = old name + short hash of the new content
    const hash = crypto.createHash('md5').update(fixed).digest('hex').slice(0, 8);
    const newFile = file.replace(/\.js$/, `-${hash}.js`);
    fs.writeFileSync(newFile, fixed);
    fs.rmSync(file);
    renames.push([path.basename(file), path.basename(newFile)]);
  } else {
    fs.writeFileSync(file, fixed);
  }
}

// Point every reference at the renamed bundles.
for (const file of textFiles()) {
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [oldName, newName] of renames) {
    if (text.includes(oldName)) {
      text = text.split(oldName).join(newName);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(file, text);
}

// Every page (e.g. /home, /chat/123) loads the app; the app then shows the right screen.
// index.html is never cached, so new versions show up straight away.
fs.writeFileSync(
  path.join(dist, 'vercel.json'),
  JSON.stringify(
    {
      rewrites: [{ source: '/((?!_expo/|assets/).*)', destination: '/index.html' }],
      headers: [
        { source: '/_expo/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
        { source: '/(index.html)?', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      ],
    },
    null,
    2,
  ) + '\n',
);

console.log(
  `Ready for Vercel: moved icon fonts, renamed ${renames.length} bundle(s): ${renames.map((r) => r[1]).join(', ') || '-'}`,
);
