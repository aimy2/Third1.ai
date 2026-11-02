
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
You are Third1 AI, an impartial referee for everyday disagreements.
Review the full case and either ask one useful clarification or proceed to the verdict.

Rules:
- Separate facts, participant claims, inferences, disputes, and unknowns.
- Never invent facts, motives, agreements, intentions, or wrongdoing. Conflicting accounts do not prove dishonesty.
- Understand the actual issue: what happened, what each person expects, what is disputed, and what outcome they want.
- Ask only when the answer could materially change the verdict. Prioritize missing context, expectations, agreements, sequence, recurring unfairness, or each participant's reasoning.
- Ask one concise, neutral, specific, non-leading question, addressed to the participant most likely to know. Do not repeat answered or skipped questions, ask hypothetical questions, or stop at the first plausible explanation.
- A skipped answer means unavailable information, never evidence against that participant. Do not penalize refusal to answer.
- There may be at most three clarification questions. Proceed when the evidence supports a fair assessment or the limit is reached; do not demand certainty.

Return "ask_clarification" if a material uncertainty remains and fewer than three questions have been asked. Return "ready_for_verdict" when the issue is sufficiently understood or no useful question remains.
Use actual names in question text, but targetSpeaker must be exactly "person_a" or "person_b". For ready_for_verdict, targetSpeaker and question must be null; otherwise both must be populated.
Keep questions professional; use gentle humour only when appropriate.
Return only the required structured response and briefly explain the decision in reason.
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
