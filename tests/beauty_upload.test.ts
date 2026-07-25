import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { storeFile } from '../shared/services/storage';
import { analyzeBeauty } from '../shared/services/plugins/beauty.service';

async function run() {
  const fixtureDir = path.resolve(process.cwd(), 'tests', 'fixtures');
  fs.mkdirSync(fixtureDir, { recursive: true });
  const pngPath = path.join(fixtureDir, 'sample.png');
  // Small 1x1 PNG
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kq1XQAAAABJRU5ErkJggg==';
  fs.writeFileSync(pngPath, Buffer.from(b64, 'base64'));

  const buf = fs.readFileSync(pngPath);

  // storeFile with empty env will use local emulator
  const key = 'test_upload_' + Date.now().toString(36) + '.png';
  const res = await storeFile({}, 'beauty-images', key, buf, 'image/png');
  assert(res && res.key === key, 'storeFile returned unexpected key');

  const emulatorPath = path.resolve(process.cwd(), 'tests', '_r2_emulator', 'beauty-images', key);
  assert(fs.existsSync(emulatorPath), 'Uploaded file not found in emulator');

  // Call analyzeBeauty with internal url
  const imageUrl = `/api/apps/beauty/image?key=${encodeURIComponent(key)}`;
  const { reportId, report } = await analyzeBeauty({ userContext: { mock: false }, imageUrl });
  assert(reportId && report, 'analyzeBeauty did not return a report');

  console.log('TypeScript beauty upload test passed (emulated)');
}

run().catch((e) => {
  console.error('Test failed', e);
  process.exit(2);
});
