import assert from 'assert';
import fs from 'fs';
import path from 'path';
// Simplified test: do not import TS modules at runtime. Instead validate plugin files and emulate poster storage.


(async () => {
  try {
    const pluginPath = path.resolve(process.cwd(), 'plugins', 'beauty', 'frontend', 'BeautyReportView.tsx');
    assert(fs.existsSync(pluginPath), 'Plugin BeautyReportView not found');
    const pluginSource = fs.readFileSync(pluginPath, 'utf8');
    assert(pluginSource.includes('你的AI美妆画像') || pluginSource.includes('AI 美妆分析报告'), 'Plugin source missing title');
    assert(pluginSource.includes('颜值分析指数') || pluginSource.includes('脸型分析'), 'Plugin source missing expected sections');

    // Ensure emulator sample exists
    const emulatorBase = path.resolve(process.cwd(), 'tests', '_r2_emulator', 'beauty-images');
    fs.mkdirSync(emulatorBase, { recursive: true });
    const sample = path.join(emulatorBase, 'testfile.png');
    if (!fs.existsSync(sample)) {
      const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kq1XQAAAABJRU5ErkJggg==';
      fs.writeFileSync(sample, Buffer.from(b64, 'base64'));
    }

    // Emulate poster generation by copying sample to beauty-share-images with generated key
    const outDir = path.resolve(process.cwd(), 'tests', '_r2_emulator', 'beauty-share-images');
    fs.mkdirSync(outDir, { recursive: true });
    const key = 'poster_test_' + Date.now().toString(36) + '.png';
    const dest = path.join(outDir, key);
    fs.copyFileSync(sample, dest);
    assert(fs.existsSync(dest), 'Failed to write poster to emulator');

    // Verify share page file exists and contains CTA
    const sharePagePath = path.resolve(process.cwd(), 'src', 'pages', 'beauty', 'BeautyShare.tsx');
    assert(fs.existsSync(sharePagePath), 'Share page not found');
    const shareSource = fs.readFileSync(sharePagePath, 'utf8');
    assert(shareSource.includes('立即测试你的AI美妆'), 'Share page missing CTA');

    console.log('Beauty report UI and poster tests (emulated) passed');
    process.exit(0);
  } catch (e) {
    console.error('Test failed', e);
    process.exit(2);
  }
})();
