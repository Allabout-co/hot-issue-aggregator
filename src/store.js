// 수집 결과를 메모리에 캐싱하고 주기적으로 갱신 + 디스크 백업
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectAll } from "./collect.js";
import { rankAll } from "./rank.js";
import { generateBriefing, briefingEnabled } from "./briefing.js";
import { pushHot } from "./notify.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "data", "posts.json");

let cache = { collectedAt: 0, status: [], hot: [], bySource: {}, briefing: null };
let refreshing = false;

export function getCache() {
  return cache;
}

export async function refresh() {
  if (refreshing) return cache;
  refreshing = true;
  try {
    const { posts, status, collectedAt } = await collectAll();
    const { hot, bySource } = rankAll(posts);
    // 직전 브리핑은 유지하다가, LLM이 켜져 있으면 새로 생성해 교체
    cache = { collectedAt, status, hot, bySource, briefing: cache.briefing };
    const okCount = status.filter((s) => s.ok).length;
    console.log(
      `[refresh] ${new Date(collectedAt).toLocaleTimeString("ko-KR")} · 소스 ${okCount}/${status.length} · 글 ${posts.length}개`
    );
    if (briefingEnabled()) {
      cache.briefing = await generateBriefing(hot);
      console.log("[briefing] 생성됨");
    }
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(cache), "utf8");
    await pushHot(hot); // 텔레그램 푸시(켜져 있으면)
  } catch (e) {
    console.error("[refresh] 실패:", e.message);
  } finally {
    refreshing = false;
  }
  return cache;
}

export async function loadFromDisk() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    cache = JSON.parse(raw);
    console.log("[store] 디스크 캐시 로드됨");
  } catch {
    // 최초 실행: 캐시 없음
  }
}

export function startScheduler(intervalMs = 5 * 60 * 1000) {
  refresh();
  setInterval(refresh, intervalMs);
}
