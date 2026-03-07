export default function Header() {
  return (
    <header className="mx-auto mt-6 max-w-6xl px-6">
      <div className="flex items-center justify-between rounded-xl border-[1.5] bg-transparent px-6 py-4">
        {/* Logo */}
        <div className="text-xl font-semibold tracking-tight font-itim">
          PayEase
        </div>

        {/* Nav */}
        <nav className="hidden items-center gap-8 text-sm text-white/80 md:flex font-manrope">
          <a href="#" className="hover:text-white">
            How It Works
          </a>
          <a href="#" className="hover:text-white">
            Services
          </a>
          <a
            href="#"
            className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20"
          >
            Get Started
          </a>
        </nav>
      </div>
    </header>
  );
}
