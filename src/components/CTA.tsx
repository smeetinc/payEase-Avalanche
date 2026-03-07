export default function CallToAction() {
  return (
    <section className="bg-black px-6 py-32">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-gradient-to-r from-[#1E1BFF] to-[#2A2BFF] px-6 py-20 text-center text-white shadow-2xl">
          {/* Heading */}
          <h2 className="text-2xl font-semibold md:text-3xl">
            Ready to get started?
          </h2>

          {/* Subtext */}
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/80">
            Join users who are already paying subscriptions with USDC
          </p>

          {/* CTA Button */}
          <div className="mt-8">
            <button className="inline-flex items-center gap-2 rounded-lg bg-black/30 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black/40">
              Get Started
              <span className="text-base">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
