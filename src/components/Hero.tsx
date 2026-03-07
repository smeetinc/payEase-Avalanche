// components/Hero.tsx
export default function Hero() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-28 text-center">
      {/* Badge */}
      <div className="mb-6 rounded-full bg-blue-500/10 px-4 py-1 text-xs font-medium text-blue-400">
        Now Supporting X Blue & Replit Pro
      </div>

      {/* Headline */}
      <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl font-manrope">
        Pay For Subscriptions with USDC. No cards.
        <br />
        <span className="text-blue-400">No stress.</span>
      </h1>

      {/* Subtext */}
      <p className="mt-6 max-w-2xl text-base text-white/70 font-manrope">
        Access global tech subscriptions using USDC on Avalanche. We handle the
        payment, you enjoy the service.
      </p>

      {/* CTA */}
      <div className="mt-10">
        <a
          href="#"
          className="inline-flex items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-400 hover:bg-blue-500/20"
        >
          Get Started
        </a>
      </div>
    </section>
  );
}
