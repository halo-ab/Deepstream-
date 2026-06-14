const https = require("https");
const http  = require("http");
const { URL } = require("url");

// Default headers expected by dai-fancode.pages.dev
const DEFAULT_HEADERS = {
  "User-Agent": "ReactNativeVideo/9.7.0 (Linux;Android 10) AndroidXMedia3/1.6.1",
  "Referer":    "https://fancode.com/",
  "Origin":     "https://fancode.com",
  "Accept":     "*/*",
  "Accept-Encoding": "identity",
};

function fetchUrl(targetUrl, extra = {}) {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.startsWith("https") ? https : http;
    lib.get(targetUrl, { headers: { ...DEFAULT_HEADERS, ...extra } }, resolve)
       .on("error", reject);
  });
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    res.on("end",  () => resolve(Buffer.concat(chunks)));
    res.on("error", reject);
  });
}

function resolveUrl(base, relative) {
  if (/^https?:\/\//i.test(relative)) return relative;
  try {
    const b = new URL(base);
    if (relative.startsWith("/")) return `${b.protocol}//${b.host}${relative}`;
    const dir = b.pathname.slice(0, b.pathname.lastIndexOf("/") + 1);
    return `${b.protocol}//${b.host}${dir}${relative}`;
  } catch { return relative; }
}

function rewriteM3u8(text, baseUrl, extra, proxyBase) {
  const h = encodeURIComponent(JSON.stringify(extra));
  return text.split("\n").map(line => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    const abs = resolveUrl(baseUrl, t);
    return `${proxyBase}?url=${encodeURIComponent(abs)}&h=${h}`;
  }).join("\n");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const { url: targetUrl, h } = req.query;
  if (!targetUrl) { res.status(400).send("Missing url"); return; }

  let extra = {};
  try { extra = JSON.parse(decodeURIComponent(h || "{}")); } catch (_) {}

  try {
    const upstream = await fetchUrl(targetUrl, extra);
    const ct = upstream.headers["content-type"] || "";
    const isM3u8 = ct.includes("mpegurl") || targetUrl.includes(".m3u8");

    res.setHeader("Access-Control-Allow-Origin", "*");

    if (isM3u8) {
      const text = (await readBody(upstream)).toString("utf8");
      const proto = req.headers["x-forwarded-proto"] || "https";
      const host  = req.headers["x-forwarded-host"]  || req.headers.host;
      const rewritten = rewriteM3u8(text, targetUrl, extra, `${proto}://${host}/api/proxy`);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.status(200).send(rewritten);
    } else {
      res.setHeader("Content-Type", ct || "application/octet-stream");
      if (upstream.headers["content-length"])
        res.setHeader("Content-Length", upstream.headers["content-length"]);
      res.status(upstream.statusCode || 200).send(await readBody(upstream));
    }
  } catch (e) {
    res.status(502).send("proxy error: " + e.message);
  }
};
