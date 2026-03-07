"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import {
  getSessionIdentity,
  persistSessionIdentity,
} from "@/lib/payeaseAccountStore";

const services = [
  { id: "replit-pro", name: "Replit Pro", price: "$10/month" },
  { id: "x-blue", name: "X Blue", price: "$8/month" },
];

function ReplitInvitePageInner() {
  const search = useSearchParams();
  const router = useRouter();
  const session = getSessionIdentity(search);
  const account = session.email || "you@...com";
  const serviceId = search.get("service") || "replit-pro";

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? services[0],
    [serviceId]
  );

  const handleDone = () => {
    if (session.email) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('payease_access_token') || '' : '';
      persistSessionIdentity(session.email, token);
    }
    const query = new URLSearchParams();
    if (session.email) query.set("account", session.email);
    router.push(
      `/subscribe/summary${query.toString() ? `?${query.toString()}` : ""}`
    );
  };

  return (
    <main className="mx-auto min-h-screen max-w-[900px] bg-[#f8f9fc] px-[18px] pt-8 pb-[60px] text-[#171b34]">
      <header className="flex items-center justify-between pt-2 pb-[18px]">
        <Link
          className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
          href="/"
        >
          PayEase
        </Link>
        <Link
          className="inline-flex cursor-pointer p-1.5 text-[#171b34] no-underline"
          href="/"
          aria-label="Close"
        >
          ×
        </Link>
      </header>

      <section className="mt-2.5 mb-[22px] text-center">
        <h1 className="mb-1.5 text-[1.6rem]">
          You&apos;ve been invited to {service.name}
        </h1>
        <p className="font-semibold text-[#4f556e]">
          Your subscription is ready to activate
        </p>
      </section>

      <section className="rounded-[14px] border border-[#d8dce8] bg-white p-[18px] shadow-[0_12px_30px_rgba(17,24,69,0.08)] max-[720px]:p-4">
        <div>
          <h3 className="text-[1.05rem]">Team invite sent</h3>
          <p className="mt-1 text-[#4f556e]">
            We&apos;ve sent a {service.name} team invite to activate plan
          </p>
        </div>

        <input
          className="my-[14px] w-full rounded-[10px] border border-[#d6dbe8] bg-[#f7f8fc] px-4 py-[14px] text-[#171b34]"
          value={account}
          readOnly
        />
        <p className="mb-[14px] font-semibold text-[#8d92a8]">
          Accept the invite to activate {service.name} on your account
        </p>

        <div className="rounded-[10px] border border-[#e2e6f0] bg-[#f6f7fb] p-[14px]">
          <h4 className="mb-2 text-base">Next Steps</h4>
          <ul className="list-disc pl-[18px] leading-[1.6] text-[#2b314d]">
            <li>Check your email inbox for the Replit team invitation</li>
            <li>Click &quot;Accept Invite&quot; in the email</li>
            <li>Your Replit Pro features will be activated immediately</li>
          </ul>
        </div>
      </section>

      <button
        className="mt-[18px] w-full cursor-pointer rounded-[10px] bg-[#0f0f62] px-3 py-[14px] font-bold text-white shadow-[0_10px_26px_rgba(15,15,98,0.3)]"
        onClick={handleDone}
      >
        Done
      </button>

      <p className="mt-3 text-center font-bold text-[#4f556e]">
        Didn&apos;t receive the invite?{" "}
        <a className="text-[#0f0f62]" href="mailto:support@payease.app">
          Contact Support
        </a>
      </p>
    </main>
  );
}

export default function ReplitInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-[900px] bg-[#f8f9fc] px-[18px] pt-8 pb-[60px] text-[#171b34]">
          <header className="flex items-center justify-between pt-2 pb-[18px]">
            <Link
              className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
              href="/"
            >
              PayEase
            </Link>
          </header>
          <p className="mt-10 text-sm text-[#4f556e]">
            Preparing your invite...
          </p>
        </main>
      }
    >
      <ReplitInvitePageInner />
    </Suspense>
  );
}
