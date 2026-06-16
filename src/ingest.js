// 외부 수집기(가정 IP의 내 PC 등)가 보낸 글을 받아 보관.
// IP 차단으로 서버에서 직접 못 긁는 소스(펨코)를 위한 통로.
// INGEST_TOKEN 환경변수가 있어야 활성화(없으면 거부).

const TOKEN = process.env.INGEST_TOKEN;
const MAX_AGE = 30 * 60 * 1000; // 30분 지난 데이터는 폐기(수집기 멈추면 자연 소멸)

const store = {}; // sourceId -> { items, receivedAt }

export function ingestEnabled() {
  return Boolean(TOKEN);
}

export function verifyToken(t) {
  return Boolean(TOKEN) && t === TOKEN;
}

export function putIngest(sourceId, items) {
  store[sourceId] = { items: (items || []).slice(0, 30), receivedAt: Date.now() };
}

// 신선한(30분 이내) 글만 합쳐서 반환
export function getFreshIngest() {
  const now = Date.now();
  return Object.values(store)
    .filter((e) => now - e.receivedAt < MAX_AGE)
    .flatMap((e) => e.items);
}
