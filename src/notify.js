// 텔레그램 핫이슈 푸시봇
// 환경변수 TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID 설정 시 활성화.
// 새로고침마다 통합 핫랭킹 상위(TOP N)에 "새로 진입한" 글만 모아 1건으로 발송(스팸 방지).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_MAP } from "./sources.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SENT_FILE = join(__dirname, "..", "data", "sent.json");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TOP_N = Number(process.env.TELEGRAM_TOP_N || 10);
const ENABLED = Boolean(TOKEN && CHAT_ID);

let sent = new Set();

export function notifyEnabled() {
  return ENABLED;
}

export async function loadSent() {
  try {
    const raw = await readFile(SENT_FILE, "utf8");
    sent = new Set(JSON.parse(raw));
  } catch {
    /* 최초 실행 */
  }
}

async function saveSent() {
  await mkdir(dirname(SENT_FILE), { recursive: true });
  // 최근 500개만 유지
  const arr = [...sent].slice(-500);
  sent = new Set(arr);
  await writeFile(SENT_FILE, JSON.stringify(arr), "utf8");
}

function esc(s = "") {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

async function sendMessage(text) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "telegram error");
  return data;
}

// 수동 테스트용
export async function sendTest() {
  if (!ENABLED) return { ok: false, error: "TELEGRAM_BOT_TOKEN/CHAT_ID 미설정" };
  try {
    await sendMessage("🔥 <b>핫이슈 봇</b> 연결 테스트 성공!");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// 새로고침 후 호출: 새 핫이슈만 발송
export async function pushHot(hot) {
  if (!ENABLED || !hot?.length) return;
  const fresh = hot.slice(0, TOP_N).filter((p) => !sent.has(p.id));
  if (fresh.length === 0) return;

  const lines = fresh.slice(0, 10).map((p) => {
    const src = SOURCE_MAP[p.sourceId]?.name || p.sourceId;
    return `🔥 <a href="${esc(p.link)}">${esc(p.title)}</a>\n   <i>${esc(src)}</i>`;
  });
  const header = `<b>📈 지금 뜨는 핫이슈 ${fresh.length}건</b>\n\n`;
  try {
    await sendMessage(header + lines.join("\n\n"));
    fresh.forEach((p) => sent.add(p.id));
    await saveSent();
    console.log(`[notify] 텔레그램 ${fresh.length}건 발송`);
  } catch (e) {
    console.error("[notify] 발송 실패:", e.message);
  }
}
