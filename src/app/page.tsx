import Link from "next/link";

const FEATURES = [
  {
    icon: "🔍",
    title: "Deep Spec Diffing",
    desc: "Detects removed endpoints, type changes, new required fields, parameter renames, and schema drift.",
  },
  {
    icon: "⚡",
    title: "Real-time Alerts",
    desc: "Slack, Discord, webhook, or email alerts within seconds of a breaking change.",
  },
  {
    icon: "📊",
    title: "Change History",
    desc: "Full audit trail of every change — who broke what, when, and how severe.",
  },
  {
    icon: "🔗",
    title: "GitHub Monitoring",
    desc: "Point at a repo's OpenAPI spec file. We watch for commits that break contracts.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["2 API monitors", "4 checks/day", "Email alerts", "7-day history"],
    cta: "Get Started",
    href: "/dashboard",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$9",
    period: "/mo",
    features: [
      "10 API monitors",
      "Hourly checks",
      "Slack + webhook alerts",
      "30-day history",
    ],
    cta: "Start Free Trial",
    href: "/dashboard?plan=starter",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    features: [
      "50 API monitors",
      "5-minute checks",
      "All alert channels",
      "Unlimited history",
      "GitHub repo monitoring",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/dashboard?plan=pro",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="text-lg font-bold tracking-tight">
              API Contract Guardian
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium hover:bg-orange-500 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-400">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-orange-500"></span>
            Monitoring 12,847 API contracts
          </div>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Catch Breaking API Changes{" "}
            <span className="text-orange-500">Before Your Users Do</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
            Monitor any OpenAPI or Swagger spec URL for breaking changes.
            Get instant Slack, webhook, and email alerts when upstream APIs
            remove endpoints, change types, or add required fields.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-orange-600 px-6 py-3 text-base font-semibold hover:bg-orange-500 transition"
            >
              Start Monitoring — Free
            </Link>
            <Link
              href="#how"
              className="rounded-lg border border-zinc-700 px-6 py-3 text-base font-medium text-zinc-300 hover:border-zinc-500 transition"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="text-3xl mb-4">1️⃣</div>
              <h3 className="font-semibold text-lg">Add a Spec URL</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Paste any OpenAPI/Swagger JSON URL or link a GitHub repo.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="text-3xl mb-4">2️⃣</div>
              <h3 className="font-semibold text-lg">We Diff Every Version</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Our engine fetches & compares specs on your schedule — hourly to every 5 minutes.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="text-3xl mb-4">3️⃣</div>
              <h3 className="font-semibold text-lg">Get Alerted Instantly</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Breaking change? Slack ping, webhook, email — you decide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold">What We Detect</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
          <p className="mt-3 text-zinc-400">
            Start free. Upgrade when you need more monitors.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 text-left ${
                  plan.highlight
                    ? "border-orange-500 bg-orange-500/5"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                {plan.highlight && (
                  <div className="mb-3 text-xs font-semibold text-orange-500 uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-zinc-300"
                    >
                      <span className="text-green-500">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-orange-600 hover:bg-orange-500"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-zinc-500">
          <p>
            API Contract Guardian — Built with Next.js, deployed on Vercel.
          </p>
        </div>
      </footer>
    </main>
  );
}
