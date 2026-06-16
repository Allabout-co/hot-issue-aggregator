// 일회성: OG 이미지 + 앱 아이콘 PNG 생성 (sharp 필요, 생성 후 sharp는 제거 가능)
import sharp from "sharp";

const grad = `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb020"/><stop offset="1" stop-color="#ff5a36"/></linearGradient>`;
const flame = `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="#fff"/>`;

const iconSvg = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><defs>${grad}</defs><rect width="24" height="24" rx="6" fill="url(#g)"/><g transform="translate(3.6 3.6) scale(0.7)">${flame}</g></svg>`;

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>${grad}
    <radialGradient id="bg" cx="78%" cy="-10%" r="100%"><stop offset="0" stop-color="#20304f"/><stop offset="55%" stop-color="#0e1117"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(110 195)">
    <rect width="120" height="120" rx="28" fill="url(#g)"/>
    <g transform="translate(18 18) scale(3.5)">${flame}</g>
  </g>
  <text x="262" y="288" font-family="Malgun Gothic, Pretendard, sans-serif" font-size="98" font-weight="800" fill="#ffffff">핫이슈</text>
  <text x="265" y="356" font-family="Malgun Gothic, Pretendard, sans-serif" font-size="36" fill="#9aa6b6">한국 커뮤니티 핫이슈 실시간 통합</text>
  <text x="110" y="470" font-family="Malgun Gothic, Pretendard, sans-serif" font-size="31" fill="#e6edf3">루리웹 · 뽐뿌 · 디시 · 에펨 · HN — 지금 가장 뜨거운 글, 한 화면에</text>
</svg>`;

await sharp(Buffer.from(og)).png().toFile("public/og.png");
await sharp(Buffer.from(iconSvg(512))).png().toFile("public/icon-512.png");
await sharp(Buffer.from(iconSvg(192))).png().toFile("public/icon-192.png");
await sharp(Buffer.from(iconSvg(180))).png().toFile("public/apple-touch-icon.png");
console.log("✅ assets generated: og.png, icon-512/192, apple-touch-icon");
