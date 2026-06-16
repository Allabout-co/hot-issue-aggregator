// 핫이슈 애그리게이터 — Express 서버 + JSON API
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES } from "./src/sources.js";
import { getCache, refresh, loadFromDisk, startScheduler } from "./src/store.js";
import { briefingEnabled } from "./src/briefing.js";
import { CATEGORIES } from "./src/categorize.js";
import { notifyEnabled, sendTest, loadSent } from "./src/notify.js";
import { ingestEnabled, verifyToken, putIngest } from "./src/ingest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
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

// 외부 수집기(내 PC)가 펨코 등 글을 push하는 통로
app.post("/api/ingest", (req, res) => {
  if (!ingestEnabled())
    return res.status(503).json({ ok: false, error: "INGEST_TOKEN 미설정(서버)" });
  const { token, sourceId, items } = req.body || {};
  if (!verifyToken(token)) return res.status(401).json({ ok: false, error: "토큰 불일치" });
  if (!sourceId || !Array.isArray(items))
    return res.status(400).json({ ok: false, error: "sourceId/items 필요" });
  putIngest(sourceId, items);
  res.json({ ok: true, sourceId, received: items.length });
});

await loadFromDisk();
await loadSent();
startScheduler(2 * 60 * 1000); // 2분마다 갱신(체감 실시간)

app.listen(PORT, () => {
  console.log(`\n🔥 핫이슈 애그리게이터: http://localhost:${PORT}\n`);
});
