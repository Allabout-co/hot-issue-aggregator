// RSS 없는 커뮤니티용 HTML 스크래퍼 (디시 힛갤 / 에펨 베스트)
// 합법 설계: 제목·링크·지표만 추출, 본문은 원문 링크아웃. 폴라이트 헤더 + 상위 N개만.
import * as cheerio from "cheerio";

const clean = (s = "") => s.replace(/\s+/g, " ").trim();

// 펨코 regdate("13 분 전" / "1 시간 전" / "HH:MM" / "YYYY.MM.DD") → 절대 시각(ms)
function parseFmTime(reg) {
  const t = clean(reg);
  let m;
  if (/방금/.test(t)) return Date.now();
  if ((m = t.match(/(\d+)\s*분\s*전/))) return Date.now() - Number(m[1]) * 60_000;
  if ((m = t.match(/(\d+)\s*시간\s*전/))) return Date.now() - Number(m[1]) * 3_600_000;
  if ((m = t.match(/(\d+)\s*일\s*전/))) return Date.now() - Number(m[1]) * 86_400_000;
  if ((m = t.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)))
    return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  if ((m = t.match(/(\d{1,2}):(\d{2})/))) {
    const d = new Date();
    d.setHours(+m[1], +m[2], 0, 0);
    if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1); // 미래면 어제로
    return d.getTime();
  }
  return null;
}

// 에펨코리아 베스트
export function fmkorea(html, source) {
  const $ = cheerio.load(html);
  const out = [];
  $("li").each((_, el) => {
    const a = $(el).find("h3.title > a").first();
    let href = a.attr("href");
    let title = clean(a.text());
    if (!href || !title) return;
    if (!/\/best\/\d+|^\/\d+$/.test(href)) return; // 위젯/메뉴 링크 제외
    // 제목 끝의 [댓글수] 분리
    const m = title.match(/\s*\[(\d+)\]\s*$/);
    const comments = m ? Number(m[1]) : 0;
    title = title.replace(/\s*\[\d+\]\s*$/, "");
    if (title.length < 3) return;
    // 실제 작성시간(regdate). 없으면 순번 기반 폴백.
    const idx = out.length;
    const ts = parseFmTime($(el).find(".regdate").first().text());
    // 썸네일(img.thumb)
    let thumb = $(el).find("img.thumb").attr("data-original") || $(el).find("img.thumb").attr("src");
    if (thumb && thumb.startsWith("//")) thumb = "https:" + thumb;
    out.push({
      id: `${source.id}:${href}`,
      sourceId: source.id,
      title,
      link: href.startsWith("http") ? href : "https://www.fmkorea.com" + href,
      author: null,
      category: null,
      thumbnail: thumb || null,
      summary: "",
      publishedAt: ts ?? Date.now() - idx * 90_000,
      signals: { comments, views: 0, recommends: 0 },
    });
  });
  return out.slice(0, 25);
}

// 디시인사이드 실시간베스트 갤러리(힛갤)
export function dcbest(html, source) {
  const $ = cheerio.load(html);
  const out = [];
  $("tr.ub-content").each((_, el) => {
    const num = clean($(el).find("td.gall_num").text());
    if (!/^\d+$/.test(num)) return; // 공지/설문 행 제외
    const a = $(el).find("td.gall_tit a").first();
    const href = a.attr("href");
    const title = clean(a.clone().children("span, em").remove().end().text()) || clean(a.text());
    if (!href || !href.includes("/board/view/") || !title) return;
    const reply = $(el).find("a.reply_numbox .reply_num").text().replace(/[^\d]/g, "");
    const views = clean($(el).find("td.gall_count").text()).replace(/[^\d]/g, "");
    const dateEl = $(el).find("td.gall_date");
    const dateStr = dateEl.attr("title") || dateEl.text();
    const ts = Date.parse(dateStr);
    out.push({
      id: `${source.id}:${href}`,
      sourceId: source.id,
      title,
      link: href.startsWith("http") ? href : "https://gall.dcinside.com" + href,
      author: null,
      category: null,
      thumbnail: null,
      summary: "",
      publishedAt: Number.isFinite(ts) ? ts : Date.now(),
      signals: {
        comments: Number(reply) || 0,
        views: Number(views) || 0,
        recommends: 0,
      },
    });
  });
  return out.slice(0, 25);
}

export const SCRAPERS = { fmkorea, dcbest };
