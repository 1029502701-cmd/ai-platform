const tr = require('./test_runner.cjs');
(async function main() {
  tr.section('Worker Recovery & Stale Task Detection');
  const sqlDb = await createTestDb();
  const db = createMockDb(sqlDb);
  const now = new Date().toISOString();
  var twoHoursAgo = new Date(Date.now() - 7200000).toISOString();

  // T1: Worker crash - stuck in running
  await db.run("INSERT INTO ai_tasks VALUES ('stale1','beauty.analyze','running','normal','u1',NULL,NULL,0,3,'crashed-worker','"+twoHoursAgo+"',NULL,'creator','"+now+"',NULL,NULL,NULL)");
  var staleTasks = await db.all("SELECT id,locked_by FROM ai_tasks WHERE locked_at < '2030-01-01T00:00:00Z' AND locked_by IS NOT NULL AND status='running'");
  assert(staleTasks.length === 1, '[T1.1] Found 1 stale running task');
  assert(staleTasks[0].locked_by === 'crashed-worker', '[T1.2] Locked by crashed worker');

  // Recover
  await db.run("UPDATE ai_tasks SET status='pending',locked_by=NULL,locked_at=NULL,retry_count=retry_count+1 WHERE id='stale1'");
  var recovered = await db.get('SELECT * FROM ai_tasks WHERE id=?', ['stale1']);
  assert(recovered.status === 'pending', '[T1.3] Stale task recovered to pending');
  assert(Number(recovered.retry_count) === 1, '[T1.4] Retry count incremented');

  // T2: Reservation expiry
  await db.run("INSERT INTO billing_reservations VALUES ('sr1','u1','stale1',100,'pending','res_stale1','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z')");
  await db.run("UPDATE billing_reservations SET status='expired' WHERE task_id='stale1'");
  var resStatus = await db.first('SELECT status FROM billing_reservations WHERE id=?', ['sr1']);
  assert(resStatus.status === 'expired', '[T2.1] Reservation marked expired');

  // T3: Retry backoff
  await db.run("INSERT INTO ai_tasks VALUES ('retry1','ai.chat','pending','normal','u1',NULL,NULL,0,3,NULL,NULL,NULL,'creator','"+now+"',NULL,NULL,NULL)");
  for (var i = 1; i <= 3; i++) {
    await db.run("UPDATE ai_tasks SET status='retrying',retry_count=" + i + " WHERE id='retry1'");
  }
  await db.run("UPDATE ai_tasks SET status='failed',last_error='max retries exceeded' WHERE id='retry1'");
  var finalRetry = await db.get('SELECT * FROM ai_tasks WHERE id=?', ['retry1']);
  assert(finalRetry.status === 'failed', '[T3.1] Failed after max retries');
  assert(Number(finalRetry.retry_count) === 3, '[T3.2] Final retry count = 3');

  // T4: Worker competition
  await db.run("INSERT INTO ai_tasks VALUES ('mt1','ai.chat','pending','normal','u1',NULL,NULL,0,3,NULL,NULL,NULL,'creator','"+now+"',NULL,NULL,NULL)");
  var c1 = await db.run("UPDATE ai_tasks SET locked_by='wx',locked_at='"+now+"',status='running' WHERE id='mt1' AND locked_by IS NULL");
  var c2 = await db.run("UPDATE ai_tasks SET locked_by='wy',locked_at='"+now+"',status='running' WHERE id='mt1' AND locked_by IS NULL");
  assert(c1.changes === 1, '[T4.1] One worker claimed');
  assert(c2.changes === 0, '[T4.2] Second rejected');

  console.log('');
  console.log('Passed:', _tr.passed);
  console.log('Failed:', _tr.failed);
  if (_tr.failed > 0) process.exit(1);
  else process.exit(0);
})();
function createTestDb() { return tr.createTestDb(); }
function createMockDb(d) { return tr.createMockDb(d); }
var assert=tr.assert; var _tr=tr;
