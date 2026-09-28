// Personal-link visit counter for Sam's customer emails.
// Each customer email links to carswithsam.com/?hi=<code>. The homepage reports
// the code here once, and this stores first/last visit and a count in the
// existing SY_BUDGET KV namespace under "hi:<code>". Codes are random and carry
// no names; the code-to-customer list lives only in Sam's private follow-up page.
const CODES = new Set(["2q56d6", "2vm3kt", "3gzm35", "3rkb3b", "3vpzht", "3zyess", "4fgzh8", "67kafx", "6fjc27", "6h5xsz", "6muqcs", "6wxjr3", "79xtyd", "7ajsrr", "7s5vak", "89s8e6", "94jpk3", "97hwdr", "9vspsy", "9wm4du", "a22xqt", "at88dt", "avfwu7", "axd32f", "b5ghad", "bb2pz7", "bcjpc4", "cwqsbu", "d8gdse", "ejdung", "fubzkk", "gckmx2", "gcrjt9", "grhcup", "h78mpc", "ht5hqx", "j22msm", "jn2tpn", "k6ywzg", "kbhq7t", "keqev7", "khxbnr", "kvfahe", "mcnvdx", "mes4rn", "mpb33y", "n9ckzp", "ne5u2z", "nsypre", "nw3nu3", "nx2wcs", "p8td8a", "pg8782", "qbs8g4", "rqrsuy", "sbsrdd", "smwh5w", "uabjqf", "uhv2m4", "umz6z5", "uqhwr9", "v3d8qs", "var2wy", "vmetej", "w2fmdr", "w9rpkm", "w9sz36", "whb4us", "wjcvsp", "wvjzde", "wx9cmr", "xc95nc", "xcukaq", "xjemu3", "xmhs2p", "xq4548", "z3yn2g", "z66xn2", "z8ecbb", "zbbma9", "zfc8mz", "zhxdey", "zz8xkc", "samtst"]);

export async function onRequestPost({ request, env }) {
  if (!env.SY_BUDGET) return new Response(null, { status: 204 });
  let code = '';
  try { code = String((await request.json()).code || '').toLowerCase(); } catch (e) {}
  if (!CODES.has(code)) return new Response(null, { status: 204 });
  const key = 'hi:' + code;
  const now = new Date().toISOString();
  let rec = null;
  try { rec = JSON.parse((await env.SY_BUDGET.get(key)) || 'null'); } catch (e) {}
  rec = rec ? { first: rec.first, last: now, count: (rec.count || 0) + 1 } : { first: now, last: now, count: 1 };
  await env.SY_BUDGET.put(key, JSON.stringify(rec));
  return new Response(null, { status: 204 });
}

export async function onRequestGet({ env }) {
  const out = {};
  if (env.SY_BUDGET) {
    const list = await env.SY_BUDGET.list({ prefix: 'hi:' });
    for (const k of list.keys) {
      try { out[k.name.slice(3)] = JSON.parse(await env.SY_BUDGET.get(k.name)); } catch (e) {}
    }
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
