const https = require("https");
const http  = require("http");

const M3U_URL = "https://raw.githubusercontent.com/doctor-8trange/zyphx8/refs/heads/main/data/fancode.m3u";

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.startsWith("https") ? https : http;
    lib.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
      }
    }, resolve).on("error", reject);
  });
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    let data = "";
    res.on("data", c => data += c);
    res.on("end", () => resolve(data));
    res.on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  try {
    const upstream = await fetchUrl(M3U_URL);
    const body = await readBody(upstream);
    res.setHeader("Content-Type", "application/x-mpegurl; charset=utf-8");
    res.status(200).send(body);
  } catch (e) {
    res.status(502).send("Failed to fetch playlist: " + e.message);
  }
};
