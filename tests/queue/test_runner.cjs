const initSqlJs = require('sql.js');

async function createTestDb() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const tables = [
    "CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'user', type TEXT NOT NULL DEFAULT 'guest', status TEXT NOT NULL DEFAULT 'active', nickname TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE wallets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, credits INTEGER DEFAULT 0, frozen_credits INTEGER DEFAULT 0, total_used INTEGER DEFAULT 0, total_topped_up INTEGER DEFAULT 0, mode TEXT NOT NULL DEFAULT 'balance', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, service TEXT NOT NULL DEFAULT 'general', model TEXT DEFAULT '', input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, credits_per_token REAL NOT NULL DEFAULT 0, cost_usd REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'completed', transaction_id TEXT NOT NULL UNIQUE, metadata TEXT, created_at TEXT NOT NULL)",
    "CREATE TABLE ai_usage (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, service TEXT NOT NULL, model TEXT NOT NULL DEFAULT '', input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, credits_used INTEGER NOT NULL DEFAULT 0, cost_usd REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'completed', transaction_id TEXT, created_at TEXT NOT NULL)",
    "CREATE TABLE ai_tasks (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', priority TEXT NOT NULL DEFAULT 'normal', user_id TEXT, payload TEXT, result TEXT, retry_count INTEGER NOT NULL DEFAULT 0, max_retry INTEGER NOT NULL DEFAULT 3, locked_by TEXT, locked_at TEXT, next_run_at TEXT, created_by TEXT, created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT, last_error TEXT)",
    "CREATE TABLE ai_results (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, user_id TEXT NOT NULL, service TEXT NOT NULL, model TEXT NOT NULL DEFAULT '', input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, credits_used INTEGER NOT NULL DEFAULT 0, cost_usd REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'completed', error_message TEXT, created_at TEXT NOT NULL)",
    "CREATE TABLE billing_reservations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, task_id TEXT, amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', idempotency_key TEXT NOT NULL UNIQUE, reserved_at TEXT NOT NULL, expires_at TEXT NOT NULL)",
    "CREATE TABLE ai_pricing (id TEXT PRIMARY KEY, service TEXT NOT NULL, model TEXT NOT NULL, credits_per_100_tokens INTEGER NOT NULL DEFAULT 1, cost_usd_per_100_tokens REAL NOT NULL DEFAULT 0.01, enabled INTEGER NOT NULL DEFAULT 1, priority INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)"
  ];
  tables.forEach(t => db.run(t));
  var indexes = ['idx_ai_tasks_status ON ai_tasks(status)','idx_ai_tasks_priority ON ai_tasks(priority)','idx_ai_tasks_user ON ai_tasks(user_id)','idx_billing_res_user_status ON billing_reservations(user_id,status)','idx_billing_res_task ON billing_reservations(task_id)'];
  indexes.forEach(function(idx){db.run('CREATE INDEX IF NOT EXISTS '+idx);});
  var ts = new Date().toISOString();
  db.run("INSERT INTO ai_pricing VALUES ('p1','ai','gpt-mock',1,0.01,1,0,'"+ts+"')");
  db.run("INSERT INTO ai_pricing VALUES ('p2','ai','deepseek-v3',1,0.01,1,0,'"+ts+"')");
  return db;
}

function createMockDb(sqlDb) {
  function execWithParams(sql, params) {
    if (params !== undefined && params !== null && params.length > 0) {
      return sqlDb.exec(sql, params);
    }
    return sqlDb.exec(sql);
  }

  return {
    prepare: function(sql) {
      return {
        bind: function() {
          var p = arguments;
          return {
            run: function() { try { sqlDb.run(sql, p); return {changes: 1}; } catch(e){throw e;} },
            get: function() { try { var r=execWithParams(sql,p); if(!r.length||!r[0].values.length)return null; var c=r[0].columns,v=r[0].values[0]; var o={}; c.forEach(function(k,i){o[k]=v[i]}); return o; } catch(e){throw e;} },
            first: function() { try { var r=execWithParams(sql,p); if(!r.length||!r[0].values.length)return null; var c=r[0].columns,v=r[0].values[0]; var o={}; c.forEach(function(k,i){o[k]=v[i]}); return o; } catch(e){throw e;} },
            all: function() { try { var r=execWithParams(sql,p); if(!r.length)return []; var c=r[0].columns; return r[0].values.map(function(v){var o={};c.forEach(function(k,i){o[k]=v[i]});return o;}); } catch(e){throw e;} }
          };
        }
      };
    },
    run: function(sql) { 
      try { sqlDb.run(sql); var cr=sqlDb.exec("SELECT changes()"); return {changes: cr.length>0?cr[0].values[0][0]:1}; } 
      catch(e){throw e;} 
    },
    get: function(sql, params) { try { var r=execWithParams(sql,params); if(!r.length||!r[0].values.length)return null; var c=r[0].columns,v=r[0].values[0]; var o={}; c.forEach(function(k,i){o[k]=v[i]}); return o; } catch(e){throw e;} },
    first: function(sql, params) { try { var r=execWithParams(sql,params); if(!r.length||!r[0].values.length)return null; var c=r[0].columns,v=r[0].values[0]; var o={}; c.forEach(function(k,i){o[k]=v[i]}); return o; } catch(e){throw e;} },
    all: function(sql, params) { try { var r=execWithParams(sql,params); if(!r.length)return []; var c=r[0].columns; return r[0].values.map(function(v){var o={};c.forEach(function(k,i){o[k]=v[i]});return o;}); } catch(e){throw e;} }
  };
}

var passed=0, failed=0, tests=[];
function assert(cond,msg){if(cond){passed++;tests.push({name:msg,status:'pass'});}else{failed++;tests.push({name:msg,status:'fail'});console.error('  FAIL: '+msg);}}
function assertEquals(a,b,msg){assert(JSON.stringify(a)===JSON.stringify(b),msg+' (exp='+JSON.stringify(b)+', got='+JSON.stringify(a)+')');}
function assertExists(val,msg){assert(val!==null&&val!==undefined,msg);}
function section(name){console.log('\n['+name+']');}
module.exports={createTestDb:createTestDb, createMockDb:createMockDb, assert:assert, assertEquals:assertEquals, assertExists:assertExists, section:section, get passed(){return passed}, get failed(){return failed}, get tests(){return tests}};
