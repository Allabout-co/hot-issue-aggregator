// 자동 발행기 — 서버에서 주기적으로 여러 채널(디스코드/텔레그램 공개채널)에 핫이슈 발행.
// 환경변수로 채널 설정(없으면 해당 채널 자동 비활성). PC와 무관하게 Render에서 24시간 동작.
//   DISCORD_WEBHOOK_URL    디스코드 웹훅 URL(쉼표로 여러 개 가능)
//   TELEGRAM_BOT_TOKEN     봇 토큰(개인 푸시와 공용)
//   TELEGRAM_CHANNEL_ID    공개채널 ID(@채널명 또는 -100... )
//   BROADCAST_INTERVAL_MIN 발행 주기(분, 기본 60)
//   BROADCAST_TOP_N        한 번에 다룰 상위 개수(기본 8)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_MAP } from "./sources.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "..", "data", "broadcasted.json");

const DISCORD = (process.env.DISCORD_WEBHOOK_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const TOP_N = Number(process.env.BROADCAST_TOP_N || 8);
const SITE = process.env.SITE_PUBLIC_URL || "https://hot-issue-aggregator.onrender.com";

export function broadcastEnabled() {
  return DISCORD.length > 0 || Boolean(TG_TOKEN && TG_CHANNEL);
}
export function broadcastStatus() {
  return { discord: DISCORD.length, telegram: Boolean(TG_TOKEN && TG_CHANNEL) };
}

let posted = new Set();

export async function loadBroadcasted() {
  try {
    posted = new Set(JSON.parse(await readFile(FILE, "utf8")));
  } catch {
    /* 최초 */
  }
}
async function save() {
  await mkdir(dirname(FILE), { recursive: true });
  posted = new Set([...posted].slice(-1000));
  await writeFile(FILE, JSON.stringify([...posted]), "utf8");
}

const esc = (s = "") => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

async function sendDiscord(url, items) {
  const lines = items.map((p) => {
    const src = SOURCE_MAP[p.sourceId]?.name || p.sourceId;
    const title = p.title.replace(/[[\]]/g, ""); // 마크다운 깨짐 방지
    return `🔥 [${title}](${p.link}) · *${src}*`;
  });
  const content = `📈 **지금 뜨는 핫이슈**\n\n${lines.join("\n")}\n\n👉 <${SITE}>`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
  if (!r.ok) throw new Error(`discord ${r.status}`);
}

async function sendTelegram(items) {
  const lines = items.map((p) => {
    const src = SOURCE_MAP[p.sourceId]?.name || p.sourceId;
    return `🔥 <a href="${esc(p.link)}">${esc(p.title)}</a>\n   <i>${esc(src)}</i>`;
  });
  const text = `📈 <b>지금 뜨는 핫이슈</b>\n\n${lines.join("\n\n")}\n\n👉 ${SITE}`;
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHANNEL, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const data = await r.json();
  if (!data.ok) throw new Error(`telegram ${data.description || r.status}`);
}

// 새로고침된 hot 목록을 받아, 아직 발행 안 한 상위 글을 모든 채널에 발행
export async function broadcast(hot) {
  if (!broadcastEnabled() || !hot?.length) return;
  const fresh = hot.slice(0, TOP_N).filter((p) => !posted.has(p.id));
  if (fresh.length === 0) return;
  let any = false;
  for (const url of DISCORD) {
    try {
      await sendDiscord(url, fresh);
      any = true;
    } catch (e) {
      console.error("[broadcast:discord]", e.message);
    }
  }
  if (TG_TOKEN && TG_CHANNEL) {
    try {
      await sendTelegram(fresh);
      any = true;
    } catch (e) {
      console.error("[broadcast:telegram]", e.message);
    }
  }
  if (any) {
    fresh.forEach((p) => posted.add(p.id));
    await save();
    console.log(`[broadcast] ${fresh.length}건 발행`);
  }
}
