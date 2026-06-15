// 각 소스에서 글을 가져와 공통 형태(Post)로 정규화
import Parser from "rss-parser";
import { SOURCES } from "./sources.js";
import { SCRAPERS } from "./scrapers.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const parser = new Parser({
  timeout: 9000,
  headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, */*" },
  customFields: { item: [["hits", "hits"]] },
});

// 공통 Post 형태
// { id, sourceId, title, link, author, category, thumbnail, summary,
//   publishedAt(ms), signals:{recommends,views,comments} }

function firstImg(html = "") {
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function decodeEntities(s = "") {
  return String(s)
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, "&");
}

function stripHtml(html = "") {
  return decodeEntities(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

// 뽐뿌 <hits> [추천|조회|댓글|기타] 형태 파싱
function parseHits(hits) {
  if (!hits) return {};
  const nums = String(hits).match(/\d+/g);
  if (!nums) return {};
  const [recommends, views, comments] = nums.map(Number);
  return {
    recommends: recommends || 0,
    views: views || 0,
    comments: comments || 0,
  };
}

async function collectRss(source) {
  const feed = await parser.parseURL(source.url);
  return (feed.items || []).slice(0, 25).map((it, i) => {
    const summary = stripHtml(it.contentSnippet || it.content || it.description || "");
    return {
      id: `${source.id}:${it.guid || it.link || i}`,
      sourceId: source.id,
      title: decodeEntities((it.title || "").trim()),
      link: it.link,
      author: it.creator || it.author || null,
      category: it.categories?.[0] || null,
      thumbnail: firstImg(it["content:encoded"] || it.content || it.description || ""),
      summary: summary.slice(0, 160),
      publishedAt: it.isoDate ? new Date(it.isoDate).getTime() : Date.now(),
      signals: parseHits(it.hits),
    };
  });
}

async function collectHN(source) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  const ids = await fetch(`${source.url}/topstories.json`, { signal: ctrl.signal }).then((r) =>
    r.json()
  );
  clearTimeout(t);
  const top = ids.slice(0, 20);
  const items = await Promise.all(
    top.map((id) =>
      fetch(`${source.url}/item/${id}.json`)
        .then((r) => r.json())
        .catch(() => null)
    )
  );
  return items
    .filter((it) => it && it.title)
    .map((it) => ({
      id: `${source.id}:${it.id}`,
      sourceId: source.id,
      title: it.title.trim(),
      link: it.url || `https://news.ycombinator.com/item?id=${it.id}`,
      author: it.by || null,
      category: it.type || null,
      thumbnail: null,
      summary: "",
      publishedAt: (it.time || Date.now() / 1000) * 1000,
      signals: { recommends: it.score || 0, comments: it.descendants || 0, views: 0 },
    }));
}

async function collectScrape(source) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  const res = await fetch(source.url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
    signal: ctrl.signal,
  });
  clearTimeout(t);
  const html = await res.text();
  const scraper = SCRAPERS[source.scraper];
  if (!scraper) throw new Error(`unknown scraper: ${source.scraper}`);
  return scraper(html, source);
}

export async function collectSource(source) {
  try {
    const items =
      source.type === "hn"
        ? await collectHN(source)
        : source.type === "scrape"
          ? await collectScrape(source)
          : await collectRss(source);
    return { ok: true, sourceId: source.id, items };
  } catch (e) {
    return { ok: false, sourceId: source.id, items: [], error: e.message };
  }
}

export async function collectAll() {
  const results = await Promise.all(SOURCES.map(collectSource));
  const posts = results.flatMap((r) => r.items);
  const status = results.map((r) => ({
    sourceId: r.sourceId,
    ok: r.ok,
    count: r.items.length,
    error: r.error || null,
  }));
  return { posts, status, collectedAt: Date.now() };
}
