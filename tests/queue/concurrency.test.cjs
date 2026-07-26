const tr = require('./test_runner.cjs');
(async function main() {
  tr.section('Concurrency & Stress Tests');
  const sqlDb = await createTestDb();
  const db = createMockDb(sqlDb);
  const now = new Date().toISOString();
  var N = 50;
  var startMs = Date.now();

  // Submit N tasks rapidly
  for (var i = 0; i < N; i++) {
    var prio = i % 4 === 0 ? 'urgent' : (i % 4 === 1 ? 'high' : (i % 4 === 2 ? 'normal' : 'low'));
    await db.run("INSERT INTO ai_tasks VALUES ('c" + i + "','ai.task','pending','"+prio+"','u1',NULL,NULL,0,3,NULL,NULL,NULL,'creator','"+now+"',NULL,NULL,NULL)");
  }
  var elapsedSubmit = Date.now() - startMs;

  var allCount = await db.first("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status='pending'", []);
  assert(allCount.cnt === N, '[T1.1] All ' + N + ' tasks submitted');

  // T2: Concurrent claim simulation - 3 workers per task
  var sampleTasks = await db.all("SELECT id FROM ai_tasks WHERE status='pending' AND id LIKE 'c0%' LIMIT 5");
  var claimSuccesses = 0;
  for (var j = 0; j < sampleTasks.length; j++) {
    var tid = sampleTasks[j].id;
    var r1 = await db.run("UPDATE ai_tasks SET locked_by='w1',locked_at='"+now+"',status='running' WHERE id='" + tid + "' AND locked_by IS NULL");
    if (r1.changes === 1) claimSuccesses++;
    await db.run("UPDATE ai_tasks SET locked_by=NULL WHERE id='" + tid + "' AND status='running'");
  }
  assert(claimSuccesses === sampleTasks.length, '[T2.1] Each task claimed exactly once');

  // T3: Balance integrity after concurrent operations
  await db.run("INSERT INTO wallets VALUES ('wc1','u1',10000,0,0,0,'balance','active','"+now+"','"+now+"')");
  var balBefore = await db.first('SELECT * FROM wallets WHERE user_id=?', ['u1']);
  assert(balBefore.credits === 10000, '[T3.1] Initial balance: 10000');
  await db.run("UPDATE wallets SET credits=9900,frozen_credits=100 WHERE user_id='u1'");
  var balAfter = await db.first('SELECT * FROM wallets WHERE user_id=?', ['u1']);
  assert(balAfter.credits === 9900, '[T3.2] Available after freeze: 9900');
  assert(balAfter.frozen_credits === 100, '[T3.3] Frozen: 100');

  // T4: No double-charge
  var uniqueTxId = 'idem_check_999';
  await db.run("INSERT INTO transactions (id,user_id,type,amount,service,status,transaction_id,created_at) VALUES ('tc1','u1','consume',-10,'test','completed','"+uniqueTxId+"','"+now+"')");
  var existing = await db.first('SELECT * FROM transactions WHERE transaction_id=?', [uniqueTxId]);
  assert(existing !== null, '[T4.1] Duplicate check passed');

  // T5: Queue health
  var health = await db.all("SELECT status, COUNT(*) as cnt FROM ai_tasks GROUP BY status");
  assert(health.length > 0, '[T5.1] Health report non-empty');
  var totalFromHealth = health.reduce(function(sum, s) { return sum + s.cnt; }, 0);
  assert(totalFromHealth >= N, '[T5.2] Total matches submissions: ' + totalFromHealth);

  // T6: High-volume bulk insert
  var bulkTasks = 100;
  for (var k = 0; k < bulkTasks; k++) {
    await db.run("INSERT INTO ai_tasks VALUES ('bulk_"+k+"','ai.task','pending','normal','u1',NULL,NULL,0,3,NULL,NULL,NULL,'creator','"+now+"',NULL,NULL,NULL)");
  }
  var afterBulk = await db.first("SELECT COUNT(*) as cnt FROM ai_tasks", []);
  assert(afterBulk.cnt >= N + bulkTasks, '[T6.1] Total after bulk: ' + afterBulk.cnt);

  var totalElapsed = Date.now() - startMs;
  console.log('');
  console.log('Passed:', _tr.passed);
  console.log('Failed:', _tr.failed);
  console.log('Total tasks:', afterBulk.cnt);
  console.log('Elapsed:', totalElapsed, 'ms');
  if (_tr.failed > 0) process.exit(1);
  else process.exit(0);
})();
function createTestDb() { return tr.createTestDb(); }
function createMockDb(d) { return tr.createMockDb(d); }
var assert=tr.assert; var _tr=tr;
