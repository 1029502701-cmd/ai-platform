import assert from 'assert';
import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { analyzeBeauty } from '../shared/services/plugins/beauty.service';
import PluginBeautyReportView from '../plugins/beauty/frontend/BeautyReportView';
import { onRequestPost } from '../functions/api/apps/beauty/share/poster';

async function run() {
  // Ensure emulator dirs
  const emulatorBase = path.resolve(process.cwd(), 'tests', '_r2_emulator', 'beauty-images');
  fs.mkdirSync(emulatorBase, { recursive: true });
  const sample = path.join(emulatorBase, 'testfile.png');
  if (!fs.existsSync(sample)) {
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kq1XQAAAABJRU5ErkJggg==';
    fs.writeFileSync(sample, Buffer.from(b64, 'base64'));
  }

  const { reportId, report } = await analyzeBeauty({ userContext: { mock: true }, imageUrl: `/api/apps/beauty/image?key=${encodeURIComponent('testfile.png')}` });
  assert(report, 'analyzeBeauty did not return a report');

  // Render the plugin to string and ensure key content present
  const html = ReactDOMServer.renderToString(React.createElement(PluginBeautyReportView as any, { report }));
  assert(html.includes('你的AI美妆画像') || html.includes('AI 美妆分析报告'), 'Rendered HTML missing title');
  assert(html.includes(report.faceShape.shape) || html.includes(report.makeup.base), 'Rendered HTML missing report data');

  // Call share poster API handler directly (serverless function)
  const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ reportId: report.analysisId || reportId }) });
  const res: any = await (onRequestPost as any)({ request: req, env: {} });
  const body = await res.json();
  assert(body && body.success && body.data && typeof body.data.imageUrl === 'string', 'share poster did not return imageUrl');

  // Check file stored in R2 emulator path
  const url = body.data.imageUrl as string;
  const parsed = new URL('http://localhost' + url);
  const key = parsed.searchParams.get('key') || parsed.searchParams.get('Key') || parsed.searchParams.get('k');
  assert(key, 'No key found in returned imageUrl');
  const emulatorPath = path.resolve(process.cwd(), 'tests', '_r2_emulator', 'beauty-share-images', key);
  assert(fs.existsSync(emulatorPath), 'Poster file not found in emulator: ' + emulatorPath);

  // Share page rendering (read-only)
  const shareHtml = ReactDOMServer.renderToString(React.createElement(PluginBeautyReportView as any, { report, readOnly: true }));
  assert(shareHtml.includes('你的AI美妆画像') || shareHtml.includes(report.makeup.base), 'Share page render missing content');

  console.log('Beauty report UI and poster tests passed');
}

run().catch((e) => {
  console.error('Test failed', e);
  process.exit(2);
});
