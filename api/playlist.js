const https = require("https");

const M3U_URL = "https://raw.githubusercontent.com/doctor-8trange/zyphx8/refs/heads/main/data/fancode.m3u";

function get(url) {
  return new Promise((resolve, reject) =>
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, resolve).on("error", reject)
  );
}
function body(res) {
  return new Promise((resolve, reject) => {
    let d = "";
    res.on("data", c => (d += c));
    res.on("end", () => resolve(d));
    res.on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  try {
    const text = await body(await get(M3U_URL));
    res.setHeader("Content-Type", "application/x-mpegurl; charset=utf-8");
    res.status(200).send(text);
  } catch (e) {
    res.status(502).send("playlist fetch failed: " + e.message);
  }
};
