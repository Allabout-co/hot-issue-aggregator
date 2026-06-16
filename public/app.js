// 프론트엔드 로직: /api/feed, /api/sources 폴링 + 렌더링
let SOURCES = [];
let CATEGORIES = [];
let CAT_MAP = {};
let activeFilter = "all"; // "all" | sourceId
let activeCat = "all"; // "all" | categoryId
let SRC_COUNTS = {}; // 소스별 현재 수집 건수 (0이면 칩·컬럼 숨김)

const hasData = (id) => (SRC_COUNTS[id] ?? 1) > 0;

const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2000);
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function srcMeta(id) {
  return SOURCES.find((s) => s.id === id) || { name: id, color: "#888", badge: "?" };
}

function esc(s = "") {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderFilters() {
  const wrap = $("#filters");
  const chip = (id, name, color) =>
    `<button class="chip ${activeFilter === id ? "active" : ""}" data-id="${id}">
       ${color ? `<span class="dot" style="background:${color}"></span>` : ""}${esc(name)}
     </button>`;
  wrap.innerHTML =
    chip("all", "전체", "") +
    SOURCES.filter((s) => hasData(s.id))
      .map((s) => chip(s.id, s.name, s.color))
      .join("");
  wrap.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => {
      activeFilter = c.dataset.id;
      renderFilters();
      load();
    })
  );
}

function renderCatFilters() {
  const wrap = $("#catFilters");
  const chip = (id, label) =>
    `<button class="chip ${activeCat === id ? "active" : ""}" data-id="${id}">${esc(label)}</button>`;
  wrap.innerHTML =
    chip("all", "전체 카테고리") +
    CATEGORIES.map((c) => chip(c.id, `${c.emoji} ${c.name}`)).join("");
  wrap.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => {
      activeCat = c.dataset.id;
      renderCatFilters();
      load();
    })
  );
}

function catBadge(catId) {
  const c = CAT_MAP[catId];
  return c ? `<span class="cat-badge">${c.emoji} ${esc(c.name)}</span>` : "";
}

const matchCat = (p) => activeCat === "all" || p.category === activeCat;

// 각 글의 실제 지표 1개를 표시(조회수 > 추천 > 댓글 순). 없으면 빈칸(예: 루리웹)
function metricHTML(s = {}) {
  if (s.views > 0) return `<span class="metric">👁 ${s.views.toLocaleString("ko-KR")}</span>`;
  if (s.recommends > 0) return `<span class="metric">👍 ${s.recommends.toLocaleString("ko-KR")}</span>`;
  if (s.comments > 0) return `<span class="metric">💬 ${s.comments.toLocaleString("ko-KR")}</span>`;
  return `<span class="metric metric-none"></span>`;
}

function hotItemHTML(p, i) {
  const m = srcMeta(p.sourceId);
  const cross =
    p.crossSources && p.crossSources.length > 1
      ? `<span class="cross">🔥 ${p.crossSources.length}개 커뮤니티</span>`
      : "";
  const thumb = `<span class="thumb" style="background:${m.color}">
      ${p.thumbnail ? `<img src="${esc(p.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
      <span class="thumb-ph">${m.badge}</span>
    </span>`;
  return `<a class="hot-item" href="${p.link}" target="_blank" rel="noopener">
    <span class="rank">${i + 1}</span>
    ${thumb}
    <span class="hot-main">
      <span class="hot-title">${esc(p.title)}</span>
      <span class="hot-meta">
        <span class="src-badge" style="background:${m.color}">${m.badge}</span>
        ${catBadge(p.category)}
        ${cross}
        <span>${esc(m.name)}</span>
        <span>· ${timeAgo(p.publishedAt)}</span>
      </span>
    </span>
    ${metricHTML(p.signals)}
  </a>`;
}

function renderHot(hot) {
  const list = hot.filter(
    (p) => (activeFilter === "all" || p.sourceId === activeFilter) && matchCat(p)
  );
  $("#hotList").innerHTML =
    list.map(hotItemHTML).join("") || `<li class="src-down">표시할 글이 없습니다.</li>`;
}

function renderSources(bySource, status) {
  const cols = SOURCES.filter((s) => hasData(s.id))
    .filter((s) => activeFilter === "all" || s.id === activeFilter)
    .map((s) => {
      const posts = (bySource[s.id] || []).filter(matchCat);
      const st = status.find((x) => x.sourceId === s.id);
      const body =
        posts.length === 0
          ? `<div class="src-down">${st && !st.ok ? "수집 실패 — 잠시 후 재시도" : activeCat !== "all" ? "이 카테고리 글 없음" : "수집 대기 중…"}</div>`
          : `<ol class="src-list">${posts
              .slice(0, 12)
              .map(
                (p, i) =>
                  `<li><a href="${p.link}" target="_blank" rel="noopener">
                     <span class="n">${i + 1}</span><span class="t">${esc(p.title)}</span>
                   </a></li>`
              )
              .join("")}</ol>`;
      return `<div class="src-col">
        <div class="src-head">
          <span class="badge" style="background:${s.color}">${s.badge}</span>
          ${esc(s.name)}<span class="cnt">${posts.length}</span>
        </div>${body}
      </div>`;
    })
    .join("");
  $("#sourceCols").innerHTML = cols;
}

// 아주 작은 마크다운(### 헤더, **굵게**, 줄바꿈)만 렌더
function miniMarkdown(md = "") {
  return esc(md)
    .replace(/^###\s*(.+)$/gm, "<h4>$1</h4>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

const BRIEF_DESC = `<p class="brief-desc">지금 여러 커뮤니티에서 가장 뜨거운 이슈를 AI가 테마별로 묶어 <b>30초 요약</b>으로 정리해 드립니다. 긴 글·댓글을 다 읽지 않아도 흐름이 한눈에.</p>`;

function renderBriefing(data) {
  const el = $("#briefing");
  const b = data.briefing;

  // 비활성(키 미설정)이거나 아직 요약 없으면 카드 자체를 숨김
  if (data.briefingEnabled === false || !b || (!b.text && !b.error)) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  if (b && b.error) {
    el.innerHTML = `<div class="brief-head">🤖 오늘의 핫이슈 브리핑</div>${BRIEF_DESC}<p class="brief-off">요약 생성 실패: ${esc(b.error)}</p>`;
    return;
  }
  if (!b || !b.text) {
    el.innerHTML = `<div class="brief-head">🤖 오늘의 핫이슈 브리핑</div>${BRIEF_DESC}<p class="brief-off">첫 브리핑을 준비하고 있어요…</p>`;
    return;
  }
  el.innerHTML = `<div class="brief-head">🤖 오늘의 핫이슈 브리핑 <span class="brief-meta">${esc(b.model || "")} · ${timeAgo(b.generatedAt)}</span></div>
    ${BRIEF_DESC}
    <div class="brief-body">${miniMarkdown(b.text)}</div>`;
}

async function load() {
  const res = await fetch("/api/feed");
  const data = await res.json();
  SRC_COUNTS = Object.fromEntries((data.status || []).map((s) => [s.sourceId, s.count]));
  if (activeFilter !== "all" && !hasData(activeFilter)) activeFilter = "all";
  renderFilters();
  renderBriefing(data);
  renderHot(data.hot || []);
  renderSources(data.bySource || {}, data.status || []);
  const dot = (on) => (on ? "🟢" : "⚪");
  $("#integrations").innerHTML =
    `연동: ${dot(data.briefingEnabled)} AI 브리핑 · ${dot(data.notifyEnabled)} 텔레그램 푸시`;
  $("#updated").textContent = data.collectedAt
    ? `업데이트 ${timeAgo(data.collectedAt)}`
    : "수집 대기 중…";
}

async function init() {
  [SOURCES, CATEGORIES] = await Promise.all([
    fetch("/api/sources").then((r) => r.json()),
    fetch("/api/categories").then((r) => r.json()),
  ]);
  CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  renderFilters();
  renderCatFilters();
  await load();
  setInterval(load, 30000); // 30초마다 화면 갱신(체감 실시간)

  // 위로 가기 버튼
  const toTop = $("#toTop");
  window.addEventListener("scroll", () => {
    toTop.hidden = window.scrollY < 400;
  });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // 공유: 모바일은 네이티브 공유시트(카톡 등), 데스크톱은 링크 복사
  $("#shareBtn")?.addEventListener("click", async () => {
    const data = {
      title: "🔥 핫이슈",
      text: "한국 커뮤니티 핫이슈 실시간 모아보기",
      url: location.origin + "/",
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        window.gtag?.("event", "share", { method: "web_share" });
      } else {
        await navigator.clipboard.writeText(data.url);
        toast("링크가 복사됐어요 📋");
        window.gtag?.("event", "share", { method: "copy" });
      }
    } catch {
      /* 사용자가 취소 */
    }
  });

  $("#refreshBtn").addEventListener("click", async () => {
    $("#refreshBtn").textContent = "↻ 수집 중…";
    await fetch("/api/refresh", { method: "POST" });
    await load();
    $("#refreshBtn").textContent = "↻ 새로고침";
  });
}

init();

// PWA 서비스워커 등록(홈 화면에 추가 + 오프라인 셸)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
