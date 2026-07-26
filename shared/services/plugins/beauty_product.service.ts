interface DbRow { [k: string]: any; }

var parseTags = function(s) { if (!s) return new Set(); try { return new Set(JSON.parse(s)); } catch(e) { return new Set(s.split(",").map(function(x){return x.trim();}).filter(Boolean)); } };

export async function matchProducts(env, opts) {
  var db = (env && env.DB) ? env.DB : null;
  if (!db) return [];
  var limit = Math.min(20, (opts && opts.limit) || 8);
  var sq = "SELECT * FROM beauty_products WHERE status='active' ORDER BY commission_rate DESC LIMIT ?";
  var rows = /** @type {{results?: DbRow[]}} */(await db.prepare(sq).bind(limit).all());
  var tags = new Set([opts.faceShape, opts.skinType].filter(Boolean));
  var results = [] as Array<{id:string;brand:string;name:string;category:string;image_url:string;affiliate_url:string|null;price_range:string;rating:number;matchReason:string;commission_rate:number}>;
  for (var i = 0; i < (rows.results || []).length; i++) {
    if (results.length >= limit) break;
    var r = rows.results[i];
    var rowTags = parseTags(r.face_tags);
    var ov = 0;
    tags.forEach(function(t) { if (rowTags.has(t)) ov++; });
    var matched = tags.size > 0 && ov > 0;
    var reason = matched ? ((opts.faceShape || "") + "脸型推荐") : (r.category + "精选");
    results.push({ id: r.id, brand: r.brand, name: r.name, category: r.category, image_url: r.image_url || "", affiliate_url: r.affiliate_url || null, price_range: r.price_range || "", rating: matched ? 0.9 : 0.7, matchReason: reason, commission_rate: Number(r.commission_rate || 0.05) });
  }
  return results;
}

export async function matchBloggers(env, opts) {
  var db = (env && env.DB) ? env.DB : null;
  if (!db) return [];
  var platforms = (opts && opts.platforms) || ["小红书", "抖音", "B站"];
  var ph = platforms.map(function(){return "?"}).join(",");
  var lp = Math.min(12, (opts && opts.limit) || 6);
  var bsql = "SELECT * FROM beauty_bloggers WHERE status='active' AND platform IN (" + ph + ") ORDER BY followers DESC LIMIT ?";
  var params = platforms.concat([lp]);
  var rows = /** @type {{results?: DbRow[]}} */(await db.prepare(bsql).bind.apply(db.prepare(bsql), params).all());
  var tags = new Set([opts.faceShape].filter(Boolean));
  return (rows.results || []).map(function(r, i) {
    var rowTags = parseTags(r.face_tags);
    var ov = 0;
    tags.forEach(function(t) { if (rowTags.has(t)) ov++; });
    var sm = Math.max(0.3, Math.min(1, 1 - i / 6 + ov * 0.2));
    var st = r.style_tags ? parseTags(r.style_tags) : new Set();
    var firstS = "";
    st.forEach(function(x) { firstS = String(x); });
    if (!firstS) firstS = "美妆";
    var f = r.followers >= 10000 ? (r.followers / 10000).toFixed(1) + "万" : String(Math.round(r.followers));
    var reasons = [] as string[];
    if (ov > 0) reasons.push("风格匹配");
    reasons.push("粉丝" + f);
    reasons.push("擅长" + firstS);
    return { id: r.id, name: r.name, platform: r.platform, followers: Number(r.followers || 0), avatar_url: r.avatar_url || "", profile_url: r.profile_url || null, styleMatchScore: sm, reasons: reasons };
  });
}