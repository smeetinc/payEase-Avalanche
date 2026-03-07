"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { Suspense, useState } from "react";
import {
  getSessionIdentity,
  persistSessionIdentity,
} from "@/lib/payeaseAccountStore";

function ReplitDetailsPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const serviceId = search.get("service") || "replit-pro";
  const session = getSessionIdentity(search);
  const [account, setAccount] = useState(session.email);
  const [touched, setTouched] = useState(false);

  const isValid = account.trim().length > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('payease_access_token') || '' : '';
    persistSessionIdentity(account, token);
    const query = new URLSearchParams({ service: serviceId, account });
    router.push(`/subscribe/payment?${query.toString()}`);
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f8f9fc] px-[18px] pt-8 pb-[60px] text-[#171b34]">
      <header className="flex items-center justify-between pt-2 pb-[18px]">
        <Link
          className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
          href="/"
        >
          PayEase
        </Link>
        <Link
          className="inline-flex cursor-pointer p-1.5 text-[#171b34]"
          href="/"
          aria-label="Close"
        >
          <X size={20} />
        </Link>
      </header>

      <div className="mt-[6px] mb-7 grid grid-cols-3 gap-[18px] border-b border-[#e3e6f0] py-3">
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#a0a6b8]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#e6e8f5] font-extrabold text-[#1f2c7a]">
            1
          </span>
          <p>Select Service</p>
        </div>
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#1f2c7a]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#1f2c7a] font-extrabold text-white">
            2
          </span>
          <p>Account Details</p>
        </div>
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#a0a6b8]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#e6e8f5] font-extrabold text-[#1f2c7a]">
            3
          </span>
          <p>Payment</p>
        </div>
      </div>

      <section className="mt-2.5 mb-6">
        <h1 className="mb-1.5 text-[1.6rem] text-[#171b34]">Account Details</h1>
        <p className="font-medium text-[#4f556e]">
          We&apos;ll activate the subscription on this account
        </p>
      </section>

      <label
        className="mb-1.5 block font-bold text-[#5a6076]"
        htmlFor="account"
      >
        Email/Username
      </label>
      <input
        id="account"
        className={`w-full rounded-[10px] border bg-white px-4 py-[14px] text-base text-[#171b34] ${touched && !isValid ? "border-[#d9534f]" : "border-[#d6dbe8]"
          } focus:border-[#1f2c7a] focus:outline-2 focus:outline-[#1f2c7a]`}
        placeholder="you@....com"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        onBlur={() => setTouched(true)}
      />

      <button
        className="mt-[22px] w-full cursor-pointer rounded-[10px] bg-[#0f0f62] px-3 py-[14px] font-bold text-white shadow-[0_10px_26px_rgba(15,15,98,0.3)] disabled:cursor-not-allowed disabled:opacity-55"
        onClick={handleSubmit}
        disabled={!isValid}
      >
        Continue payment
      </button>

      <div className="mt-[14px] flex items-center gap-2 font-semibold text-[#9b9fb0]">
        <AlertTriangle size={16} />
        We only use this to activate your subscription.
      </div>
    </main>
  );
}

export default function ReplitDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f8f9fc] px-[18px] pt-8 pb-[60px] text-[#171b34]">
          <header className="flex items-center justify-between pt-2 pb-[18px]">
            <Link
              className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
              href="/"
            >
              PayEase
            </Link>
          </header>
          <p className="mt-10 text-sm text-[#4f556e]">
            Loading account details...
          </p>
        </main>
      }
    >
      <ReplitDetailsPageInner />
    </Suspense>
  );
}
