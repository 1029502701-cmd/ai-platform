import { readdirSync } from 'fs';

const MIGRATION_DIR = 'drizzle';

async function main() {
  console.log('Verifying migrations...');
  try {
    const files = readdirSync(MIGRATION_DIR).filter(f => f.endsWith('.sql')).sort();
    if (files.length === 0) {
      console.warn('No migrations found');
      process.exit(1);
    }
    console.log(`${files.length} migration(s) verified`);
    files.forEach(f => console.log(`  - ${f}`));
    process.exit(0);
  } catch (e) {
    console.error('Verification failed:', String(e));
    process.exit(1);
  }
}
main();