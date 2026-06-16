// 수집 대상 소스 정의 (플러그인 구조)
// type: "rss" | "hn"
// weight: 통합 핫랭킹에서의 출처 가중치
// 새 커뮤니티를 추가하려면 이 배열에 한 줄만 넣으면 됩니다.

export const SOURCES = [
  {
    id: "ruliweb-best",
    name: "루리웹 베스트",
    type: "rss",
    url: "https://bbs.ruliweb.com/best/board/300143/rss",
    weight: 1.0,
    color: "#2f6fed",
    badge: "RW",
  },
  {
    id: "ppomppu-free",
    name: "뽐뿌 자유",
    type: "rss",
    url: "https://www.ppomppu.co.kr/rss.php?id=freeboard",
    weight: 0.9,
    color: "#d6332e",
    badge: "PP",
  },
  {
    id: "ruliweb-humor",
    name: "루리웹 유머",
    type: "rss",
    url: "https://bbs.ruliweb.com/community/board/300148/rss",
    weight: 0.85,
    color: "#4a86ff",
    badge: "RW",
  },
  {
    id: "ppomppu-deal",
    name: "뽐뿌 핫딜",
    type: "rss",
    url: "https://www.ppomppu.co.kr/rss.php?id=ppomppu",
    weight: 0.8,
    color: "#e8632e",
    badge: "PP",
  },
  {
    id: "dcinside-best",
    name: "디시 실베",
    type: "scrape",
    scraper: "dcbest",
    url: "https://gall.dcinside.com/board/lists/?id=dcbest",
    weight: 1.0,
    color: "#3b4890",
    badge: "DC",
  },
  {
    id: "fmkorea-best",
    name: "에펨 베스트",
    type: "ingest", // 펨코는 클라우드 IP 차단 → 외부 수집기(내 PC)가 /api/ingest로 push
    scraper: "fmkorea",
    url: "https://www.fmkorea.com/index.php?mid=best",
    weight: 0.95,
    color: "#2563d6",
    badge: "FM",
  },
  {
    id: "hackernews",
    name: "Hacker News (해외)",
    type: "hn",
    url: "https://hacker-news.firebaseio.com/v0",
    weight: 0.7,
    color: "#ff6600",
    badge: "HN",
  },
];

export const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
