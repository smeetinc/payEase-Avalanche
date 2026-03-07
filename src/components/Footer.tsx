import { FaArrowUpLong } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="relative bg-[#0A142F] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="text-xl font-semibold font-itim">PayEase</div>

          {/* Navigation */}
          <div className="text-sm text-white/70">
            <ul className="space-y-2">
              <li>
                <a href="#how-it-works" className="hover:text-white">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#subscriptions" className="hover:text-white">
                  Subscriptions
                </a>
              </li>
              <li>
                <a href="#partners" className="hover:text-white">
                  Partners
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Socials */}
          <div className="text-sm text-white/70 md:text-right">
            <ul className="space-y-2">
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  className="hover:text-white"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  className="hover:text-white"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} PayEase. All rights reserved.
        </div>
      </div>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600"
        aria-label="Scroll to top"
      >
        <FaArrowUpLong />
      </button>
    </footer>
  );
}
