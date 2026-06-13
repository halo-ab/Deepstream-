const https = require("https");
const http = require("http");
const { URL } = require("url");

function fetchUrl(targetUrl, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.startsWith("https") ? https : http;
    const req = lib.get(targetUrl, {
      headers: {
        // Headers required by dai-fancode.pages.dev streams
        "User-Agent":      "ReactNativeVideo/9.7.0 (Linux;Android 10) AndroidXMedia3/1.6.1",
        "Referer":         "https://fancode.com/",
        "Origin":          "https://fancode.com",
        "Accept":          "*/*",
        "Accept-Encoding": "identity",
        // Let caller override anything above
        ...extraHeaders,
      },
    }, resolve);
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
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
  const b = new URL(base);
  if (relative.startsWith("/")) return `${b.protocol}//${b.host}${relative}`;
  const dir = b.pathname.substring(0, b.pathname.lastIndexOf("/") + 1);
  return `${b.protocol}//${b.host}${dir}${relative}`;
}

function rewriteM3u8(text, baseUrl, headers, proxyBase) {
  const hQS = encodeURIComponent(JSON.stringify(headers));
  return text.split("\n").map(line => {
    const t = line.trim();
    // Rewrite URI="..." inside tags like #EXT-X-KEY, #EXT-X-MAP
    if (t.startsWith("#") && t.includes('URI="')) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const abs = resolveUrl(baseUrl, uri);
        return `URI="${proxyBase}?url=${encodeURIComponent(abs)}&headers=${hQS}"`;
      });
    }
    if (!t || t.startsWith("#")) return line;
    const abs = resolveUrl(baseUrl, t);
    return `${proxyBase}?url=${encodeURIComponent(abs)}&headers=${hQS}`;
  }).join("\n");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const { url: targetUrl, headers: headersParam } = req.query;
  if (!targetUrl) { res.status(400).send("Missing url param"); return; }

  let extraHeaders = {};
  try { extraHeaders = JSON.parse(decodeURIComponent(headersParam || "{}")); } catch (_) {}

  try {
    let upstream = await fetchUrl(decodeURIComponent(targetUrl), extraHeaders);
    let finalUrl = decodeURIComponent(targetUrl);

    // Follow redirects (Cloudflare Pages often 301/302)
    let hops = 0;
    while ([301, 302, 303, 307, 308].includes(upstream.statusCode) && upstream.headers.location && hops++ < 5) {
      finalUrl = resolveUrl(finalUrl, upstream.headers.location);
      upstream  = await fetchUrl(finalUrl, extraHeaders);
    }

    const contentType = upstream.headers["content-type"] || "";
    const isM3u8 = contentType.includes("mpegurl") || contentType.includes("x-mpegurl") ||
                   finalUrl.includes(".m3u8") || finalUrl.includes(".m3u");

    res.setHeader("Access-Control-Allow-Origin", "*");

    const proto     = req.headers["x-forwarded-proto"] || "https";
    const host      = req.headers["x-forwarded-host"]  || req.headers.host;
    const proxyBase = `${proto}://${host}/api/proxy`;

    const body = await readBody(upstream);

    if (isM3u8) {
      const rewritten = rewriteM3u8(body.toString("utf8"), finalUrl, extraHeaders, proxyBase);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.status(200).send(rewritten);
    } else {
      res.setHeader("Content-Type", contentType || "application/octet-stream");
      res.status(upstream.statusCode || 200).send(body);
    }
  } catch (e) {
    res.status(502).send("Proxy error: " + e.message);
  }
};
