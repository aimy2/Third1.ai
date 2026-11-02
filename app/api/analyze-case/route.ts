
import { NextResponse } from "next/server";


const responseSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["ask_clarification", "ready_for_verdict"],
    },
    targetSpeaker: {
      type: ["string", "null"],
      enum: ["person_a", "person_b", null],
    },
    question: {
      type: ["string", "null"],
    },
    reason: {
      type: "string",
    },
  },
  required: ["action", "targetSpeaker", "question", "reason"],
  additionalProperties: false,
};




const systemPrompt = `
You are Third1 AI, an impartial, sharp-witted referee for everyday disputes.

Your job is to identify the real friction point, test unverified claims, and decide whether to ask ONE high-impact clarification question or proceed to a verdict.

REALITY-CHECK & QUESTION STRATEGY:
- DRILL DOWN IMMEDIATELY: If a participant claims a pattern (e.g., "They always pick", "They never help"), the dispute is about FAIRNESS or DOMINANCE, not the surface topic.
- NO REDUNDANT QUESTIONS: NEVER ask a participant what they want if they already stated it. NEVER ask generic administrative questions ("What is the desired outcome?").
- SPARK SELF-REALIZATION: Questions must be sharp, fun, and provocative. Ask a targeted question that forces the OTHER participant to confront the core issue (e.g., turn-taking, constraints, or uncommunicated rules).
- DISCOVER CONSTRAINTS: Check if they are forced into a single choice (shared budget, single order) or if they can simply act independently.

EVIDENCE & RULES:
- Attribute every claim strictly to its speaker. An allegation of past behavior is a claim to be investigated, not a proven fact.
- Skipped/refused questions represent missing data—never guilt or wrongdoing. Do not repeat skipped questions.
- Case Limit: Maximum 3 clarification questions total across the whole case.

DECISION & OUTPUT:
- Return ask_clarification if clarificationCount < 3 AND a material uncertainty about fairness, constraints, or turn-taking remains. Set targetSpeaker ("person_a" | "person_b") and question.
- Return ready_for_verdict if evidence is sufficient to judge fairness, no useful question remains, or limit is reached. Set targetSpeaker and question to null.
- Use actual participant names. Keep reason brief. Return only required structured response.
`;


export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      caseTitle,
      personAName,
      personBName,
      messages,
      clarificationCount,
    } = body;

    if (
      typeof caseTitle !== "string" ||
      typeof personAName !== "string" ||
      typeof personBName !== "string" ||
      !Array.isArray(messages) ||
      !Number.isInteger(clarificationCount) ||
      clarificationCount < 0 ||
      clarificationCount > 3
    ) {
      return NextResponse.json(
        { error: "Invalid case information." },
        { status: 400 }
      );
    }

    if (
      !caseTitle.trim() ||
      !personAName.trim() ||
      !personBName.trim() ||
      messages.length === 0 ||
      messages.length > 100
    ) {
      return NextResponse.json(
        { error: "The case information is incomplete or too large." },
        { status: 400 }
      );
    }

    const validMessages = messages.every(
      (message) =>
        message &&
        ["person_a", "person_b", "third1_ai"].includes(message.speaker) &&
        typeof message.content === "string" &&
        message.content.trim().length > 0 &&
        message.content.length <= 2000 &&
        [
          "testimony",
          "clarification_question",
          "clarification_answer",
          "clarification_skipped",
          "verdict",
        ].includes(message.type)
    );

    if (!validMessages) {
      return NextResponse.json(
        { error: "One or more conversation messages are invalid." },
        { status: 400 }
      );
    }

    const caseContext = {
      caseTitle: caseTitle.trim(),
      participants: {
        person_a: personAName.trim(),
        person_b: personBName.trim(),
      },
      clarificationCount,
     messages: messages.map((message) => ({
  speaker:
    message.speaker === "person_a"
      ? personAName.trim()
      : message.speaker === "person_b"
        ? personBName.trim()
        : "Third1 AI",
  type: message.type,
  content: message.content,
})),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let groqResponse: Response;

    try {
      groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: JSON.stringify(caseContext),
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "case_analysis",
                strict: true,
                schema: responseSchema,
              },
            },
            temperature: 0.2,
            reasoning_effort: "low",
            include_reasoning: false,
            max_completion_tokens: 1500,
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!groqResponse.ok) {
  const errorDetails = await groqResponse.text();

  console.error("Groq API error:", groqResponse.status);
  console.error("Groq error details:", errorDetails);

  return NextResponse.json(
    { error: "The AI could not analyze this case. Please try again." },
    { status: 502 }
  );
}
    const result = await groqResponse.json();
    const content = result.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "The AI returned an empty response." },
        { status: 502 }
      );
    }

    const analysis = JSON.parse(content);

    if (
      analysis.action === "ask_clarification" &&
      (
        !["person_a", "person_b"].includes(analysis.targetSpeaker) ||
        typeof analysis.question !== "string" ||
        !analysis.question.trim() ||
        clarificationCount >= 3
      )
    ) {
      return NextResponse.json(
        { error: "The AI returned an invalid clarification decision." },
        { status: 502 }
      );
    }

    if (
      analysis.action === "ready_for_verdict" &&
      (
        analysis.targetSpeaker !== null ||
        analysis.question !== null
      )
    ) {
      return NextResponse.json(
        { error: "The AI returned an invalid verdict decision." },
        { status: 502 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "The AI request timed out. Please try again." },
        { status: 504 }
      );
    }

    console.error("Case analysis error:", error);

    return NextResponse.json(
      { error: "Something went wrong while analyzing the case." },
      { status: 500 }
    );
  }
}
