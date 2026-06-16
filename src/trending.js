// 급상승 감지 — 직전 수집 대비 지표 증가 속도로 "지금 막 뜨는" 글을 표시.
// 서버 메모리에 직전 스냅샷을 두고 매 수집마다 delta/분(velocity)을 계산.

const prev = new Map(); // id -> { views, comments, recommends, ts }
const FLOOR = 2; // 이 속도 미만은 급상승으로 안 봄
const MAX_SURGING = 6; // 너무 많으면 특별함이 사라지므로 상한

export function markTrending(posts) {
  const now = Date.now();
  for (const p of posts) {
    const s = p.signals || {};
    const pr = prev.get(p.id);
    let velocity = 0;
    if (pr) {
      const dtMin = Math.max((now - pr.ts) / 60000, 0.5);
      const dV = Math.max((s.views || 0) - (pr.views || 0), 0);
      const dC = Math.max((s.comments || 0) - (pr.comments || 0), 0);
      const dR = Math.max((s.recommends || 0) - (pr.recommends || 0), 0);
      // 조회는 흔하니 낮게, 댓글·추천은 참여도 높으니 가중
      velocity = (dV * 0.2 + dC * 5 + dR * 8) / dtMin;
    }
    p.velocity = Math.round(velocity * 10) / 10;
    p.surging = false;
  }

  // 속도 상위 + 임계 이상만 급상승 표시
  const movers = posts
    .filter((p) => p.velocity >= FLOOR)
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, MAX_SURGING);
  for (const p of movers) p.surging = true;

  // 다음 비교용 스냅샷 저장(현재 글만 유지해 메모리 누수 방지)
  prev.clear();
  for (const p of posts) {
    const s = p.signals || {};
    prev.set(p.id, {
      views: s.views || 0,
      comments: s.comments || 0,
      recommends: s.recommends || 0,
      ts: now,
    });
  }
  return movers.length;
}
