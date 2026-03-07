"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, ArrowUp, X } from "lucide-react";
import {
  getSessionIdentity,
  persistSessionIdentity,
} from "@/lib/payeaseAccountStore";
import { fetchApi } from "@/lib/apiClient";

const services = [
  {
    id: "x-blue",
    name: "X Blue",
    copy: "Get verified with the blue checkmark and unlock premium features on X (formerly Twitter).",
    price: "$8/month",
    logo: "/twitter.png",
    logoAlt: "X (Twitter) logo",
  },
  {
    id: "replit-pro",
    name: "Replit Pro",
    copy: "Access powerful cloud development tools for teams and individuals.",
    price: "$10/month",
    logo: "/replit.png",
    logoAlt: "Replit logo",
  },
];

const steps = [
  {
    id: 1,
    title: "Choose Service",
    copy: "Select the subscription you want to activate",
  },
  {
    id: 2,
    title: "Enter Details",
    copy: "Provide your account email or username",
  },
  {
    id: 3,
    title: "Pay with USDC",
    copy: "Send USDC on Avalanche to our secure address",
  },
  {
    id: 4,
    title: "Get Activated",
    copy: "We activate your subscription instantly",
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" as const },
  viewport: { once: true, amount: 0.35 },
};

export default function Home() {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState(
    () => getSessionIdentity().email,
  );

  useEffect(() => {
    document.body.style.overflow = isAuthOpen ? "hidden" : "";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAuthOpen(false);
      }
    };

    if (isAuthOpen) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAuthOpen]);

  const openAuthModal = (serviceId?: string) => {
    setIsAuthOpen(true);
    setError("");
    setSelectedService(serviceId ?? null);
  };

  const closeAuthModal = () => {
    setIsAuthOpen(false);
    setError("");
  };

  const handleAuth = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!valid) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let token = "";
      try {
        const loginRes = await fetchApi("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        token = loginRes.access_token;
      } catch (e: any) {
        if (
          e.message.includes("Invalid credentials") ||
          e.message.includes("API Error")
        ) {
          // try to register
          await fetchApi("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email: normalizedEmail, password }),
          });
          const loginRes = await fetchApi("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: normalizedEmail, password }),
          });
          token = loginRes.access_token;
        } else {
          throw e;
        }
      }

      persistSessionIdentity(normalizedEmail, token);
      setSessionEmail(normalizedEmail);

      const query = new URLSearchParams({
        account: normalizedEmail,
      });
      if (selectedService) query.set("service", selectedService);
      router.push(`/subscribe?${query.toString()}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    if (sessionEmail) {
      const query = new URLSearchParams();
      query.set("account", sessionEmail);
      router.push(`/subscribe?${query.toString()}`);
      return;
    }
    openAuthModal();
  };

  const handleServiceSelect = (serviceId: string) => {
    if (sessionEmail) {
      const query = new URLSearchParams({ service: serviceId });
      query.set("account", sessionEmail);
      router.push(`/subscribe?${query.toString()}`);
      return;
    }
    openAuthModal(serviceId);
  };

  return (
    <main className="bg-[#03040a] text-[#eef2ff]" id="top">
      <section className="relative hero overflow-hidden px-4 pb-20 pt-5 max-[700px]:pb-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.14'/%3E%3C/svg%3E\")",
          }}
        />

        <motion.header
          className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between rounded-xl border border-white/35 bg-transparent px-4 py-3 backdrop-blur-[2px] md:px-6 max-[820px]:flex-col max-[820px]:gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="font-itim text-[32px] font-normal leading-none text-white sm:text-[40px]">
            PayEase
          </div>
          <nav className="flex items-center gap-4 text-sm sm:gap-6 sm:text-base font-manrope">
            <a
              className="text-[#d7deff] transition-colors hover:text-white"
              href="#how"
            >
              How It Works
            </a>
            <a
              className="text-[#d7deff] transition-colors hover:text-white"
              href="#services"
            >
              Services
            </a>
            {sessionEmail ? (
              <button
                className="max-w-[220px] cursor-pointer truncate rounded-md bg-[#060a44] px-3 py-1.5 text-left text-sm text-[#ecf1ff] transition-colors hover:bg-[#0c145f] sm:text-base"
                onClick={handleGetStarted}
                type="button"
              >
                {sessionEmail}
              </button>
            ) : (
              <button
                className="cursor-pointer rounded-md bg-[#060a44] px-3 py-1.5 text-sm text-[#ecf1ff] transition-colors hover:bg-[#0c145f] sm:text-base"
                onClick={handleGetStarted}
                type="button"
              >
                Get Started
              </button>
            )}
          </nav>
        </motion.header>

        <motion.section
          className="relative z-10 mx-auto mt-16 w-full max-w-5xl text-center max-[700px]:mt-11"
          {...fadeInUp}
        >
          <span className="inline-flex rounded-full bg-[#1f44c5] px-4 py-1.5 text-xs font-semibold text-[#dbe5ff] sm:text-sm">
            Now Supporting X Blue &amp; Replit Pro
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl text-4xl leading-tight font-semibold text-[#eef4ff] sm:text-5xl lg:text-6xl">
            Pay For Subscriptions
            <br />
            with USDC. No cards.
            <br />
            <span className="text-[#2da3ff]">No stress.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-[#d7dfff] sm:text-lg lg:text-2xl">
            Access global tech subscriptions using USDC on Avalanche. We handle
            the payment, you enjoy the service.
          </p>
          <button
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#3754c8] bg-[#111a6d] px-5 py-2.5 text-sm font-medium text-[#eef3ff] transition-colors hover:bg-[#172380] sm:text-base"
            onClick={handleGetStarted}
            type="button"
          >
            Get Started
          </button>
        </motion.section>
      </section>

      <section
        className="bg-[#050864] px-4 py-14 max-[700px]:py-10"
        id="services"
      >
        <motion.div className="mx-auto w-full max-w-6xl" {...fadeInUp}>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#f3f6ff] sm:text-3xl">
              Supported Services
            </h2>
            <p className="mt-3 text-base text-[#e0e7ff] sm:text-lg lg:text-2xl">
              Pay with USDC for these premium subscriptions
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {services.map((service, index) => (
              <motion.article
                className="group rounded-2xl border border-[#7b89c7] bg-[#040a67] p-5 shadow-[0_4px_0_0_rgba(255,255,255,0.2)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.75)] sm:p-6"
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#a1b0f0] bg-[#0c1a7a]">
                  <Image
                    src={service.logo}
                    alt={service.logoAlt}
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <h3 className="text-2xl font-semibold text-[#f1f5ff] sm:text-3xl">
                  {service.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#ced8ff] sm:text-base lg:text-lg">
                  {service.copy}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xl font-semibold text-[#f7f9ff] sm:text-2xl">
                    {service.price}
                  </span>
                  <button
                    className="cursor-pointer rounded-lg bg-[#121b93] px-4 py-1.5 text-sm font-medium text-[#eff3ff] transition-colors hover:bg-[#1823a8] sm:px-5 sm:text-base"
                    onClick={() => handleServiceSelect(service.id)}
                    type="button"
                  >
                    Select
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="bg-[#05075a] px-4 py-14 max-[700px]:py-10" id="how">
        <motion.div className="mx-auto w-full max-w-7xl" {...fadeInUp}>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#f2f6ff] sm:text-3xl">
              How PayEase Work
            </h2>
            <p className="mt-3 text-base text-[#dce5ff] sm:text-lg lg:text-2xl">
              Simple, secure, and straightforward
            </p>
          </div>

          <div className="mt-8 rounded-3xl bg-[#080f7a] p-4 sm:p-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div
                  className="rounded-2xl bg-[#0d3f66] px-4 py-6 text-center"
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.07 }}
                  viewport={{ once: true, amount: 0.4 }}
                >
                  <span className="mx-auto mb-3 inline-grid h-8 w-8 place-items-center rounded-full bg-[#1322d0] text-sm font-semibold text-white">
                    {step.id}
                  </span>
                  <h4 className="text-xl font-semibold text-[#ebf3ff] sm:text-2xl">
                    {step.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#d2defd] sm:text-base">
                    {step.copy}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="bg-[#040404] px-4 py-16 max-[700px]:py-10" id="cta">
        <motion.div
          className="mx-auto w-full max-w-6xl rounded-xl bg-[#2519dd] px-4 py-10 text-center sm:px-6 sm:py-14"
          {...fadeInUp}
        >
          <h3 className="text-2xl font-semibold text-white sm:text-3xl">
            Ready to get started?
          </h3>
          <p className="mx-auto mt-4 max-w-4xl text-base text-[#dbe2ff] sm:text-lg lg:text-2xl">
            Join users who are already paying subscriptions with USDC
          </p>
          <button
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#13105f] px-5 py-2.5 text-sm font-medium text-[#f1f5ff] transition-colors hover:bg-[#1a1772] sm:text-base"
            onClick={handleGetStarted}
            type="button"
          >
            Get Started <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      <footer className="bg-[#04154a] px-4 py-12">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 text-[#dbe5ff] sm:grid-cols-2 xl:grid-cols-4 xl:items-center">
          <div className="font-itim text-[32px] font-normal text-white sm:text-[40px]">
            PayEase
          </div>
          <div className="flex flex-col gap-2 text-sm text-[#b7c4f1] sm:text-base">
            <a className="transition-colors hover:text-white" href="#how">
              How It Works
            </a>
            <a className="transition-colors hover:text-white" href="#services">
              Subscriptions
            </a>
            <a className="transition-colors hover:text-white" href="#cta">
              Partners
            </a>
            <a className="transition-colors hover:text-white" href="#cta">
              Contact
            </a>
          </div>
          <div className="flex flex-col gap-2 text-sm text-[#b7c4f1] sm:text-base">
            <a
              className="transition-colors hover:text-white"
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
            >
              Twitter
            </a>
            <a
              className="transition-colors hover:text-white"
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
            >
              Linkedin
            </a>
          </div>
          <a
            className="grid h-14 w-14 place-items-center self-start rounded-full bg-[#0b88ff] text-white shadow-[0_8px_20px_rgba(11,136,255,0.45)] transition-transform hover:-translate-y-0.5 xl:ml-auto xl:self-center"
            href="#top"
            aria-label="Back to top"
          >
            <ArrowUp size={20} />
          </a>
        </div>
      </footer>

      <AnimatePresence>
        {isAuthOpen ? (
          <motion.div
            className="fixed inset-0 z-30 grid place-items-center bg-black/55 px-4"
            onClick={closeAuthModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl bg-[#efefef] p-5 text-[#161616] sm:p-7"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="w-full text-center">
                  <h2 className="text-3xl leading-tight font-bold sm:text-4xl">
                    Continue to PayEase
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#2d2d2d] sm:text-base">
                    Enter your email to manage subscriptions and payment
                    history.
                  </p>
                </div>
                <button
                  aria-label="Close"
                  className="-mt-1 -mr-1 cursor-pointer rounded-full p-1 text-black"
                  onClick={closeAuthModal}
                  type="button"
                >
                  <X size={26} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label
                    className="mb-2 block text-base font-semibold sm:text-lg"
                    htmlFor="auth-email"
                  >
                    Enter Your Email
                  </label>
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-[#b8b8b8] bg-[#efefef] px-4 py-3 text-sm text-[#1f1f1f] placeholder:text-[#b0b0b0] focus:border-[#171374] focus:outline-none sm:text-base"
                    id="auth-email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="favy@gmail.com"
                    type="email"
                    value={email}
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-base font-semibold sm:text-lg"
                    htmlFor="auth-password"
                  >
                    Password
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#b8b8b8] bg-[#efefef] px-4 py-3 text-sm text-[#1f1f1f] placeholder:text-[#b0b0b0] focus:border-[#171374] focus:outline-none sm:text-base"
                    id="auth-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    type="password"
                    value={password}
                  />
                </div>
                {error ? (
                  <p className="mt-2 text-sm font-semibold text-[#d11f1f]">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  className="w-full cursor-pointer rounded-xl bg-[#10096b] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1a1184] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleAuth}
                  disabled={loading}
                  type="button"
                >
                  {loading ? "Signing in..." : "Sign In / Register"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
