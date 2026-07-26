const tr = require('./test_runner.cjs');
(async function main() {
  tr.section('Queue Test Suite - Task Lifecycle');
  const sqlDb = await createTestDb();
  const db = createMockDb(sqlDb);
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 3600000).toISOString();
  const past = new Date(Date.now() - 7200000).toISOString();

  async function itask(id, status, priority, lockedBy, retryCount) {
    var lb = lockedBy;
    var la = lockedBy ? now : null;
    var lbaSql = lb ? "'" + lb + "'" : 'NULL';
    var laSql = la ? "'" + la + "'" : 'NULL';
    var sql = "INSERT INTO ai_tasks VALUES ('" + id + "', 'ai.task', '" + status + "', '" + priority + "', 'u1', NULL, NULL, " + (retryCount||0) + ", 3, " + lbaSql + ", " + laSql + ", NULL, 'creator', '" + now + "', NULL, NULL, NULL)";
    await db.run(sql);
  }

  await itask('t1', 'pending', 'normal', null, 0);
  var row1 = await db.get('SELECT * FROM ai_tasks WHERE id=?', ['t1']);
  assert(row1.id === 't1', '[T1.1] Task created with id=t1');
  assert(row1.status === 'pending', '[T1.2] Task status is pending');
  assert(row1.priority === 'normal', '[T1.3] Task priority is normal');

  await db.run("UPDATE ai_tasks SET locked_by='w1',locked_at='" + now + "',status='running',started_at='" + now + "' WHERE id='t1'");
  var claimed = await db.get('SELECT * FROM ai_tasks WHERE id=?', ['t1']);
  assert(claimed.status === 'running', '[T2.1] Task status changed to running');
  assert(claimed.locked_by === 'w1', '[T2.2] Task locked by w1');

  await db.run("UPDATE ai_tasks SET status='success',finished_at='" + future + "' WHERE id='t1'");
  var sr = await db.get('SELECT * FROM ai_tasks WHERE id=?', ['t1']);
  assert(sr.status === 'success', '[T3.1] Task marked as success');
  assert(sr.finished_at !== null && sr.finished_at !== '', '[T3.2] Finish time set on success');

  await itask('t2', 'running', 'normal', 'w2', 1);
  await db.run("UPDATE ai_tasks SET status='failed',last_error='provider_error',retry_count=1 WHERE id='t2'");
  var fr = await db.get('SELECT * FROM ai_tasks WHERE id=?', ['t2']);
  assert(fr.status === 'failed', '[T4.1] Task marked as failed');
  assert(fr.last_error === 'provider_error', '[T4.2] Error message preserved');

  await itask('t3', 'pending', 'urgent', null, 0);
  await itask('t4', 'pending', 'high', null, 0);
  await itask('t5', 'pending', 'normal', null, 0);
  await itask('t6', 'pending', 'low', null, 0);
  var prioSql = "SELECT id,priority FROM ai_tasks WHERE status='pending' AND id IN ('t3','t4','t5','t6') ORDER BY CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END ASC";
  var priorities = await db.all(prioSql);
  assert(priorities[0].id === 't6', '[T5.1] Lowest: low first');
  assert(priorities[3].id === 't3', '[T5.4] Highest: urgent last');

  var res1 = await db.run("UPDATE ai_tasks SET locked_by='worker-a',locked_at='" + now + "' WHERE id='t5' AND locked_by IS NULL");
  assert(res1.changes === 1, '[T6a] First lock succeeded');
  var res2 = await db.run("UPDATE ai_tasks SET locked_by='worker-b',locked_at='" + now + "' WHERE id='t5' AND locked_by IS NULL");
  assert(res2.changes === 0, '[T6b] Second lock failed');
  await db.run("UPDATE ai_tasks SET locked_by=NULL WHERE id='t5'");

  await itask('t7', 'retrying', 'normal', null, 2);
  await db.run("UPDATE ai_tasks SET next_run_at='" + past + "' WHERE id='t7'");
  var rr = await db.get('SELECT * FROM ai_tasks WHERE id=?', ['t7']);
  assert(rr.status === 'retrying', '[T7.1] Task in retrying state');
  assert(Number(rr.retry_count) === 2, '[T7.2] Retry count = 2');

  // Keep one task running for T8d stats check
  await db.run("UPDATE ai_tasks SET locked_by='runner-x',locked_at='" + now + "',status='running',started_at='" + now + "' WHERE id='t5'");
  
  var stats = await db.all('SELECT status, COUNT(*) as cnt FROM ai_tasks GROUP BY status');
  var statuses = {};
  stats.forEach(function(s) { statuses[s.status] = s.cnt; });
  assert(statuses.pending >= 1, '[T8a] At least 1 pending');
  assert(statuses.success >= 1, '[T8b] At least 1 success');
  assert(statuses.failed >= 1, '[T8c] At least 1 failed');
  assert(statuses.running >= 1, '[T8d] At least 1 running');

  console.log('');
  console.log('Passed:', _tr.passed);
  console.log('Failed:', _tr.failed);
  if (_tr.failed > 0) process.exit(1);
  else process.exit(0);
})();
async function createTestDb() { return tr.createTestDb(); }
function createMockDb(d) { return tr.createMockDb(d); }
var assert=tr.assert; var _tr=tr;
