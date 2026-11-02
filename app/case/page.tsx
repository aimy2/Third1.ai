
"use client";

import { useEffect, useRef, useState } from "react";

type Speaker = "person_a" | "person_b" | "third1_ai";
type ParticipantSpeaker = "person_a" | "person_b";

type MessageType =
  | "testimony"
  | "clarification_question"
  | "clarification_answer"
  | "clarification_skipped"
  | "verdict";

type CaseMessage = {
  id: string;
  speaker: Speaker;
  content: string;
  type: MessageType;
  createdAt: string;
  targetSpeaker?: ParticipantSpeaker;
};

    type VerdictCategory =
  | "person_a_more_reasonable"
  | "person_b_more_reasonable"
  | "both_wrong"
  | "both_have_valid_points"
  | "insufficient_information";

    type CaseVerdict = {
    category: VerdictCategory;
    summary: string;
    participantAssessments: {
        person_a: string;
        person_b: string;
    };
    supportedPoints: string[];
    disputedPoints: string[];
    unknowns: string[];
    reasoning: string;
    recommendations: string[];
    closingRemark: string;
    };


export default function CasePage() {
  // Courtroom stages
  const [isCourtroomOpen, setIsCourtroomOpen] = useState(false);

  // Case and participant details
  const [caseTitle, setCaseTitle] = useState("");
  const [personAName, setPersonAName] = useState("");
  const [personBName, setPersonBName] = useState("");

  // Conversation
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [activeSpeaker, setActiveSpeaker] =
  useState<ParticipantSpeaker | null>(null);  const [messageText, setMessageText] = useState("");

  // Voice transcription
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  type ClarificationStatus =
  | "idle"
  | "analyzing"
  | "asking_question"
  | "awaiting_answer"
  | "generating_verdict"
  | "verdict_complete";

const [clarificationStatus, setClarificationStatus] =
  useState<ClarificationStatus>("idle");

const [verdict, setVerdict] = useState<CaseVerdict | null>(null);

const [analysisError, setAnalysisError] = useState("");

const [clarificationCount, setClarificationCount] =
  useState(0);



const [currentQuestion, setCurrentQuestion] = useState<{
  content: string;
  targetSpeaker: ParticipantSpeaker;
} | null>(null);

const [hasPersonAFinished, setHasPersonAFinished] =
  useState(false);

const [hasPersonBFinished, setHasPersonBFinished] =
  useState(false);

  // Release microphone resources if the page unmounts.
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  // Stop microphone tracks and release references.
  function releaseMicrophone() {
    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  // Choose a recording format supported by the current browser.
  function getSupportedMimeType(): string | undefined {
    const possibleTypes = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    return possibleTypes.find((type) =>
      MediaRecorder.isTypeSupported(type)
    );
  }

  // Convert the browser's MIME type into a filename extension.
  function getAudioExtension(mimeType: string): string {
    const baseMimeType = mimeType.split(";")[0].trim().toLowerCase();

    switch (baseMimeType) {
      case "audio/mp4":
        return "mp4";

      case "audio/ogg":
        return "ogg";

      case "audio/mpeg":
      case "audio/mp3":
        return "mp3";

      case "audio/wav":
      case "audio/x-wav":
        return "wav";

      case "audio/flac":
        return "flac";

      default:
        return "webm";
    }
  }

  async function startRecording() {
    setVoiceError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        "Microphone access is unavailable. Use a supported browser over HTTPS or localhost."
      );
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setVoiceError(
        "Your browser does not support audio recording. Please type your message instead."
      );
      return;
    }

    try {
      // Request microphone permission.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Select a format supported by this browser.
      const mimeType = getSupportedMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceError(
          "A recording error occurred. Please try again or type your message."
        );

        setIsRecording(false);
        releaseMicrophone();
      };

      recorder.onstop = async () => {
        // Use the actual format reported by the recorder.
        const actualMimeType =
          recorder.mimeType ||
          audioChunksRef.current[0]?.type ||
          mimeType ||
          "audio/webm";

        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });

        // Release the microphone as soon as recording ends.
        releaseMicrophone();
        setIsRecording(false);

        if (audioBlob.size === 0) {
          setVoiceError(
            "No audio was captured. Please try recording again."
          );
          return;
        }

        // Prepare the recording for transcription.
        setIsTranscribing(true);

        try {
          const extension = getAudioExtension(actualMimeType);

          const audioFile = new File(
            [audioBlob],
            `third1-recording.${extension}`,
            { type: actualMimeType }
          );

          const formData = new FormData();
          formData.append("file", audioFile);

          // Send audio to our own backend.
          // The Groq API key never reaches the browser.
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.error || "Transcription failed."
            );
          }

          if (
            typeof result.text !== "string" ||
            !result.text.trim()
          ) {
            throw new Error(
              "No speech was recognized. Please try again."
            );
          }

          // Insert the transcript into the editable message.
          // Existing typed text is preserved.
          setMessageText((currentText) =>
            currentText.trim()
              ? `${currentText.trim()} ${result.text.trim()}`
              : result.text.trim()
          );
        } catch (error) {
          console.error("Transcription error:", error);

          setVoiceError(
            error instanceof Error
              ? error.message
              : "Could not transcribe the recording."
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);

      releaseMicrophone();

      if (error instanceof Error && error.name === "NotAllowedError") {
        setVoiceError(
          "Microphone permission was denied. Allow microphone access in your browser settings."
        );
      } else if (
        error instanceof Error &&
        error.name === "NotFoundError"
      ) {
        setVoiceError(
          "No microphone was found. Connect a microphone or type your message."
        );
      } else {
        setVoiceError(
          "Could not start recording. Please check your microphone and try again."
        );
      }
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }

  function enterCourtroom() {
    if (
      !caseTitle.trim() ||
      !personAName.trim() ||
      !personBName.trim()
    ) {
      return;
    }

    setIsCourtroomOpen(true);
  }

  function startNewCase() {
  // Stop any active recording and release the microphone.
  if (mediaRecorderRef.current?.state === "recording") {
    mediaRecorderRef.current.stop();
  }

  mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

  mediaRecorderRef.current = null;
  mediaStreamRef.current = null;
  audioChunksRef.current = [];

  // Reset case details.
  setCaseTitle("");
  setPersonAName("");
  setPersonBName("");

  // Reset conversation.
  setMessages([]);
  setActiveSpeaker(null);
  setMessageText("");

  // Reset voice states.
  setIsRecording(false);
  setIsTranscribing(false);
  setVoiceError("");

  // Reset AI and verdict states.
  setClarificationStatus("idle");
  setVerdict(null);
  setAnalysisError("");
  setClarificationCount(0);
  setCurrentQuestion(null);

  // Reset participant states.
  setHasPersonAFinished(false);
  setHasPersonBFinished(false);

  // Return to the setup screen.
  setIsCourtroomOpen(false);
}

  function openComposer(speaker: ParticipantSpeaker) {
    if (verdict) return;
    setActiveSpeaker(speaker);
    setMessageText("");
    setVoiceError("");
  }

  function cancelComposer() {
    if (isRecording) {
      stopRecording();
    }

    setMessageText("");
    setVoiceError("");
    setActiveSpeaker(null);
  }

  async function analyzeCase(conversation = messages) {
    if (verdict) return;
  if (conversation.length === 0) {
    setAnalysisError("The court needs testimony before analysis.");
    return;
  }

  setAnalysisError("");
  setClarificationStatus("analyzing");
  setActiveSpeaker(null);

  try {
    const response = await fetch("/api/analyze-case", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        caseTitle,
        personAName,
        personBName,
        messages: conversation,
        clarificationCount,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not analyze this case."
      );
    }

    if (result.action === "ask_clarification") {
      if (
        !["person_a", "person_b"].includes(result.targetSpeaker) ||
        typeof result.question !== "string" ||
        !result.question.trim()
      ) {
        throw new Error("The AI returned an invalid question.");
      }

      const targetSpeaker = result.targetSpeaker as ParticipantSpeaker;

      const aiMessage: CaseMessage = {
        id: crypto.randomUUID(),
        speaker: "third1_ai",
        content: result.question,
        createdAt: new Date().toLocaleTimeString(),
        type: "clarification_question",
        targetSpeaker,
      };


      setMessages((previousMessages) => [
        ...previousMessages,
        aiMessage,
      ]);

      setCurrentQuestion({
        content: result.question,
        targetSpeaker,
      });

      setClarificationCount((previousCount) => previousCount + 1);
      setClarificationStatus("awaiting_answer");

      // Open the composer for the participant being questioned.
      setActiveSpeaker(targetSpeaker);
      setMessageText("");
    } else if (result.action === "ready_for_verdict") {
  setClarificationStatus("generating_verdict");

  const verdictResponse = await fetch("/api/generate-verdict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      caseTitle,
      personAName,
      personBName,
      messages: conversation,
    }),
  });

  const generatedVerdict = await verdictResponse.json();

  if (!verdictResponse.ok) {
    throw new Error(
      generatedVerdict.error || "Could not generate the final verdict."
    );
  }

  setVerdict(generatedVerdict);
  setClarificationStatus("verdict_complete");

  const verdictMessage: CaseMessage = {
    id: crypto.randomUUID(),
    speaker: "third1_ai",
    content: generatedVerdict.summary,
    createdAt: new Date().toLocaleTimeString(),
    type: "verdict",
  };

  setMessages((previousMessages) => [
    ...previousMessages,
    verdictMessage,
  ]);
} else {
      throw new Error("The AI returned an unknown decision.");
    }
  } catch (error) {
    console.error("Case analysis error:", error);

    setAnalysisError(
      error instanceof Error
        ? error.message
        : "Something went wrong during case analysis."
    );

    setClarificationStatus("idle");
  }
}
function skipClarification() {
    if (verdict) return;
  if (
    clarificationStatus !== "awaiting_answer" ||
    !currentQuestion ||
    activeSpeaker !== currentQuestion.targetSpeaker
  ) {
    return;
  }

  const skippedMessage: CaseMessage = {
    id: crypto.randomUUID(),
    speaker: activeSpeaker,
    content: "Declined to answer the clarification question.",
    createdAt: new Date().toLocaleTimeString(),
    type: "clarification_skipped",
  };

  const updatedMessages = [...messages, skippedMessage];

  setMessages(updatedMessages);
  setCurrentQuestion(null);
  setMessageText("");
  setActiveSpeaker(null);
  setVoiceError("");

  void analyzeCase(updatedMessages);
}

function submitMessage() {
  if (verdict) return;
  if (
    !activeSpeaker ||
    !messageText.trim() ||
    isRecording ||
    isTranscribing
  ) {
    return;
  }

  const isClarificationAnswer =
    clarificationStatus === "awaiting_answer" &&
    currentQuestion?.targetSpeaker === activeSpeaker;

  const newMessage: CaseMessage = {
    id: crypto.randomUUID(),
    speaker: activeSpeaker,
    content: messageText.trim(),
    createdAt: new Date().toLocaleTimeString(),
    type: isClarificationAnswer
      ? "clarification_answer"
      : "testimony",
  };

  const updatedMessages = [...messages, newMessage];

  setMessages(updatedMessages);
  setMessageText("");
  setVoiceError("");
  setActiveSpeaker(null);

  if (isClarificationAnswer) {
    setCurrentQuestion(null);
    void analyzeCase(updatedMessages);
  }
}

  // STAGE 1: Participant setup
  if (!isCourtroomOpen) {
    return (
      <main className="min-h-screen bg-[#F7F5F0] px-5 py-12">
        <div className="mx-auto max-w-xl">
          <header className="mb-10 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#B99A62]">
              Third1 AI · The Courtroom
            </p>

            <h1 className="text-4xl font-bold text-[#17243A] sm:text-5xl">
              Before the court begins.
            </h1>

            <p className="mt-4 text-base leading-7 text-[#737C8C]">
              Every disagreement has two perspectives.
              Introduce both participants before entering the courtroom.
            </p>
          </header>

          <section className="space-y-5 rounded-2xl border border-[#E6E1D7] bg-white p-6 shadow-sm">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#17243A]">
                What is this disagreement about?
              </label>

              <input
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                placeholder="e.g. The Group Chat Disagreement"
                className="w-full rounded-xl border border-[#E6E1D7] bg-[#F7F5F0] p-3 text-sm text-[#17243A] outline-none focus:border-[#B99A62]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#17243A]">
                Participant 01
              </label>

              <input
                value={personAName}
                onChange={(e) => setPersonAName(e.target.value)}
                placeholder="Enter first participant's name"
                className="w-full rounded-xl border border-[#E6E1D7] bg-[#F7F5F0] p-3 text-sm text-[#17243A] outline-none focus:border-[#B99A62]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#17243A]">
                Participant 02
              </label>

              <input
                value={personBName}
                onChange={(e) => setPersonBName(e.target.value)}
                placeholder="Enter second participant's name"
                className="w-full rounded-xl border border-[#E6E1D7] bg-[#F7F5F0] p-3 text-sm text-[#17243A] outline-none focus:border-[#B99A62]"
              />
            </div>

            <button
              onClick={enterCourtroom}
              disabled={
                !caseTitle.trim() ||
                !personAName.trim() ||
                !personBName.trim()
              }
              className="w-full rounded-xl bg-[#17243A] px-4 py-3 font-semibold text-white transition hover:bg-[#263956] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enter the Courtroom
            </button>
          </section>
        </div>
      </main>
    );
  }

  // STAGE 2: Shared courtroom conversation
  return (
    <main className="min-h-screen bg-[#F7F5F0] px-5 py-8">
      <div className="mx-auto flex min-h-[85vh] max-w-3xl flex-col">
        {/* Courtroom header */}
        <header className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#B99A62]">
            Third1 AI · Case in Session
          </p>

          <h1 className="text-3xl font-bold text-[#17243A] sm:text-4xl">
            {caseTitle}
          </h1>

          <p className="mt-2 text-sm text-[#737C8C]">
            {personAName} and {personBName}
          </p>
        </header>

        {/* Conversation */}
        <section className="flex-1 rounded-2xl border border-[#E6E1D7] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-2 text-xl font-bold text-[#17243A]">
            The Conversation
          </h2>

          <p className="mb-6 text-sm text-[#737C8C]">
            Both participants can see every message in this case.
          </p>

          {messages.length === 0 ? (
            <div className="rounded-xl bg-[#F7F5F0] p-8 text-center">
              <p className="font-semibold text-[#17243A]">
                The court is waiting.
              </p>

              <p className="mt-2 text-sm text-[#737C8C]">
                Choose who wants to speak first.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
  {messages.map((message) => {
    const isPersonA = message.speaker === "person_a";
    const isAI = message.speaker === "third1_ai";

    return (
      <div
        key={message.id}
        className={`flex ${
          isAI
            ? "justify-center"
            : isPersonA
              ? "justify-start"
              : "justify-end"
        }`}
      >
        <div
          className={`max-w-[85%] rounded-2xl p-4 ${
            isAI
              ? "w-full border border-[#B99A62] bg-[#F5F0E5]"
              : isPersonA
                ? "bg-[#F0EBE1]"
                : "bg-[#E9EEF4]"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-5">
            <span className="text-sm font-bold text-[#17243A]">
              {isAI
                ? "Third1 AI · The Referee"
                : isPersonA
                  ? personAName
                  : personBName}
            </span>

            <span className="text-xs text-[#737C8C]">
              {message.createdAt}
            </span>
          </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#17243A]">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Participant speaking buttons and composer */}
        <section className="mt-6">

            {currentQuestion && clarificationStatus === "awaiting_answer" && (
  <div className="mb-5 rounded-2xl border border-[#B99A62] bg-[#F5F0E5] p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-[#B99A62]">
      The court requests clarification
    </p>

    <h3 className="mt-2 text-lg font-bold text-[#17243A]">
      Please hand the device to{" "}
      {currentQuestion.targetSpeaker === "person_a"
        ? personAName
        : personBName}
    </h3>

    <p className="mt-2 text-sm leading-6 text-[#17243A]">
      {currentQuestion.content}
    </p>

    <p className="mt-3 text-xs text-[#737C8C]">
      Only the participant named above should answer this question.
    </p>
  </div>
)}


{verdict && (
  <section className="mb-8 overflow-hidden rounded-2xl border border-[#B99A62] bg-white shadow-sm">
    {/* Verdict heading */}
    <div className="bg-[#17243A] px-6 py-7 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B99A62]">
        Third1 AI · Official ruling
      </p>

      <h2 className="mt-3 text-2xl font-bold text-white">
        The Verdict
      </h2>

      <p className="mt-3 text-sm leading-6 text-[#E6E1D7]">
        {verdict.category === "person_a_more_reasonable"
          ? `${personAName} is more reasonable`
          : verdict.category === "person_b_more_reasonable"
            ? `${personBName} is more reasonable`
            : verdict.category === "both_wrong"
              ? "Both have some things to reconsider"
              : verdict.category === "both_have_valid_points"
                ? "Both have valid points"
                : "Insufficient information"}
      </p>
    </div>

    <div className="space-y-7 p-6">
      {/* Summary */}
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
          The court's decision
        </h3>
        <p className="text-sm leading-7 text-[#17243A]">
          {verdict.summary}
        </p>
      </div>

      {/* Participant assessments */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
          Individual assessments
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F7F5F0] p-4">
            <p className="mb-2 font-bold text-[#17243A]">
              {personAName}
            </p>
            <p className="text-sm leading-6 text-[#4B5563]">
              {verdict.participantAssessments.person_a}
            </p>
          </div>

          <div className="rounded-xl bg-[#F7F5F0] p-4">
            <p className="mb-2 font-bold text-[#17243A]">
              {personBName}
            </p>
            <p className="text-sm leading-6 text-[#4B5563]">
              {verdict.participantAssessments.person_b}
            </p>
          </div>
        </div>
      </div>

      {/* Supporting points */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
          What the evidence supports
        </h3>
        {verdict.supportedPoints.length > 0 ? (
          <ul className="space-y-2">
            {verdict.supportedPoints.map((point, index) => (
              <li key={index} className="flex gap-3 text-sm leading-6 text-[#17243A]">
                <span className="font-bold text-[#B99A62]">✓</span>
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#737C8C]">No supporting points identified.</p>
        )}
      </div>

      {/* Disputed points */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
          What remains disputed
        </h3>
        {verdict.disputedPoints.length > 0 ? (
          <ul className="space-y-2">
            {verdict.disputedPoints.map((point, index) => (
              <li key={index} className="flex gap-3 text-sm leading-6 text-[#17243A]">
                <span className="font-bold text-[#B99A62]">•</span>
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#737C8C]">No disputed points identified.</p>
        )}
      </div>

      {/* Unknowns */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
          What the court doesn't know
        </h3>
        {verdict.unknowns.length > 0 ? (
          <ul className="space-y-2">
            {verdict.unknowns.map((point, index) => (
              <li key={index} className="flex gap-3 text-sm leading-6 text-[#17243A]">
                <span className="font-bold text-[#B99A62]">?</span>
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#737C8C]">No significant unknowns identified.</p>
        )}
      </div>

      {/* Reasoning */}
      <div className="rounded-xl border border-[#E6E1D7] p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
          The referee's reasoning
        </h3>
        <p className="text-sm leading-7 text-[#17243A]">
          {verdict.reasoning}
        </p>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
          Recommendations
        </h3>
        <ul className="space-y-2">
          {verdict.recommendations.map((item, index) => (
            <li key={index} className="flex gap-3 text-sm leading-6 text-[#17243A]">
              <span className="font-bold text-[#B99A62]">{index + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Closing remark */}
      <div className="border-t border-[#E6E1D7] pt-5 text-center">
        <p className="text-sm italic leading-6 text-[#737C8C]">
          "{verdict.closingRemark}"
          <button
            onClick={startNewCase}
            className="mt-6 w-full rounded-xl border border-[#B99A62] bg-[#17243A] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#263956]"
            >
  Start a New Case
</button>
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#B99A62]">
          Case reviewed by Third1 AI
        </p>
      </div>
    </div>
  </section>
)}


{!verdict &&
  messages.some(
    (message) =>
      message.speaker === "person_a" &&
      message.type === "testimony"
  ) &&
  messages.some(
    (message) =>
      message.speaker === "person_b" &&
      message.type === "testimony"
  ) &&
  clarificationStatus !== "awaiting_answer" && (
    <div className="mb-5">
      <button
        onClick={() => void analyzeCase()}
        disabled={clarificationStatus !== "idle"}
        className="w-full rounded-xl bg-[#17243A] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#263956] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {clarificationStatus === "analyzing"
        ? "The court is reviewing the case..."
        : clarificationStatus === "generating_verdict"
            ? "Preparing the verdict..."
            : "Generate Final Verdict"}
      </button>

      {analysisError && (
        <p role="alert" className="mt-3 text-center text-sm text-red-700">
          {analysisError}
        </p>
      )}
    </div>
)}

          {!verdict && (
  activeSpeaker === null ? (
            <div>
              <h2 className="mb-4 text-center text-sm font-semibold text-[#17243A]">
                Who wants to speak?
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  onClick={() => openComposer("person_a")}
                  className="rounded-2xl border border-[#B99A62] bg-white p-5 text-left transition hover:bg-[#F0EBE1]"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE7DA] font-bold text-[#17243A]">
                    {personAName.charAt(0).toUpperCase()}
                  </span>

                  <span className="block font-bold text-[#17243A]">
                    {personAName}
                  </span>

                  <span className="mt-1 block text-xs text-[#737C8C]">
                    Participant 01 · Speak
                  </span>
                </button>

                <button
                  onClick={() => openComposer("person_b")}
                  className="rounded-2xl border border-[#D5DEE9] bg-white p-5 text-left transition hover:bg-[#E9EEF4]"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#E6ECF3] font-bold text-[#17243A]">
                    {personBName.charAt(0).toUpperCase()}
                  </span>

                  <span className="block font-bold text-[#17243A]">
                    {personBName}
                  </span>

                  <span className="mt-1 block text-xs text-[#737C8C]">
                    Participant 02 · Speak
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E6E1D7] bg-white p-5 shadow-sm">
              {/* Composer header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#B99A62]">
                    Speaking as
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-[#17243A]">
                    {activeSpeaker === "person_a"
                      ? personAName
                      : personBName}
                  </h3>
                </div>

                <button
                  onClick={cancelComposer}
                  disabled={isTranscribing}
                  className="text-sm text-[#737C8C] hover:text-[#17243A] disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>

              {/* Text composer */}
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Tell your side of the story, ${
                  activeSpeaker === "person_a"
                    ? personAName
                    : personBName
                }...`}
                rows={4}
                maxLength={2000}
                disabled={isTranscribing}
                className="w-full resize-y rounded-xl border border-[#E6E1D7] bg-[#F7F5F0] p-4 text-sm text-[#17243A] outline-none focus:border-[#B99A62] disabled:opacity-60"
              />

              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[#737C8C]">
                  Be honest. Include the details that matter.
                </p>

                <p className="text-xs text-[#737C8C]">
                  {messageText.length}/2000
                </p>
              </div>

              {/* Voice recording controls */}
              <div className="mt-4 rounded-xl border border-[#E6E1D7] bg-[#F7F5F0] p-4">
                <p className="mb-3 text-sm font-semibold text-[#17243A]">
                  Prefer speaking?
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={isTranscribing}
                      className="rounded-xl border border-[#B99A62] bg-white px-4 py-2.5 text-sm font-semibold text-[#17243A] transition hover:bg-[#F0EBE1] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="mr-2">🎙</span>
                      Record voice
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
                    >
                      <span className="mr-2">■</span>
                      Stop recording
                    </button>
                  )}

                  {isRecording && (
                    <span className="text-sm font-medium text-red-700">
                      Recording in progress...
                    </span>
                  )}

                  {isTranscribing && (
                    <span className="text-sm font-medium text-[#737C8C]">
                      Transcribing your speech...
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-[#737C8C]">
                  Your speech is converted into editable text. The audio
                  is not added to the conversation as a recording.
                </p>

                {voiceError && (
                  <p
                    role="alert"
                    className="mt-3 text-sm text-red-700"
                  >
                    {voiceError}
                  </p>
                )}
              </div>

              {/* Submit message */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-[#737C8C]">
                  Your message will be visible to both participants.
                </span>

                {clarificationStatus === "awaiting_answer" &&
  currentQuestion?.targetSpeaker === activeSpeaker && (
    <button
      type="button"
      onClick={skipClarification}
      className="rounded-xl border border-[#B99A62] px-5 py-3 text-sm font-semibold text-[#17243A] transition hover:bg-[#F5F0E5]"
    >
      Skip Question
    </button>
  )}

                <button
                  onClick={submitMessage}
                  disabled={
                    !messageText.trim() ||
                    isRecording ||
                    isTranscribing
                  }
                  className="shrink-0 rounded-xl bg-[#17243A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263956] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send Message
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
