# 🔥 핫이슈 — 한국 커뮤니티 통합 애그리게이터

여러 커뮤니티의 "지금 가장 뜨거운 글"을 한 화면에 모아 보여주는 서비스. (中 today热榜 / tophub 스타일)

## 실행

```powershell
npm install      # 최초 1회
npm start        # http://localhost:3000
```

> Node.js 18+ 필요. 5분마다 자동 수집됩니다.

## 기능

- **통합 핫랭킹** — 7개 소스의 핫글을 출처별 정규화 + 라운드로빈으로 고르게 섞어 노출
- **커뮤니티별 컬럼** — tophub 스타일, 각 소스 실시간 베스트
- **카테고리 분류** — 정치·사회 / 연예 / 스포츠 / 게임 / IT / 경제·쇼핑 / 해외 / 유머 (룰 기반, 무료)
- **🤖 AI 브리핑** — 상위 핫이슈를 테마별로 묶어 30초 요약 (Claude API, 선택)
- **📈 텔레그램 푸시봇** — 새로 뜨는 핫이슈를 텔레그램으로 자동 알림 (선택)

## 연결된 소스 (7개, 모두 실측 작동)

| 소스 | 방식 | 비고 |
| --- | --- | --- |
| 루리웹 베스트 / 유머 | RSS | |
| 뽐뿌 자유 / 핫딜 | RSS | 추천·조회·댓글 신호 |
| 디시 실베(힛갤) | HTML 스크래핑 | 조회·댓글 신호 |
| 에펨 베스트 | HTML 스크래핑 | 댓글 신호 |
| Hacker News | API | 해외 트렌드 |

## 환경변수 (선택 기능)

| 변수 | 용도 |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI 브리핑 활성화 |
| `BRIEFING_MODEL` | 요약 모델 (기본 `claude-opus-4-8`, 비용절감 시 `claude-haiku-4-5`) |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 (@BotFather 발급) |
| `TELEGRAM_CHAT_ID` | 알림 받을 채팅 ID |
| `TELEGRAM_TOP_N` | 푸시 대상 상위 N (기본 10) |
| `PORT` | 서버 포트 (기본 3000) |

```powershell
# 예: AI 브리핑 + 텔레그램 켜고 실행
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:TELEGRAM_BOT_TOKEN="123:abc"; $env:TELEGRAM_CHAT_ID="123456"
npm start
```

## 구조

```
server.js          Express 서버 + JSON API
src/
  sources.js       소스 정의 (한 줄 추가로 커뮤니티 확장)
  collect.js       RSS / HN / 스크래핑 수집 → 공통 Post 정규화
  scrapers.js      디시·에펨 HTML 스크래퍼
  rank.js          핫지수 + 교차출처 묶기 + 라운드로빈
  categorize.js    룰 기반 카테고리 분류
  briefing.js      Claude API 핫이슈 요약
  notify.js        텔레그램 푸시
  store.js         5분 주기 수집 캐시 + 디스크 백업
public/            프론트엔드(tophub 스타일 UI)
```

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/sources` | 소스 메타 |
| GET | `/api/categories` | 카테고리 메타 |
| GET | `/api/feed` | 통합 핫랭킹 + 소스별 + 브리핑 + 연동상태 |
| POST | `/api/refresh` | 수동 즉시 수집 |
| POST | `/api/notify/test` | 텔레그램 연결 테스트 |

## 핫랭킹 방식

1. **출처별 정규화** — 커뮤니티마다 신호 스케일이 달라 출처 내부 최댓값으로 정규화
2. **시간가중 점수** — `1/(경과시간+2)^1.4` + 추천·댓글·조회 로그 가중
3. **교차이슈 우선** — 제목 토큰 Jaccard ≥ 0.5로 여러 커뮤니티 동시 등장 글을 묶어 최상단
4. **라운드로빈** — 통합랭킹은 출처별로 번갈아 노출해 쏠림 방지

## 합법성

본문은 저장/전재하지 않고 **제목·요약·지표·링크만** 보관하며 클릭 시 원문으로 이동합니다. 스크래핑 소스(디시·에펨)는 폴라이트 헤더 + 상위 N개로 제한합니다. 운영 시 각 사이트의 robots.txt·이용약관을 확인하세요.

## 다음 단계

- [ ] 더 많은 커뮤니티 (클리앙·보배드림 스크래퍼)
- [ ] LLM 카테고리 분류(룰 기반 보완) + 이슈 클러스터 요약
- [ ] 검색 + 개인화 피드
- [ ] PostgreSQL 영구 저장 + 급상승 감지(시계열)
- [ ] 디스코드/카톡 알림 추가
```
