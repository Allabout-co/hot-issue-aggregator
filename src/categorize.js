// 카테고리 자동 분류 (룰 기반: 출처 prior + 제목 키워드)
// API 비용 없이 즉시 동작. 키워드는 운영하며 계속 보강하면 된다.

export const CATEGORIES = [
  { id: "politics", name: "정치·사회", emoji: "🏛️" },
  { id: "ent", name: "연예·방송", emoji: "🎬" },
  { id: "sports", name: "스포츠", emoji: "⚽" },
  { id: "game", name: "게임", emoji: "🎮" },
  { id: "tech", name: "IT·테크", emoji: "💻" },
  { id: "money", name: "경제·쇼핑", emoji: "💰" },
  { id: "world", name: "해외", emoji: "🌐" },
  { id: "etc", name: "유머·일상", emoji: "😀" },
];

const KEYWORDS = {
  politics: [
    "대통령", "정청래", "한동훈", "이재명", "민주당", "국힘", "국민의힘", "검찰", "법원", "판결",
    "총리", "의대", "의사", "파업", "노조", "선거", "재선", "시위", "국회", "장관", "정부", "여당",
    "야당", "안민석", "인수위", "구속", "기소", "징역", "범죄", "경찰", "사건", "논란", "갑질",
  ],
  ent: [
    "아이돌", "드라마", "배우", "가수", "예능", "유튜버", "ott", "넷플릭스", "콘서트", "데뷔",
    "걸그룹", "보이그룹", "방송", "연예", "빠니보틀", "박명수", "명수", "리브", "리센느", "뮤비", "앨범",
  ],
  sports: [
    "ufc", "축구", "야구", "월드컵", "손흥민", "감독", "직관", "kbo", "mlb", "epl", "농구", "배구",
    "올림픽", "국가대표", "경기", "선수", "리그", "토트넘", "페레이라", "토푸리아", "마카체프",
  ],
  game: [
    "게임", "명조", "버튜버", "스팀", "스택", "롤", "lol", "던파", "메이플", "원신", "rpg", "패치",
    "캐릭터", "가챠", "닌텐도", "플스", "ps5", "스위치", "공략", "뉴비", "보스",
  ],
  tech: [
    "ai", "인공지능", "챗gpt", "gpt", "애플", "삼성", "갤럭시", "아이폰", "구글", "개발", "코딩",
    "앱", "소프트웨어", "반도체", "테슬라", "anthropic", "claude", "오픈ai", "llm", "프로그래밍", "해킹",
  ],
  money: [
    "주식", "코인", "비트코인", "부동산", "환율", "핫딜", "할인", "쿠폰", "특가", "무료배송", "가격",
    "최저가", "적립", "카드", "연봉", "월급", "금리", "경제", "투자", "세금", "물가", "분양",
  ],
  world: [
    "미국", "중국", "일본", "이란", "이스라엘", "우크라이나", "러시아", "트럼프", "푸틴", "전쟁",
    "북한", "美", "中", "日", "北", "유럽", "독일", "프랑스", "영국", "대만", "외신", "해외",
    "관세", "나토", "유엔", "국제", "모로코", "멕시코",
  ],
};

const SOURCE_PRIOR = {
  "ppomppu-deal": "money",
  hackernews: "world",
  "ruliweb-humor": "etc",
};

function scoreText(title = "") {
  const t = title.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const w of words) if (t.includes(w)) s++;
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }
  return best; // 매칭 없으면 null
}

export function categorize(post) {
  const byText = scoreText(post.title);
  if (byText) return byText; // 키워드 매칭이 가장 신뢰도 높음
  if (SOURCE_PRIOR[post.sourceId]) return SOURCE_PRIOR[post.sourceId];
  return "etc";
}
