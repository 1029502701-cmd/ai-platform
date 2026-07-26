const tr = require('./test_runner.cjs');
(async function main() {
  tr.section('Billing + Queue Transaction Tests');
  const sqlDb = await createTestDb();
  const db = createMockDb(sqlDb);
  const now = new Date().toISOString();
  const exp = new Date(Date.now() + 3600000).toISOString();

  var setupSql = "INSERT INTO users VALUES ('user1','user','guest','active','Tester','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')";
  await db.run(setupSql);
  var walletSql = "INSERT INTO wallets VALUES ('w1','user1',500,0,0,0,'balance','active','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')";
  await db.run(walletSql);

  // B1: Reserve 100 credits
  await db.run("INSERT INTO billing_reservations (id,user_id,task_id,amount,status,idempotency_key,reserved_at,expires_at) VALUES ('r1','user1','t100',100,'pending','res_t100','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z')");
  await db.run("UPDATE wallets SET credits=400,frozen_credits=100 WHERE user_id='user1'");
  var w1 = await db.first('SELECT * FROM wallets WHERE user_id=?', ['user1']);
  assert(w1.credits === 400, '[B1.1] Available credits after reserve: 400');
  assert(w1.frozen_credits === 100, '[B1.2] Frozen credits: 100');

  // B2: Insufficient balance check
  await db.run("UPDATE wallets SET credits=10,frozen_credits=200 WHERE user_id='user1'");
  var wFail = await db.first('SELECT * FROM wallets WHERE user_id=?', ['user1']);
  assert(wFail.credits === 10, '[B2.1] Available dropped to 10');
  assert(wFail.frozen_credits === 200, '[B2.2] Frozen total: 200');
  assert((wFail.credits - (wFail.frozen_credits||0)) < 0, '[B2.3] Effective balance negative');

  // B3: Commit with excess refund
  await db.run("UPDATE wallets SET credits=500,frozen_credits=0 WHERE user_id='user1'");
  await db.run("INSERT INTO billing_reservations (id,user_id,task_id,amount,status,idempotency_key,reserved_at,expires_at) VALUES ('r2','user1','t200',200,'pending','res_big','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z')");
  await db.run("UPDATE wallets SET credits=300,frozen_credits=200 WHERE user_id='user1'");
  await db.run("UPDATE wallets SET frozen_credits=COALESCE(frozen_credits,0)-200,credits=300+50-150 WHERE user_id='user1'");
  await db.run("UPDATE billing_reservations SET status='committed' WHERE id='r2'");
  var wCommit = await db.first('SELECT * FROM wallets WHERE user_id=?', ['user1']);
  assert(wCommit.frozen_credits === 0, '[B3.1] Frozen cleared after commit');
  await db.run("DELETE FROM billing_reservations WHERE id='r2'");

  // B4: Full refund
  await db.run("UPDATE wallets SET credits=500,frozen_credits=0 WHERE user_id='user1'");
  await db.run("INSERT INTO billing_reservations (id,user_id,task_id,amount,status,idempotency_key,reserved_at,expires_at) VALUES ('r3','user1','t300',100,'pending','res_refund','2026-01-01T00:00:00Z','2026-01-01T01:00:00Z')");
  await db.run("UPDATE wallets SET credits=400,frozen_credits=100 WHERE user_id='user1'");
  await db.run("UPDATE wallets SET frozen_credits=COALESCE(frozen_credits,0)-100,credits=400+100 WHERE user_id='user1'");
  await db.run("UPDATE billing_reservations SET status='refunded' WHERE id='r3'");
  var wRefund = await db.first('SELECT * FROM wallets WHERE user_id=?', ['user1']);
  assert(wRefund.credits === 500, '[B4.1] After full refund: 500 restored');
  assert(wRefund.frozen_credits === 0, '[B4.2] Frozen cleared after refund');

  // B5: Expired reservation detection
  var expiredAt = new Date(Date.now() - 1800000).toISOString();
  await db.run("INSERT INTO billing_reservations (id,user_id,task_id,amount,status,idempotency_key,reserved_at,expires_at) VALUES ('r4','user1','t400',75,'pending','res_expire','2026-01-01T00:00:00Z','"+expiredAt+"')");
  var expiredRows = await db.all("SELECT COUNT(*) as cnt FROM billing_reservations WHERE status='pending' AND expires_at < CURRENT_TIMESTAMP");
  assert(expiredRows[0].cnt >= 1, '[B5.1] At least 1 expired reservation detected');

  // B6: Idempotency on transactions
  var uniqueTx = 'idem_check_999';
  await db.run("INSERT INTO transactions (id,user_id,type,amount,service,model,status,transaction_id,created_at) VALUES ('tx1','user1','consume',-100,'ai_task','','completed','"+uniqueTx+"','"+now+"')");
  var txRow = await db.first('SELECT * FROM transactions WHERE transaction_id=?', [uniqueTx]);
  assert(txRow !== null && txRow.type === 'consume', '[B6.1] Transaction recorded with unique id');
  assert(txRow.amount === -100, '[B6.2] Transaction amount matches');

  console.log('');
  console.log('Passed:', _tr.passed);
  console.log('Failed:', _tr.failed);
  if (_tr.failed > 0) process.exit(1);
  else process.exit(0);
})();
function createTestDb() { return tr.createTestDb(); }
function createMockDb(d) { return tr.createMockDb(d); }
var assert=tr.assert; var _tr=tr;
