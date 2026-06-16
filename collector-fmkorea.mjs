// 펨코 수집기 — 가정 IP인 내 PC에서 실행해 펨코를 긁어 사이트로 전송.
// (펨코가 클라우드 IP를 차단하므로 Render에서 직접 못 긁음)
//
// 실행:
//   $env:INGEST_TOKEN="서버와_동일한_토큰"
//   node collector-fmkorea.mjs
// 그대로 창을 열어두면 5분마다 자동 전송됩니다.

import { SCRAPERS } from "./src/scrapers.js";
import { SOURCE_MAP } from "./src/sources.js";

const SITE = process.env.SITE_URL || "https://hot-issue-aggregator.onrender.com";
const TOKEN = process.env.INGEST_TOKEN;
const SOURCE_ID = "fmkorea-best";
const INTERVAL = Number(process.env.COLLECT_INTERVAL_MIN || 5) * 60 * 1000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

if (!TOKEN) {
  console.error("❌ INGEST_TOKEN 환경변수를 먼저 설정하세요 (서버 Render의 값과 동일해야 함).");
  process.exit(1);
}

const src = SOURCE_MAP[SOURCE_ID];
const ts = () => new Date().toLocaleTimeString("ko-KR");

async function once() {
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
    });
    const html = await res.text();
    const items = SCRAPERS[src.scraper](html, src);
    if (items.length === 0) {
      console.warn(`${ts()} ⚠️ 펨코 수집 0건 (집 IP에서도 막혔거나 페이지 변경)`);
      return;
    }
    const r = await fetch(`${SITE}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: TOKEN, sourceId: SOURCE_ID, items }),
    });
    const data = await r.json().catch(() => ({}));
    console.log(`${ts()} ${data.ok ? `✅ 전송 ${data.received}건` : `❌ 실패: ${data.error || r.status}`}`);
  } catch (e) {
    console.error(`${ts()} ❌ 오류: ${e.message}`);
  }
}

console.log(`🔥 펨코 수집기 시작 → ${SITE} (${INTERVAL / 60000}분 간격). 종료하려면 Ctrl+C`);
once();
setInterval(once, INTERVAL);
