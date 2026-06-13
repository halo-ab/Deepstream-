// Hardcoded M3U content — update this whenever you get fresh links
const M3U_CONTENT = `#EXTM3U
#EXTINF:-1 tvg-id="143214" tvg-name="Day 3   Featured Holes" tvg-logo="https://www.fancode.com/skillup-uploads/cms-media/Mini-Match-Card-(1080x810)-(8)_1780915920306.png" tvg-language="English" group-title="Golf",ENG | Day 3   Featured Holes
https://dai-fancode.pages.dev/mumbai/143214_english_hls_b98294f93a8901_1ta-di_h264/index.m3u8|User-Agent=ReactNativeVideo/9.7.0 (Linux;Android 10) AndroidXMedia3/1.6.1&Referer=https://fancode.com/
#EXTINF:-1 tvg-id="143213" tvg-name="Day 3   Marquee Group" tvg-logo="https://www.fancode.com/skillup-uploads/cms-media/Mini-Match-Card-(1080x810)-(8)_1780915920306.png" tvg-language="English" group-title="Golf",ENG | Day 3   Marquee Group
https://dai-fancode.pages.dev/mumbai/143213_english_hls_a7c01dd75382674_1ta-di_h264/index.m3u8|User-Agent=ReactNativeVideo/9.7.0 (Linux;Android 10) AndroidXMedia3/1.6.1&Referer=https://fancode.com/
`;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  res.setHeader("Content-Type", "application/x-mpegurl");
  res.status(200).send(M3U_CONTENT);
};
