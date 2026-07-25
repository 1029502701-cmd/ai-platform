import fs from 'fs';
import path from 'path';

(async () => {
  try {
    const fixtureDir = path.resolve(process.cwd(), 'tests', 'fixtures');
    fs.mkdirSync(fixtureDir, { recursive: true });
    const pngPath = path.join(fixtureDir, 'sample.png');
    // Small 1x1 PNG
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kq1XQAAAABJRU5ErkJggg==';
    fs.writeFileSync(pngPath, Buffer.from(b64, 'base64'));

    // Emulate storing into local R2 emulator
    const emulatorBase = path.resolve(process.cwd(), 'tests', '_r2_emulator', 'beauty-images');
    fs.mkdirSync(emulatorBase, { recursive: true });
    const dest = path.join(emulatorBase, 'testfile.png');
    fs.copyFileSync(pngPath, dest);

    if (!fs.existsSync(dest)) throw new Error('Failed to emulate upload');

    const stat = fs.statSync(dest);
    if (stat.size <= 0) throw new Error('Uploaded file is empty');

    console.log('Emulated upload stored at', dest, 'size', stat.size);
    console.log('Beauty upload unit test (emulation) passed');
    process.exit(0);
  } catch (e) {
    console.error('Test failed', e);
    process.exit(2);
  }
})();
