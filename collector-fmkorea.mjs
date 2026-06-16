// 펨코 수집기 (Playwright 브라우저 방식) — 가정 IP의 내 PC에서 실행.
// 펨코는 Akamai 자바스크립트 챌린지로 단순 요청을 막으므로, 진짜 브라우저로 통과시켜 수집한다.
//
// 최초 1회 설치:
//   npm install playwright --no-save
//   npx playwright install chromium
// 실행:
//   $env:INGEST_TOKEN="서버와_동일한_토큰"
//   node collector-fmkorea.mjs
// 그대로 두면 10분마다 자동 전송. 종료는 Ctrl+C.

import { chromium } from "playwright";
import { SCRAPERS } from "./src/scrapers.js";
import { SOURCE_MAP } from "./src/sources.js";

const SITE = process.env.SITE_URL || "https://hot-issue-aggregator.onrender.com";
const TOKEN = process.env.INGEST_TOKEN;
const SOURCE_ID = "fmkorea-best";
const INTERVAL = Number(process.env.COLLECT_INTERVAL_MIN || 10) * 60 * 1000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

if (!TOKEN) {
  console.error("❌ INGEST_TOKEN 환경변수를 먼저 설정하세요 (서버 Render의 값과 동일해야 함).");
  process.exit(1);
}

const src = SOURCE_MAP[SOURCE_ID];
const ts = () => new Date().toLocaleTimeString("ko-KR");
let browser, ctx;

async function ensureBrowser() {
  if (browser && browser.isConnected()) return;
  browser = await chromium.launch({ headless: true });
  ctx = await browser.newContext({ userAgent: UA, locale: "ko-KR", viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
}

async function scrapeWithBrowser() {
  await ensureBrowser();
  const page = await ctx.newPage();
  try {
    await page.goto(src.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("h3.title a", { timeout: 25000 }); // 챌린지 통과 대기
    const html = await page.content();
    return SCRAPERS.fmkorea(html, src);
  } finally {
    await page.close().catch(() => {});
  }
}

async function once() {
  try {
    const items = await scrapeWithBrowser();
    if (items.length === 0) {
      console.warn(`${ts()} ⚠️ 펨코 수집 0건 (페이지 구조 변경 가능)`);
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
    try {
      await browser?.close();
    } catch {}
    browser = null; // 다음 주기에 재기동
  }
}

console.log(`🔥 펨코 수집기(브라우저) 시작 → ${SITE} (${INTERVAL / 60000}분 간격). 종료: Ctrl+C`);
await once();
setInterval(once, INTERVAL);
