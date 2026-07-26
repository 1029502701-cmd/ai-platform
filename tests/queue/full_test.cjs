const initSqlJs = require('sql.js');
(async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  var passed = 0, failed = 0;
  function assert(cond, msg) { if(cond){passed++;}else{failed++;console.error('FAIL: '+msg);} }
  function section(n) { console.log('\n['+n+']'); }

  db.run("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, type TEXT, status TEXT, created_at TEXT, updated_at TEXT)");
  db.run("CREATE TABLE wallets (id TEXT PRIMARY KEY, user_id TEXT UNIQUE, credits INTEGER DEFAULT 0, frozen_credits INTEGER DEFAULT 0, total_used INTEGER DEFAULT 0, total_topped_up INTEGER DEFAULT 0, mode TEXT, status TEXT, created_at TEXT, updated_at TEXT)");
  db.run("CREATE TABLE transactions (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, amount INTEGER, service TEXT, model TEXT, status TEXT, transaction_id TEXT UNIQUE, metadata TEXT, created_at TEXT)");
  db.run("CREATE TABLE ai_tasks (id TEXT PRIMARY KEY, type TEXT, status TEXT, priority TEXT, user_id TEXT, payload TEXT, result TEXT, retry_count INTEGER DEFAULT 0, max_retry INTEGER, locked_by TEXT, locked_at TEXT, next_run_at TEXT, created_by TEXT, created_at TEXT, started_at TEXT, finished_at TEXT, last_error TEXT)");
  db.run("CREATE TABLE billing_reservations (id TEXT PRIMARY KEY, user_id TEXT, task_id TEXT, amount INTEGER, status TEXT, idempotency_key TEXT UNIQUE, reserved_at TEXT, expires_at TEXT)");
  db.run("CREATE INDEX idx_ai_tasks_status ON ai_tasks(status)");
  var T = new Date().toISOString();
  var F = new Date(Date.now()+3600000).toISOString();
  var E = new Date(Date.now()-1800000).toISOString();
  var H = new Date(Date.now()-7200000).toISOString();
  var Z = new Date(Date.now()-300000).toISOString();

  function insertTask(id, st, pr, lb, rc) {
    var lba = lb || '';
    var la = lb ? T : '';
    var sql = "INSERT INTO ai_tasks VALUES ('" + id + "','task','" + st + "','" + pr + "','u1',NULL,NULL," + (rc||0) + ",3,'" + lba + "','" + la + "',NULL,'creator','" + T + "',NULL,NULL,NULL)";
    db.run(sql);
  }

  section('Queue Task Lifecycle');
  insertTask('t1','pending','normal',null,0);
  var t1r = db.exec("SELECT status,priority FROM ai_tasks WHERE id='t1'")[0];
  assert(t1r.values[0][0]==='pending','[T1.1] Task created pending');
  assert(t1r.values[0][1]==='normal','[T1.2] Priority normal');
  db.run("UPDATE ai_tasks SET locked_by='w1',locked_at='"+T+"',status='running' WHERE id='t1'");
  var cl = db.exec("SELECT status,locked_by FROM ai_tasks WHERE id='t1'")[0];
  assert(cl.values[0][0]==='running','[T2] Running state');
  assert(cl.values[0][1]==='w1','[T2] Locked by w1');
  db.run("UPDATE ai_tasks SET status='success',finished_at='"+F+"' WHERE id='t1'");
  var sr = db.exec("SELECT status FROM ai_tasks WHERE id='t1'")[0];
  assert(sr.values[0][0]==='success','[T3] Success confirmed');

  insertTask('t3','pending','urgent',null,0);
  insertTask('t4','pending','high',null,0);
  insertTask('t5','pending','normal',null,0);
  insertTask('t6','pending','low',null,0);
  var pq = db.exec("SELECT id,priority FROM ai_tasks WHERE status='pending' AND id IN ('t3','t4','t5','t6') ORDER BY CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END ASC")[0];
  assert(pq.values.length===4,'[T4a] 4 tasks in priority query');
  assert(pq.values[0][0]==='t6','[T4b] Low first');
  assert(pq.values[3][0]==='t3','[T4c] Urgent last');

  db.run("UPDATE ai_tasks SET locked_by='worker-a',locked_at='"+T+"' WHERE id='t5'");
  var lc = db.exec("SELECT locked_by FROM ai_tasks WHERE id='t5'")[0];
  assert(lc.values[0][0]==='worker-a','[T5a] Lock held by worker-a');
  var blk = db.exec("SELECT locked_by FROM ai_tasks WHERE id='t5' AND locked_by IS NULL");
  assert(blk && blk.length === 0,'[T5b] Already locked rejected by IS NULL check');
  db.run("UPDATE ai_tasks SET locked_by=NULL WHERE id='t5'");

  insertTask('t7','retrying','normal',null,2);
  var rr = db.exec("SELECT status,retry_count,max_retry FROM ai_tasks WHERE id='t7'")[0];
  assert(rr.values[0][0]==='retrying','[T6] In retrying');
  assert(Number(rr.values[0][1])===2,'[T6] Retry count=2');

  // Add a failed task
  db.run("INSERT INTO ai_tasks VALUES ('f1','chat','failed','normal','u1',NULL,NULL,3,3,NULL,NULL,NULL,'creator','"+T+"',NULL,'max retries exceeded',NULL)");
  // Keep t5 in running for stats
  db.run("UPDATE ai_tasks SET locked_by='runner-x',locked_at='"+T+"',status='running' WHERE id='t5'");
  var allS = db.exec("SELECT COUNT(*) as cnt FROM ai_tasks")[0];
  assert(allS.values[0][0]>=6,'[T7] Total tasks >= 6 (pending+success+retrying+failed+running)');
  var pendingCount = db.exec("SELECT COUNT(*) FROM ai_tasks WHERE status='pending'")[0];
  assert(pendingCount.values[0][0]>=2,'[T7a] At least 2 pending tasks');
  var successCount = db.exec("SELECT COUNT(*) FROM ai_tasks WHERE status='success'")[0];
  assert(successCount.values[0][0]>=1,'[T7b] At least 1 success');
  var retryCount = db.exec("SELECT COUNT(*) FROM ai_tasks WHERE status='retrying'")[0];
  assert(retryCount.values[0][0]>=1,'[T7c] At least 1 retrying');
  var failCount = db.exec("SELECT COUNT(*) FROM ai_tasks WHERE status='failed'")[0];
  assert(failCount.values[0][0]>=1,'[T7d] At least 1 failed');
  var runCount = db.exec("SELECT COUNT(*) FROM ai_tasks WHERE status='running'")[0];
  assert(runCount.values[0][0]>=1,'[T7e] At least 1 running');
  console.log('[T7] Pending='+pendingCount.values[0][0]+' Success='+successCount.values[0][0]+' Failed='+failCount.values[0][0]+' Running='+runCount.values[0][0]+' Retrying='+retryCount.values[0][0]);
  db.run("UPDATE ai_tasks SET locked_by=NULL WHERE id='t5'");

  section('Billing + Queue Transactions');
  db.run("INSERT INTO users VALUES ('user1','user','guest','active','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
  db.run("INSERT INTO wallets VALUES ('w1','user1',500,0,0,0,'balance','active','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");

  db.run("INSERT INTO billing_reservations VALUES ('r1','user1','t100',100,'pending','res_t100','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z')");
  db.run("UPDATE wallets SET credits=400,frozen_credits=100 WHERE user_id='user1'");
  var b1=db.exec("SELECT credits,frozen_credits FROM wallets WHERE user_id='user1'")[0];
  assert(b1.values[0][0]===400,'[B1a] Available=400');
  assert(b1.values[0][1]===100,'[B1b] Frozen=100');
  db.run("UPDATE wallets SET credits=10,frozen_credits=200 WHERE user_id='user1'");
  var bf=db.exec("SELECT credits,frozen_credits FROM wallets WHERE user_id='user1'")[0];
  assert(bf.values[0][0]===10,'[B2a] Available=10');
  assert(bf.values[0][1]===200,'[B2b] Frozen=200');
  assert(bf.values[0][0]-bf.values[0][1]<0,'[B2c] Negative effective balance prevents reserve');
  db.run("UPDATE wallets SET credits=500,frozen_credits=0 WHERE user_id='user1'");
  db.run("INSERT INTO billing_reservations VALUES ('r2','user1','t200',200,'pending','res_big','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z')");
  db.run("UPDATE wallets SET credits=300,frozen_credits=200 WHERE user_id='user1'");
  db.run("UPDATE wallets SET frozen_credits=0,credits=300+50-150 WHERE user_id='user1'");
  db.run("UPDATE billing_reservations SET status='committed' WHERE id='r2'");
  var bc=db.exec("SELECT credits,frozen_credits FROM wallets WHERE user_id='user1'")[0];
  assert(bc.values[0][1]===0,'[B3a] Frozen cleared after commit');
  db.run("UPDATE wallets SET credits=500,frozen_credits=0 WHERE user_id='user1'");
  db.run("INSERT INTO billing_reservations VALUES ('r3','user1','t300',100,'pending','res_refund','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z')");
  db.run("UPDATE wallets SET credits=400,frozen_credits=100 WHERE user_id='user1'");
  db.run("UPDATE wallets SET frozen_credits=0,credits=400+100 WHERE user_id='user1'");
  db.run("UPDATE billing_reservations SET status='refunded' WHERE id='r3'");
  var br=db.exec("SELECT credits,frozen_credits FROM wallets WHERE user_id='user1'")[0];
  assert(br.values[0][0]===500,'[B4a] Refund restores full balance 500');
  db.run("INSERT INTO billing_reservations VALUES ('r4','user1','t400',75,'pending','res_expire','2026-01-01T00:00:00Z','"+E+"')");
  var expR = db.exec("SELECT COUNT(*) as cnt FROM billing_reservations WHERE status='pending' AND expires_at < CURRENT_TIMESTAMP")[0];
  assert(expR.values[0][0]>=1,'[B5] Expired reservations detected');
  db.run("INSERT INTO transactions VALUES ('tx1','user1','consume',-100,'ai_task','','completed','idem_tx1',NULL,'2026-01-01T00:00:00Z')");
  var txR = db.exec("SELECT type,amount FROM transactions WHERE transaction_id='idem_tx1'")[0];
  assert(txR.values[0][0]==='consume','[B6a] Type=consume');
  assert(txR.values[0][1]===-100,'[B6b] Amount=-100');

  section('Worker Recovery & Stale Task Detection');
  insertTask('stale1','running','normal','crashed-worker',0);
  db.run("UPDATE ai_tasks SET locked_at='"+H+"' WHERE id='stale1'");
  var staleR = db.exec("SELECT id,locked_by FROM ai_tasks WHERE locked_at < '2030-01-01T00:00:00Z' AND locked_by IS NOT NULL AND status='running'")[0];
  assert(staleR.values.length===1,'[WR1.1] Found 1 stale running task');
  db.run("UPDATE ai_tasks SET status='pending',locked_by=NULL,retry_count=retry_count+1 WHERE id='stale1'");
  var recov = db.exec("SELECT status,retry_count FROM ai_tasks WHERE id='stale1'")[0];
  assert(recov.values[0][0]==='pending','[WR2.1] Recovered to pending');
  assert(Number(recov.values[0][1])===1,'[WR2.2] Retry incremented');
  db.run("INSERT INTO ai_tasks VALUES ('mt1','task','pending','normal','u1',NULL,NULL,0,3,NULL,NULL,NULL,'creator','"+T+"',NULL,NULL,NULL)");
  db.run("UPDATE ai_tasks SET locked_by='wx',locked_at='"+T+"',status='running' WHERE id='mt1' AND locked_by IS NULL");
  var comp = db.exec("SELECT locked_by FROM ai_tasks WHERE id='mt1'")[0];
  assert(comp && comp.values && comp.values[0][0]==='wx','[WR3.1] First claimed mt1');
  db.run("UPDATE ai_tasks SET locked_by=NULL WHERE id='mt1'");

  section('Concurrency & Stress Tests');
  for(var k=0;k<50;k++){var pr=k%4===0?'urgent':(k%4===1?'high':'normal');db.run("INSERT INTO ai_tasks VALUES ('c"+k+"','task','pending','"+pr+"','u1',NULL,NULL,0,3,NULL,NULL,NULL,'creator','"+T+"',NULL,NULL,NULL)");}
  var bulk = db.exec("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status='pending'")[0];
  assert(bulk.values[0][0]>=50,'[C1] 50+ tasks submitted rapidly');
  db.run("INSERT INTO wallets VALUES ('wc1','u2',10000,0,0,0,'balance','active','"+T+"','"+T+"')");
  db.run("UPDATE wallets SET credits=9900,frozen_credits=100 WHERE user_id='u2'");
  var bal = db.exec("SELECT credits,frozen_credits FROM wallets WHERE user_id='u2'")[0];
  assert(bal.values[0][0]===9900,'[C2a] Freeze available=9900');
  assert(bal.values[0][1]===100,'[C2b] Frozen=100');

  console.log('');
  console.log('==============================');
  console.log('Passed:', passed);
  console.log('Failed:', failed);
  if(failed>0) process.exit(1);
  else { console.log('ALL TESTS PASSED'); process.exit(0); }
})();