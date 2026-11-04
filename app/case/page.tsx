
"use client";

import { useEffect, useRef, useState } from "react";

type Speaker = "person_a" | "person_b" | "third1_ai";
type ParticipantSpeaker = "person_a" | "person_b";

type MessageType =
  | "testimony"
  | "clarification_question"
  | "clarification_answer"
  | "clarification_skipped";

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

type ClarificationStatus =
  | "idle"
  | "analyzing"
  | "asking_question"
  | "awaiting_answer"
  | "generating_verdict"
  | "verdict_complete";

type BackendMessage = {
  id: string;
  speaker: "participant_01" | "participant_02" | "ai" | "system";
  content: string;
  message_type:
    | "testimony"
    | "clarification_question"
    | "clarification_answer"
    | "system_event";
  clarification_id?: string | null;
  timestamp: string;
};

type BackendClarification = {
  id: string;
  question: string;
  target_speaker: "participant_01" | "participant_02";
  reason: string;
  status: "pending" | "answered" | "skipped";
  answer_message_id?: string | null;
};

type BackendAssessment = {
  participant: "participant_01" | "participant_02";
  strongest_valid_points: string[];
  weaknesses: string[];
  overall_assessment: string;
};

type BackendVerdict = {
  category: VerdictCategory;
  more_reasonable_participant?: "participant_01" | "participant_02" | null;
  summary: string;
  participant_assessments: BackendAssessment[];
  supported_points: string[];
  disputed_points: string[];
  unknowns: string[];
  reasoning: string;
  recommendations: string[];
  closing_remark: string;
};

type BackendCaseState = {
  case_id: string;
  title: string;
  participant_01: {
    id: "participant_01";
    name: string;
  };
  participant_02: {
    id: "participant_02";
    name: string;
  };
  messages: BackendMessage[];
  clarifications: BackendClarification[];
  pending_clarifications: BackendClarification[];
  investigator_output: unknown;
  clarification_count: number;
  verdict: BackendVerdict | null;
  status:
    | "awaiting_testimony"
    | "awaiting_other_participant"
    | "clarification_required"
    | "verdict_ready";
};

type FrontendCaseState = {
  messages: CaseMessage[];
  verdict: CaseVerdict | null;
  clarificationCount: number;
  currentQuestion: {
    id: string;
    content: string;
    targetSpeaker: ParticipantSpeaker;
  } | null;
  status: ClarificationStatus;
  personAFinished: boolean;
  personBFinished: boolean;
};

function toFrontendParticipant(
  participant: "participant_01" | "participant_02"
): ParticipantSpeaker {
  return participant === "participant_01" ? "person_a" : "person_b";
}

function toBackendParticipant(
  participant: ParticipantSpeaker
): "participant_01" | "participant_02" {
  return participant === "person_a" ? "participant_01" : "participant_02";
}

function mapBackendVerdict(
  backendVerdict: BackendVerdict | null
): CaseVerdict | null {
  if (!backendVerdict) return null;

  const assessments = backendVerdict.participant_assessments ?? [];

  const personA = assessments.find(
    (item) => item.participant === "participant_01"
  );

  const personB = assessments.find(
    (item) => item.participant === "participant_02"
  );

  return {
    category: backendVerdict.category,
    summary: backendVerdict.summary,
    participantAssessments: {
      person_a: personA?.overall_assessment ?? "No assessment provided.",
      person_b: personB?.overall_assessment ?? "No assessment provided.",
    },
    supportedPoints: backendVerdict.supported_points ?? [],
    disputedPoints: backendVerdict.disputed_points ?? [],
    unknowns: backendVerdict.unknowns ?? [],
    reasoning: backendVerdict.reasoning,
    recommendations: backendVerdict.recommendations ?? [],
    closingRemark: backendVerdict.closing_remark,
  };
}

function mapBackendState(
  backend: BackendCaseState
): FrontendCaseState {
  const clarificationById = new Map(
    backend.clarifications.map((item) => [item.id, item])
  );

  const mappedMessages: CaseMessage[] = backend.messages.map((message) => {
    const relatedClarification = message.clarification_id
      ? clarificationById.get(message.clarification_id)
      : undefined;

    let speaker: Speaker = "third1_ai";

    if (message.speaker === "participant_01") {
      speaker = "person_a";
    } else if (message.speaker === "participant_02") {
      speaker = "person_b";
    }

    let type: MessageType = "testimony";

    if (message.message_type === "clarification_question") {
      type = "clarification_question";
    } else if (message.message_type === "clarification_answer") {
      type = "clarification_answer";
    } else if (message.message_type === "system_event") {
      type = "clarification_skipped";
    }

    return {
      id: message.id,
      speaker,
      content: message.content,
      type,
      createdAt: new Date(message.timestamp).toLocaleTimeString(),
      targetSpeaker: relatedClarification
        ? toFrontendParticipant(relatedClarification.target_speaker)
        : undefined,
    };
  });

  const pending = backend.pending_clarifications?.[0] ?? null;

  let status: ClarificationStatus = "idle";

  if (backend.status === "clarification_required") {
    status = "awaiting_answer";
  } else if (backend.status === "verdict_ready") {
    status = "verdict_complete";
  }

  const personAFinished = backend.messages.some(
    (message) =>
      message.speaker === "participant_01" &&
      message.message_type === "testimony"
  );

  const personBFinished = backend.messages.some(
    (message) =>
      message.speaker === "participant_02" &&
      message.message_type === "testimony"
  );

  return {
    messages: mappedMessages,
    verdict: mapBackendVerdict(backend.verdict),
    clarificationCount: backend.clarification_count,
    currentQuestion: pending
      ? {
          id: pending.id,
          content: pending.question,
          targetSpeaker: toFrontendParticipant(pending.target_speaker),
        }
      : null,
    status,
    personAFinished,
    personBFinished,
  };
}

export default function CasePage() {
  // Courtroom stages
  const [isCourtroomOpen, setIsCourtroomOpen] = useState(false);

  // Case and participant details
  const [caseTitle, setCaseTitle] = useState("");
  const [personAName, setPersonAName] = useState("");
  const [personBName, setPersonBName] = useState("");

  // Backend case identity
  const [caseId, setCaseId] = useState<string | null>(null);

  // Backend request state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  // Conversation
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [activeSpeaker, setActiveSpeaker] =
    useState<ParticipantSpeaker | null>(null);
  const [messageText, setMessageText] = useState("");

  // Backend-derived case state
  const [clarificationStatus, setClarificationStatus] =
    useState<ClarificationStatus>("idle");

  const [verdict, setVerdict] = useState<CaseVerdict | null>(null);

  const [clarificationCount, setClarificationCount] = useState(0);

  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string;
    content: string;
    targetSpeaker: ParticipantSpeaker;
  } | null>(null);

  const [hasPersonAFinished, setHasPersonAFinished] = useState(false);
  const [hasPersonBFinished, setHasPersonBFinished] = useState(false);

  // Voice transcription
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  // Apply the complete backend state to the frontend.
  function applyBackendState(backend: BackendCaseState) {
    const mapped = mapBackendState(backend);

    setCaseId(backend.case_id);
    setCaseTitle(backend.title);
    setPersonAName(backend.participant_01.name);
    setPersonBName(backend.participant_02.name);

    setMessages(mapped.messages);
    setVerdict(mapped.verdict);
    setClarificationCount(mapped.clarificationCount);
    setCurrentQuestion(mapped.currentQuestion);
    setClarificationStatus(mapped.status);

    setHasPersonAFinished(mapped.personAFinished);
    setHasPersonBFinished(mapped.personBFinished);
  }

  // Call the Next.js backend proxy.
  async function backendRequest<T>(
    path: string,
    method: "GET" | "POST" = "GET",
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`/api/backend/${path}`, {
      method,
      headers: body
        ? { "Content-Type": "application/json" }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        result?.detail ||
        result?.error ||
        `Backend request failed (${response.status}).`;

      throw new Error(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail)
      );
    }

    return result as T;
  }

  // Refresh a case using the backend's current state.
  async function refreshCase(id: string) {
    const backend = await backendRequest<BackendCaseState>(
      `cases/${id}`
    );

    applyBackendState(backend);

    return backend;
  }

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

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
        const actualMimeType =
          recorder.mimeType ||
          audioChunksRef.current[0]?.type ||
          mimeType ||
          "audio/webm";

        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });

        releaseMicrophone();
        setIsRecording(false);

        if (audioBlob.size === 0) {
          setVoiceError(
            "No audio was captured. Please try recording again."
          );
          return;
        }

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

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Transcription failed.");
          }

          if (
            typeof result.text !== "string" ||
            !result.text.trim()
          ) {
            throw new Error(
              "No speech was recognized. Please try again."
            );
          }

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

  // Create the case on the backend before entering the courtroom.
  async function enterCourtroom() {
    if (
      !caseTitle.trim() ||
      !personAName.trim() ||
      !personBName.trim() ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    setAnalysisError("");

    try {
      const backend = await backendRequest<BackendCaseState>(
        "cases",
        "POST",
        {
          title: caseTitle.trim(),
          participant_01_name: personAName.trim(),
          participant_02_name: personBName.trim(),
        }
      );

      applyBackendState(backend);
      setIsCourtroomOpen(true);
    } catch (error) {
      console.error("Case creation error:", error);

      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Could not create the case."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewCase() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    audioChunksRef.current = [];

    setCaseId(null);

    setCaseTitle("");
    setPersonAName("");
    setPersonBName("");

    setMessages([]);
    setActiveSpeaker(null);
    setMessageText("");

    setIsRecording(false);
    setIsTranscribing(false);
    setVoiceError("");

    setClarificationStatus("idle");
    setVerdict(null);
    setAnalysisError("");
    setClarificationCount(0);
    setCurrentQuestion(null);

    setHasPersonAFinished(false);
    setHasPersonBFinished(false);

    setIsSubmitting(false);
    setIsCourtroomOpen(false);
  }

  // A participant can only open the composer when the backend workflow allows it.
  function canParticipantSpeak(speaker: ParticipantSpeaker): boolean {
    if (verdict || isSubmitting || !caseId) return false;

    if (currentQuestion) {
      return currentQuestion.targetSpeaker === speaker;
    }

    if (clarificationStatus === "awaiting_answer") {
      return false;
    }

    if (speaker === "person_a") {
      return !hasPersonAFinished;
    }

    return !hasPersonBFinished;
  }

  function openComposer(speaker: ParticipantSpeaker) {
    if (!canParticipantSpeak(speaker)) return;

    setActiveSpeaker(speaker);
    setMessageText("");
    setVoiceError("");
    setAnalysisError("");
  }

  function cancelComposer() {
    if (isRecording) {
      stopRecording();
    }

    setMessageText("");
    setVoiceError("");
    setActiveSpeaker(null);
  }

  // Submit either an opening testimony or a targeted clarification answer.
  async function submitMessage() {
    if (
      !caseId ||
      !activeSpeaker ||
      !messageText.trim() ||
      isRecording ||
      isTranscribing ||
      isSubmitting ||
      verdict
    ) {
      return;
    }

    const participant = toBackendParticipant(activeSpeaker);
    const content = messageText.trim();

    const isClarificationAnswer =
      clarificationStatus === "awaiting_answer" &&
      currentQuestion?.targetSpeaker === activeSpeaker;

    if (isClarificationAnswer && !currentQuestion) {
      setAnalysisError("There is no pending clarification to answer.");
      return;
    }

    if (!isClarificationAnswer && !canParticipantSpeak(activeSpeaker)) {
      setAnalysisError(
        "This participant cannot submit another opening testimony."
      );
      return;
    }

    setIsSubmitting(true);
    setAnalysisError("");

    try {
      let backend: BackendCaseState;

      if (isClarificationAnswer && currentQuestion) {
        backend = await backendRequest<BackendCaseState>(
          `cases/${caseId}/answer`,
          "POST",
          {
            clarification_id: currentQuestion.id,
            participant,
            answer: content,
          }
        );
      } else {
        backend = await backendRequest<BackendCaseState>(
          `cases/${caseId}/testimony`,
          "POST",
          {
            participant,
            content,
          }
        );
      }

      applyBackendState(backend);

      setMessageText("");
      setVoiceError("");
      setActiveSpeaker(null);
    } catch (error) {
      console.error("Message submission error:", error);

      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Could not submit your message."
      );

      // The backend remains authoritative. Refresh in case the
      // request completed but the response was interrupted.
      try {
        await refreshCase(caseId);
      } catch (refreshError) {
        console.error("Case refresh error:", refreshError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Skip the current clarification through the backend.
  async function skipClarification() {
    if (
      !caseId ||
      !currentQuestion ||
      !activeSpeaker ||
      currentQuestion.targetSpeaker !== activeSpeaker ||
      isSubmitting ||
      verdict
    ) {
      return;
    }

    setIsSubmitting(true);
    setAnalysisError("");

    try {
      const backend = await backendRequest<BackendCaseState>(
        `cases/${caseId}/skip`,
        "POST",
        {
          clarification_id: currentQuestion.id,
          participant: toBackendParticipant(activeSpeaker),
        }
      );

      applyBackendState(backend);

      setMessageText("");
      setVoiceError("");
      setActiveSpeaker(null);
    } catch (error) {
      console.error("Clarification skip error:", error);

      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Could not skip this clarification."
      );

      try {
        await refreshCase(caseId);
      } catch (refreshError) {
        console.error("Case refresh error:", refreshError);
      }
    } finally {
      setIsSubmitting(false);
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

            {analysisError && (
              <p role="alert" className="text-sm text-red-700">
                {analysisError}
              </p>
            )}

            <button
              onClick={() => void enterCourtroom()}
              disabled={
                !caseTitle.trim() ||
                !personAName.trim() ||
                !personBName.trim() ||
                isSubmitting
              }
              className="w-full rounded-xl bg-[#17243A] px-4 py-3 font-semibold text-white transition hover:bg-[#263956] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? "Creating Case..." : "Enter the Courtroom"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  const bothOpeningsSubmitted =
    hasPersonAFinished && hasPersonBFinished;

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

          {caseId && (
            <p className="mt-2 text-xs text-[#A0A6AF]">
              Case ID: {caseId}
            </p>
          )}
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
                Choose who wants to submit their opening testimony first.
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
                Only the participant named above should answer or skip this
                question.
              </p>
            </div>
          )}

          {analysisError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {analysisError}
            </div>
          )}

          {verdict && (
            <section className="mb-8 overflow-hidden rounded-2xl border border-[#B99A62] bg-white shadow-sm">
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
                <div>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
                    The court's decision
                  </h3>

                  <p className="text-sm leading-7 text-[#17243A]">
                    {verdict.summary}
                  </p>
                </div>

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

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
                    What the evidence supports
                  </h3>

                  {verdict.supportedPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {verdict.supportedPoints.map((point, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-sm leading-6 text-[#17243A]"
                        >
                          <span className="font-bold text-[#B99A62]">✓</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#737C8C]">
                      No supporting points identified.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
                    What remains disputed
                  </h3>

                  {verdict.disputedPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {verdict.disputedPoints.map((point, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-sm leading-6 text-[#17243A]"
                        >
                          <span className="font-bold text-[#B99A62]">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#737C8C]">
                      No disputed points identified.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
                    What the court doesn't know
                  </h3>

                  {verdict.unknowns.length > 0 ? (
                    <ul className="space-y-2">
                      {verdict.unknowns.map((point, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-sm leading-6 text-[#17243A]"
                        >
                          <span className="font-bold text-[#B99A62]">?</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#737C8C]">
                      No significant unknowns identified.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[#E6E1D7] p-4">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
                    The referee's reasoning
                  </h3>

                  <p className="text-sm leading-7 text-[#17243A]">
                    {verdict.reasoning}
                  </p>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#B99A62]">
                    Recommendations
                  </h3>

                  <ul className="space-y-2">
                    {verdict.recommendations.map((item, index) => (
                      <li
                        key={index}
                        className="flex gap-3 text-sm leading-6 text-[#17243A]"
                      >
                        <span className="font-bold text-[#B99A62]">
                          {index + 1}.
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-[#E6E1D7] pt-5 text-center">
                  <p className="text-sm italic leading-6 text-[#737C8C]">
                    "{verdict.closingRemark}"
                  </p>

                  <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#B99A62]">
                    Case reviewed by Third1 AI
                  </p>

                  <button
                    onClick={startNewCase}
                    className="mt-6 w-full rounded-xl border border-[#B99A62] bg-[#17243A] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#263956]"
                  >
                    Start a New Case
                  </button>
                </div>
              </div>
            </section>
          )}

          {!verdict && (
            activeSpeaker === null ? (
              <div>
                <h2 className="mb-4 text-center text-sm font-semibold text-[#17243A]">
                  {currentQuestion
                    ? "Who is being asked to respond?"
                    : bothOpeningsSubmitted
                      ? "Opening testimonies are closed."
                      : "Who wants to speak?"}
                </h2>

                {bothOpeningsSubmitted && !currentQuestion && (
                  <p className="mb-4 text-center text-sm text-[#737C8C]">
                    The court is reviewing the case. No further opening
                    testimony can be submitted.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <button
                    onClick={() => openComposer("person_a")}
                    disabled={!canParticipantSpeak("person_a")}
                    className="rounded-2xl border border-[#B99A62] bg-white p-5 text-left transition hover:bg-[#F0EBE1] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE7DA] font-bold text-[#17243A]">
                      {personAName.charAt(0).toUpperCase()}
                    </span>

                    <span className="block font-bold text-[#17243A]">
                      {personAName}
                    </span>

                    <span className="mt-1 block text-xs text-[#737C8C]">
                      {currentQuestion?.targetSpeaker === "person_a"
                        ? "Participant 01 · Your response is requested"
                        : hasPersonAFinished
                          ? "Opening testimony submitted"
                          : "Participant 01 · Speak"}
                    </span>
                  </button>

                  <button
                    onClick={() => openComposer("person_b")}
                    disabled={!canParticipantSpeak("person_b")}
                    className="rounded-2xl border border-[#D5DEE9] bg-white p-5 text-left transition hover:bg-[#E9EEF4] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#E6ECF3] font-bold text-[#17243A]">
                      {personBName.charAt(0).toUpperCase()}
                    </span>

                    <span className="block font-bold text-[#17243A]">
                      {personBName}
                    </span>

                    <span className="mt-1 block text-xs text-[#737C8C]">
                      {currentQuestion?.targetSpeaker === "person_b"
                        ? "Participant 02 · Your response is requested"
                        : hasPersonBFinished
                          ? "Opening testimony submitted"
                          : "Participant 02 · Speak"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E6E1D7] bg-white p-5 shadow-sm">
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
                    disabled={isTranscribing || isSubmitting}
                    className="text-sm text-[#737C8C] hover:text-[#17243A] disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>

                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    clarificationStatus === "awaiting_answer"
                      ? "Answer the court's clarification question..."
                      : `Tell your side of the story, ${
                          activeSpeaker === "person_a"
                            ? personAName
                            : personBName
                        }...`
                  }
                  rows={4}
                  maxLength={2000}
                  disabled={isTranscribing || isSubmitting}
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
                        onClick={() => void startRecording()}
                        disabled={isTranscribing || isSubmitting}
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
                    <p role="alert" className="mt-3 text-sm text-red-700">
                      {voiceError}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-[#737C8C]">
                    Your message will be visible to both participants.
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    {clarificationStatus === "awaiting_answer" &&
                      currentQuestion?.targetSpeaker === activeSpeaker && (
                        <button
                          type="button"
                          onClick={() => void skipClarification()}
                          disabled={isSubmitting || isTranscribing || isRecording}
                          className="rounded-xl border border-[#B99A62] px-5 py-3 text-sm font-semibold text-[#17243A] transition hover:bg-[#F5F0E5] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Skip Question
                        </button>
                      )}

                    <button
                      onClick={() => void submitMessage()}
                      disabled={
                        !messageText.trim() ||
                        isRecording ||
                        isTranscribing ||
                        isSubmitting
                      }
                      className="shrink-0 rounded-xl bg-[#17243A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263956] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : clarificationStatus === "awaiting_answer"
                          ? "Submit Answer"
                          : "Submit Testimony"}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {isSubmitting && (
            <p className="mt-4 text-center text-sm text-[#737C8C]">
              The court is processing the submission...
            </p>
          )}

          {clarificationCount > 0 && (
            <p className="mt-4 text-center text-xs text-[#737C8C]">
              Clarifications answered: {clarificationCount}/3
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
