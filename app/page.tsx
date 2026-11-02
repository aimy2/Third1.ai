
const steps = [
  {
    number: "01",
    title: "File your case",
    description: "One person starts the case and invites the other side to testify.",
  },
  {
    number: "02",
    title: "Both sides speak",
    description: "Each person shares their story. No interruptions. No taking sides.",
  },
  {
    number: "03",
    title: "The court decides",
    description: "Third1 examines both accounts and delivers an honest verdict.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-12">
        <a href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17243A] text-xl text-[#D8BD87]">
            ⚖
          </span>
          <span className="text-xl font-bold tracking-tight">
            third1<span className="text-[#B99A62]">.</span>ai
          </span>
        </a>

        <div className="hidden items-center gap-8 text-sm text-[#737C8C] sm:flex">
          <a href="#how-it-works" className="transition hover:text-[#17243A]">
            How it works
          </a>
          <a href="#about" className="transition hover:text-[#17243A]">
            About the court
          </a>
        </div>

        <a
          href="/case"
          className="rounded-full border border-[#E6E1D7] px-5 py-2.5 text-sm font-semibold transition hover:border-[#B99A62] hover:bg-white"
        >
          Enter the court →
        </a>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-2 lg:px-12 lg:pb-32 lg:pt-24">
        <div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#E6E1D7] bg-white px-4 py-2 text-xs font-semibold tracking-wide text-[#737C8C]">
            <span className="h-2 w-2 rounded-full bg-[#B99A62]" />
            THE COURT OF EVERYDAY DISPUTES IS NOW OPEN
          </div>

          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.12] tracking-tight text-[#17243A] sm:text-6xl lg:text-7xl">
            Every story has two sides.
            <span className="mt-2 block text-[#B99A62]">
              Let’s hear both.
            </span>
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-8 text-[#737C8C]">
            Friend drama? Relationship disputes? Sibling arguments?
            Bring both sides to Third1 AI — your unbiased third One
            who isn't afraid to tell who is wrong.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="/case"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-[#17243A] px-8 py-4 font-semibold text-white shadow-lg shadow-[#17243A]/10 transition hover:-translate-y-1 hover:bg-[#263954]"
            >
              File a Case <span className="text-[#D8BD87]">→</span>
            </a>

            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-[#E6E1D7] bg-white px-8 py-4 font-semibold text-[#17243A] transition hover:border-[#B99A62]"
            >
              How it works
            </a>
          </div>

          <p className="mt-6 text-xs text-[#9299A5]">
            No lawyers. No fees. Just two sides and an honest perspective.
          </p>
        </div>

        {/* Fictional case preview */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#B99A62]/10 blur-3xl" />

          <div className="relative rotate-1 rounded-2xl border border-[#E6E1D7] bg-white p-7 shadow-2xl shadow-[#17243A]/10 sm:p-9">
            <div className="flex items-center justify-between border-b border-[#E6E1D7] pb-5">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-[#B99A62]">
                  THIRD1 AI COURT
                </p>
                <p className="mt-1 text-xs text-[#9299A5]">
                  CASE #000128
                </p>
              </div>
              <span className="rounded-full bg-[#F7F5F0] px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#737C8C]">
                UNDER REVIEW
              </span>
            </div>

            <h2 className="mt-7 text-2xl font-semibold tracking-tight text-[#17243A]">
              The People vs. The Group Chat
            </h2>

            <p className="mt-2 text-sm text-[#737C8C]">
              Allegation: Leaving someone on read for 6 hours.
            </p>

            <div className="mt-7 space-y-4">
              <div className="rounded-xl bg-[#F7F5F0] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17243A]">
                    PERSON A
                  </span>
                  <span className="text-[10px] text-[#9299A5]">
                    PLAINTIFF
                  </span>
                </div>
                <p className="text-sm leading-6 text-[#737C8C]">
                  “They saw my message. Six hours. Not even a thumbs-up.”
                </p>
              </div>

              <div className="rounded-xl border border-[#E6E1D7] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17243A]">
                    PERSON B
                  </span>
                  <span className="text-[10px] text-[#9299A5]">
                    DEFENDANT
                  </span>
                </div>
                <p className="text-sm leading-6 text-[#737C8C]">
                  “I was at work. Apparently, having a job is now suspicious.”
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-xl bg-[#17243A] p-5 text-center">
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#D8BD87]">
                THE COURT SAYS
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                “The jury requires more evidence.”
              </p>
              <p className="mt-2 text-xs text-white/50">
                Both testimonies are still being reviewed.
              </p>
            </div>

            <p className="mt-5 text-center text-[10px] tracking-wider text-[#9299A5]">
              A COMPLETELY FICTIONAL CASE
            </p>
          </div>

          <div className="absolute -bottom-6 -left-5 -rotate-3 rounded-xl border border-[#E6E1D7] bg-white px-5 py-3 shadow-lg">
            <p className="text-xs font-bold text-[#17243A]">
              ⚖️ Order in the court!
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-[#E6E1D7] bg-white px-6 py-24 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-xl">
            <p className="text-xs font-bold tracking-[0.2em] text-[#B99A62]">
              THE PROCEEDINGS
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#17243A] sm:text-5xl">
              Two testimonies. One verdict.
            </h2>
            <p className="mt-5 leading-7 text-[#737C8C]">
              No interruptions, no picking favourites. Both people get
              their chance to speak before the court makes its decision.
            </p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="border-t-2 border-[#E6E1D7] pt-6">
                <p className="text-sm font-bold text-[#B99A62]">
                  {step.number}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-[#17243A]">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-[#737C8C]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-6 py-20 text-center lg:px-12">
        <p className="text-xs font-bold tracking-[0.2em] text-[#B99A62]">
          ONE LAST THING
        </p>
        <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold text-[#17243A] sm:text-4xl">
          The court is neutral. Its sense of humour isn't.
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-[#737C8C]">
          Third1 AI is here for everyday disagreements, not legal disputes.
          Expect honest perspectives, a little wit, and the occasional
          objection.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E6E1D7] px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-[#9299A5] sm:flex-row">
          <p>
            © 2026 third1.ai — All rise. Or don't. We're not your lawyers.
          </p>
          <p>Two sides. One honest perspective. ⚖</p>
        </div>
      </footer>
    </main>
  );
}
