// 핫지수 산정 + 교차출처 중복 묶기(클러스터링)
import { SOURCE_MAP } from "./sources.js";
import { categorize } from "./categorize.js";

const STOP = new Set(["the", "a", "to", "of", "in", "on", "is", "이", "그", "저", "및", "수", "것"]);

function tokenize(title = "") {
  return [
    ...new Set(
      title
        .toLowerCase()
        .replace(/[^0-9a-z가-힣\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP.has(w))
    ),
  ];
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const inter = a.filter((x) => setB.has(x)).length;
  return inter / (a.length + b.length - inter);
}

// 시간가중 + 신호(추천/댓글/조회) — 출처 가중치는 정규화 후 별도 적용
function rawScore(post) {
  const ageHours = Math.max(0, (Date.now() - post.publishedAt) / 3_600_000);
  const recency = 1 / Math.pow(ageHours + 2, 1.4);
  const s = post.signals || {};
  const signal = (s.recommends || 0) * 3 + (s.comments || 0) * 2 + (s.views || 0) * 0.1;
  const signalBoost = 1 + Math.log10(1 + signal);
  return recency * signalBoost;
}

// 여러 커뮤니티에 동시 등장하는 글을 하나의 이슈로 묶고 가중치 부여
function buildClusters(posts) {
  const toks = posts.map((p) => tokenize(p.title));
  const parent = posts.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => {
    parent[find(a)] = find(b);
  };
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      if (posts[i].sourceId === posts[j].sourceId) continue;
      if (jaccard(toks[i], toks[j]) >= 0.5) union(i, j);
    }
  }
  const groups = new Map();
  posts.forEach((_, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });
  return groups;
}

export function rankAll(posts) {
  const groups = buildClusters(posts);

  // 1) 출처 내부 점수 → 출처별 최댓값으로 정규화 (커뮤니티 간 공정 비교)
  const raw = posts.map(rawScore);
  const maxBySrc = {};
  posts.forEach((p, i) => {
    maxBySrc[p.sourceId] = Math.max(maxBySrc[p.sourceId] || 0, raw[i]);
  });

  // 2) 정규화 점수 × 출처 가중치 × 교차출처 가중치
  const enriched = posts.map((p, i) => {
    const norm = raw[i] / (maxBySrc[p.sourceId] || 1);
    const weight = SOURCE_MAP[p.sourceId]?.weight ?? 1;
    return {
      ...p,
      _raw: raw[i],
      score: norm * weight * 100,
      crossSources: [p.sourceId],
      category: categorize(p),
    };
  });

  for (const idxs of groups.values()) {
    const sources = [...new Set(idxs.map((i) => posts[i].sourceId))];
    if (sources.length > 1) {
      const boost = 1 + 0.6 * (sources.length - 1); // 동시 등장 가중
      for (const i of idxs) {
        enriched[i].score *= boost;
        enriched[i].crossSources = sources;
      }
    }
  }

  enriched.forEach((p) => (p.score = Math.round(p.score * 10) / 10));

  // 출처별 랭킹(점수순)
  const bySource = {};
  for (const p of enriched) (bySource[p.sourceId] ||= []).push(p);
  for (const id of Object.keys(bySource)) {
    bySource[id].sort((a, b) => b.score - a.score);
    bySource[id] = bySource[id].slice(0, 20);
  }

  // 통합 핫랭킹: ① 교차이슈(여러 커뮤니티 동시 등장) 최상단 → ② 출처별 라운드로빈
  const seen = new Set();
  const hot = [];

  // ① 교차이슈: 클러스터당 대표 1개만
  const crossReps = [];
  for (const idxs of groups.values()) {
    const sources = [...new Set(idxs.map((i) => posts[i].sourceId))];
    if (sources.length > 1) {
      const rep = idxs.map((i) => enriched[i]).sort((a, b) => b.score - a.score)[0];
      crossReps.push(rep);
      idxs.forEach((i) => seen.add(enriched[i].id));
    }
  }
  crossReps.sort((a, b) => b.crossSources.length - a.crossSources.length || b.score - a.score);
  hot.push(...crossReps);

  // ② 라운드로빈: 가중치 높은 출처부터 한 개씩 번갈아
  const order = Object.keys(bySource).sort(
    (a, b) => (SOURCE_MAP[b]?.weight ?? 1) - (SOURCE_MAP[a]?.weight ?? 1)
  );
  const cursor = Object.fromEntries(order.map((id) => [id, 0]));
  let added = true;
  while (added && hot.length < 40) {
    added = false;
    for (const id of order) {
      const list = bySource[id];
      while (cursor[id] < list.length && seen.has(list[cursor[id]].id)) cursor[id]++;
      if (cursor[id] < list.length) {
        const item = list[cursor[id]++];
        seen.add(item.id);
        hot.push(item);
        added = true;
        if (hot.length >= 40) break;
      }
    }
  }

  return { hot, bySource };
}
