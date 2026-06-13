const https = require("https");
const http  = require("http");
const { URL } = require("url");

function fetchUrl(targetUrl, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.startsWith("https") ? https : http;
    lib.get(targetUrl, {
      headers: {
        "User-Agent":      "ReactNativeVideo/9.7.0 (Linux;Android 10) AndroidXMedia3/1.6.1",
        "Referer":         "https://fancode.com/",
        "Accept":          "*/*",
        "Accept-Encoding": "identity",
        "Origin":          "https://fancode.com",
        ...extraHeaders,
      }
    }, resolve).on("error", reject);
  });
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    res.on("end", () => resolve(Buffer.concat(chunks)));
    res.on("error", reject);
  });
}

function resolveUrl(base, relative) {
  if (/^https?:\/\//i.test(relative)) return relative;
  try {
    const b = new URL(base);
    if (relative.startsWith("/")) return `${b.protocol}//${b.host}${relative}`;
    const dir = b.pathname.substring(0, b.pathname.lastIndexOf("/") + 1);
    return `${b.protocol}//${b.host}${dir}${relative}`;
  } catch { return relative; }
}

function rewriteM3u8(text, baseUrl, extraHeaders, proxyBase) {
  const hQS = encodeURIComponent(JSON.stringify(extraHeaders));
  return text.split("\n").map(line => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    const abs = resolveUrl(baseUrl, t);
    return `${proxyBase}?url=${encodeURIComponent(abs)}&h=${hQS}`;
  }).join("\n");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const targetUrl = req.query.url;
  if (!targetUrl) { res.status(400).send("Missing url param"); return; }

  // Parse extra headers passed from the player
  let extraHeaders = {};
  try {
    extraHeaders = JSON.parse(decodeURIComponent(req.query.h || "{}"));
  } catch (_) {}

  try {
    const upstream = await fetchUrl(targetUrl, extraHeaders);
    const ct = upstream.headers["content-type"] || "";
    const isM3u8 = ct.includes("mpegurl") || targetUrl.includes(".m3u8");

    res.setHeader("Access-Control-Allow-Origin", "*");

    if (isM3u8) {
      const body = (await readBody(upstream)).toString("utf8");
      const proto    = req.headers["x-forwarded-proto"] || "https";
      const host     = req.headers["x-forwarded-host"] || req.headers.host;
      const proxyBase = `${proto}://${host}/api/proxy`;
      const rewritten = rewriteM3u8(body, targetUrl, extraHeaders, proxyBase);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.status(200).send(rewritten);
    } else {
      res.setHeader("Content-Type", ct || "application/octet-stream");
      if (upstream.headers["content-length"]) {
        res.setHeader("Content-Length", upstream.headers["content-length"]);
      }
      res.status(upstream.statusCode || 200).send(await readBody(upstream));
    }
  } catch (e) {
    res.status(502).send("Proxy error: " + e.message);
  }
};
