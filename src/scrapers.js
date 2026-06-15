// RSS 없는 커뮤니티용 HTML 스크래퍼 (디시 힛갤 / 에펨 베스트)
// 합법 설계: 제목·링크·지표만 추출, 본문은 원문 링크아웃. 폴라이트 헤더 + 상위 N개만.
import * as cheerio from "cheerio";

const clean = (s = "") => s.replace(/\s+/g, " ").trim();

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
    const idx = out.length;
    out.push({
      id: `${source.id}:${href}`,
      sourceId: source.id,
      title,
      link: href.startsWith("http") ? href : "https://www.fmkorea.com" + href,
      author: null,
      category: null,
      thumbnail: null,
      summary: "",
      // 베스트 목록 순서를 최신순처럼 반영(앞순위 = 더 높은 점수)
      publishedAt: Date.now() - idx * 90_000,
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
