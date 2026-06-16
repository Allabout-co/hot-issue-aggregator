// 핫이슈 애그리게이터 — Express 서버 + JSON API
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES } from "./src/sources.js";
import { getCache, refresh, loadFromDisk, startScheduler } from "./src/store.js";
import { briefingEnabled } from "./src/briefing.js";
import { CATEGORIES } from "./src/categorize.js";
import { notifyEnabled, sendTest, loadSent } from "./src/notify.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, "public")));

// 소스 메타 정보
app.get("/api/sources", (req, res) => {
  res.json(
    SOURCES.map(({ id, name, color, badge, weight }) => ({ id, name, color, badge, weight }))
  );
});

// 카테고리 메타 정보
app.get("/api/categories", (req, res) => {
  res.json(CATEGORIES);
});

// 통합 핫랭킹 + 소스별 랭킹 + LLM 브리핑
app.get("/api/feed", (req, res) => {
  const c = getCache();
  res.json({
    collectedAt: c.collectedAt,
    status: c.status,
    hot: c.hot,
    bySource: c.bySource,
    briefing: c.briefing,
    briefingEnabled: briefingEnabled(),
    notifyEnabled: notifyEnabled(),
  });
});

// 수동 새로고침
app.post("/api/refresh", async (req, res) => {
  const c = await refresh();
  res.json({ ok: true, collectedAt: c.collectedAt, status: c.status });
});

// 텔레그램 연결 테스트
app.post("/api/notify/test", async (req, res) => {
  res.json(await sendTest());
});

// [임시 진단] 서버(Render IP)가 펨코에서 실제로 무엇을 받는지 확인
app.get("/api/debug/fmkorea", async (req, res) => {
  try {
    const r = await fetch("https://www.fmkorea.com/index.php?mid=best", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    const html = await r.text();
    const low = html.toLowerCase();
    res.json({
      status: r.status,
      length: html.length,
      hasBestLink: html.includes("/best/"),
      hasTitleClass: html.includes('class="title"'),
      cloudflare: low.includes("just a moment") || low.includes("cf-chl") || low.includes("challenge-platform"),
      jsOrCaptcha: low.includes("enable javascript") || low.includes("captcha") || low.includes("로봇이 아닙니다"),
      snippet: html.slice(0, 400).replace(/\s+/g, " "),
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

await loadFromDisk();
await loadSent();
startScheduler(5 * 60 * 1000); // 5분마다 갱신

app.listen(PORT, () => {
  console.log(`\n🔥 핫이슈 애그리게이터: http://localhost:${PORT}\n`);
});
