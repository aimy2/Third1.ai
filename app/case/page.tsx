
"use client";

import { useState } from "react";

type CaseMessage = {
  id: string;
  speaker: "person_a" | "person_b";
  content: string;
  createdAt: string;
};

export default function CasePage() {

const [messages, setMessages] = useState<CaseMessage[]>([]);
const [personATestimony, setPersonATestimony] = useState("");
const [personBTestimony, setPersonBTestimony] = useState("");

function submitTestimony(speaker: "person_a" | "person_b") {
  const content =
    speaker === "person_a"
      ? personATestimony.trim()
      : personBTestimony.trim();

  if (!content) return;

  const newMessage: CaseMessage = {
    id: Date.now().toString(),
    speaker,
    content,
    createdAt: new Date().toLocaleTimeString(),
  };

  setMessages((previousMessages) => [
    ...previousMessages,
    newMessage,
  ]);

  if (speaker === "person_a") {
    setPersonATestimony("");
  } else {
    setPersonBTestimony("");
  }}

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-5 py-12">
      <div className="mx-auto max-w-3xl">

        {/* Page heading */}
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#B99A62]">
            Third1 AI · The Courtroom
          </p>

          <h1 className="text-4xl font-bold text-[#17243A] sm:text-5xl">
            Let's hear both sides.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#737C8C]">
            Every disagreement has two perspectives.
            Give both participants the opportunity to tell
            their story before the court delivers its verdict.
          </p>
        </header>
        
{/* Participant testimony panels */}
<section className="grid grid-cols-1 gap-6 sm:grid-cols-2">

  {/* Person A */}
  <div className="rounded-2xl border border-[#E6E1D7] bg-white p-6 shadow-sm">
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#B99A62]">
      Participant 01
    </p>

    <h2 className="mb-4 text-xl font-bold text-[#17243A]">
      Person A
    </h2>

    <label
      htmlFor="person-a-testimony"
      className="mb-2 block text-sm font-medium text-[#17243A]"
    >
      Your side of the story
    </label>

    <textarea
      id="person-a-testimony"
      value={personATestimony}
      onChange={(e) => setPersonATestimony(e.target.value)}
      placeholder="Tell us what happened from your perspective..."
      rows={7}
      className="w-full resize-y rounded-xl border border-[#E6E1D7] bg-[#F7F5F0] p-3 text-sm text-[#17243A] outline-none transition focus:border-[#B99A62]"
      />

      <button
    onClick={() => submitTestimony("person_a")}
    className="mt-4 w-full rounded-xl bg-[#17243A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#263956]"
    >
    Submit Testimony
</button>
  </div>

  {/* Person B */}
  <div className="rounded-2xl border border-[#E6E1D7] bg-white p-6 shadow-sm">
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#B99A62]">
      Participant 02
    </p>

    <h2 className="mb-4 text-xl font-bold text-[#17243A]">
      Person B
    </h2>

    <label
      htmlFor="person-b-testimony"
      className="mb-2 block text-sm font-medium text-[#17243A]"
    >
      Your side of the story
    </label>

    <textarea
      id="person-b-testimony"
      value={personBTestimony}
      onChange={(e) => setPersonBTestimony(e.target.value)}
      placeholder="Tell us what happened from your perspective..."
      rows={7}
      className="w-full resize-y rounded-xl border border-[#E6E1D7] bg-[#F7F5F0] p-3 text-sm text-[#17243A] outline-none transition focus:border-[#B99A62]"
    />
    <button
    onClick={() => submitTestimony("person_b")}
    className="mt-4 w-full rounded-xl bg-[#17243A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#263956]"
        >
    Submit Testimony
    </button>
  </div>

</section>

{/* Shared case conversation */}
<section className="mt-10 rounded-2xl border border-[#E6E1D7] bg-white p-6 shadow-sm">
  <h2 className="mb-2 text-xl font-bold text-[#17243A]">
    Case Conversation
  </h2>

  <p className="mb-6 text-sm text-[#737C8C]">
    Both participants' submissions will appear here.
  </p>

  {messages.length === 0 ? (
    <p className="rounded-xl bg-[#F7F5F0] p-5 text-center text-sm text-[#737C8C]">
      The court is waiting for its first testimony.
    </p>
  ) : (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-xl bg-[#F7F5F0] p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B99A62]">
              {message.speaker === "person_a" ? "Person A" : "Person B"}
            </span>

            <span className="text-xs text-[#737C8C]">
              {message.createdAt}
            </span>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-6 text-[#17243A]">
            {message.content}
          </p>
        </div>
      ))}
    </div>
  )}
</section>


      </div>
    </main>
  );
}
