// LLM 요약: 상위 핫이슈 제목/스니펫을 묶어 "오늘의 핫이슈 브리핑" 생성
// 본문은 다루지 않고, 이미 노출 중인 제목/요약만 입력으로 사용(저작권 안전).
import Anthropic from "@anthropic-ai/sdk";
import { SOURCE_MAP } from "./sources.js";

const MODEL = process.env.BRIEFING_MODEL || "claude-opus-4-8";
const ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);

const client = ENABLED ? new Anthropic() : null;

export function briefingEnabled() {
  return ENABLED;
}

const SYSTEM = `너는 한국 커뮤니티 핫이슈를 정리하는 에디터다.
여러 커뮤니티에서 지금 가장 화제인 글들의 "제목 + 짧은 요약" 목록을 받는다.
이걸 독자가 30초 만에 흐름을 파악하도록 한국어로 브리핑한다.

규칙:
- 비슷한 주제끼리 2~4개 테마로 묶는다.
- 각 테마는 "### 이모지 테마명" 헤더 + 1~2문장 설명.
- 과장/낚시 없이 중립적으로. 확인 안 된 내용은 단정하지 말 것.
- 정치/사회 이슈는 특정 진영 편들지 말고 사실 위주로.
- 전체 6~10문장 이내로 간결하게. 원문을 그대로 베끼지 말고 네 말로 요약.`;

function buildInput(hot) {
  const lines = hot.slice(0, 20).map((p, i) => {
    const src = SOURCE_MAP[p.sourceId]?.name || p.sourceId;
    const snip = p.summary ? ` — ${p.summary.slice(0, 80)}` : "";
    return `${i + 1}. [${src}] ${p.title}${snip}`;
  });
  return `오늘의 커뮤니티 인기글 목록:\n\n${lines.join("\n")}`;
}

export async function generateBriefing(hot) {
  if (!ENABLED || !hot?.length) return null;
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: buildInput(hot) }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { text, model: MODEL, generatedAt: Date.now() };
  } catch (e) {
    console.error("[briefing] 생성 실패:", e.message);
    return { error: e.message, generatedAt: Date.now() };
  }
}
