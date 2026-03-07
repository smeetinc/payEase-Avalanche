"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, X } from "lucide-react";
import {
  getSessionIdentity,
  persistSessionIdentity,
  type ServiceId,
} from "@/lib/payeaseAccountStore";
import { fetchApi } from "@/lib/apiClient";



function PaymentPageInner() {
  const search = useSearchParams();
  const serviceId = search.get("service") || "x-blue";
  const session = getSessionIdentity(search);
  const account = session.email || "@username";
  const router = useRouter();
  const [status, setStatus] = useState<"gathering_info" | "waiting" | "confirmed" | "failed">("gathering_info");
  const [intent, setIntent] = useState<any>(null);
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const actualServiceId = search.get("serviceId");

  useEffect(() => {
    if (session.email) {
      const token = typeof window !== "undefined" ? localStorage.getItem("payease_access_token") : null;
      if (token) {
        persistSessionIdentity(session.email, token);
      }
    }
  }, [session.email]);

  useEffect(() => {
    if (!actualServiceId) {
      setError("No service selected");
      return;
    }
    // Fetch service details for display
    fetchApi(`/services/${actualServiceId}`)
      .then(setServiceDetails)
      .catch((e) => setError("Failed to load service details"));
  }, [actualServiceId]);

  const handleCreateIntent = () => {
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Please enter a valid 0x wallet address (42 characters)");
      return;
    }
    setIsCreating(true);
    setError("");
    fetchApi("/subscriptions/intent", {
      method: "POST",
      body: JSON.stringify({ service_id: actualServiceId, wallet_address: walletAddress }),
    })
      .then((data) => {
        setIntent(data);
        setStatus("waiting");
      })
      .catch((e) => setError("Failed to create payment intent: " + e.message))
      .finally(() => setIsCreating(false));
  };

  // Separate effect for redirect — runs only when status becomes "confirmed"
  // so the timeout isn't cleared by the polling effect's cleanup.
  useEffect(() => {
    if (status !== "confirmed") return;
    const redirectTimer = setTimeout(() => {
      const query = new URLSearchParams({ service: serviceId });
      if (session.email) query.set("account", session.email);
      if (intent?.intent_id) query.set("intent_id", intent.intent_id);
      router.push(`/subscribe/payment/receipt?${query.toString()}`);
    }, 1200);
    return () => clearTimeout(redirectTimer);
  }, [status, router, serviceId, session.email, intent?.intent_id]);

  // Polling effect — watches for payment confirmation on-chain
  useEffect(() => {
    if (!intent || !intent.intent_id || status !== "waiting") return;

    // Backend uses "confirmed" (payment verified) and "fulfilled" (card issued).
    // Treat both as success — if card issuance fails the intent stays "confirmed"
    // and we still want to show the user their payment was received.
    if (intent.status === "confirmed" || intent.status === "fulfilled") {
      setStatus("confirmed");
      return;
    }

    if (intent.status === "expired") {
      setStatus("failed");
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        // POST /verify triggers an on-demand blockchain scan so the
        // payment is detected even without the background listener running.
        const data = await fetchApi(`/subscriptions/intent/${intent.intent_id}/verify`, {
          method: "POST",
        });
        console.log("Verify endpoint response:", data); // Debug log
        // Merge status fields — do NOT replace the full intent object.
        // exact_amount and treasury_wallet only exist in the POST creation
        // response (IntentResponse), not in the status response (IntentStatusOut).
        setIntent((prev: any) => ({ ...prev, ...data }));
      } catch (err) {
        console.error("Poll error", err);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [intent, status, router, serviceId, session.email]);

  const handleCopy = async () => {
    if (!intent?.treasury_wallet) return;
    try {
      await navigator.clipboard.writeText(intent.treasury_wallet);
      alert("Address copied");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f7f8fc] px-[22px] pt-8 pb-[60px] text-[#1f2440]">
      <header className="flex items-center justify-between py-[10px]">
        <Link
          className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
          href="/"
        >
          PayEase
        </Link>
        <Link
          className="inline-flex cursor-pointer bg-transparent p-1.5 text-[#1f2440]"
          href="/"
          aria-label="Close"
        >
          <X size={20} />
        </Link>
      </header>

      <div className="my-[22px] grid grid-cols-3 gap-[18px] border-b border-[#e3e6f0] py-3">
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#a0a6b8]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#e6e8f5] font-extrabold text-[#1f2c7a]">
            1
          </span>
          <p>Select Service</p>
        </div>
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#a0a6b8]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#e6e8f5] font-extrabold text-[#1f2c7a]">
            2
          </span>
          <p>Account Details</p>
        </div>
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#1f2c7a]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#1f2c7a] font-extrabold text-white">
            3
          </span>
          <p>Payment</p>
        </div>
      </div>

      <section className="mb-6">
        <h1 className="mb-1.5 text-[1.6rem] text-[#1f2440]">Pay with USDC</h1>
        <p className="font-medium text-[#6b7085]">
          Complete payment to activate your subscription.
        </p>
      </section>

      {error && <p className="mb-4 text-red-500 font-semibold">{error}</p>}
      {!serviceDetails ? (
        <p className="py-10 text-center text-[#6b7085]">Preparing your payment...</p>
      ) : status === "gathering_info" ? (
        <div className="rounded-xl border border-[#d7dce9] bg-white p-[18px] shadow-[0_10px_26px_rgba(16,30,115,0.06)]">
          <label className="mb-2 block font-semibold text-[#3a425c]">
            Enter the Avalanche C-Chain Wallet Address you will pay from:
          </label>
          <input
            className="w-full mb-4 rounded-xl border border-[#b8b8b8] bg-[#efefef] px-4 py-3 text-sm text-[#1f1f1f] focus:border-[#171374] focus:outline-none"
            placeholder="0x..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
          />
          <button
            onClick={handleCreateIntent}
            disabled={isCreating}
            className="w-full cursor-pointer rounded-xl bg-[#10096b] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1a1184] disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Generate Payment Details"}
          </button>
        </div>
      ) : !intent ? (
        <p className="py-10 text-center text-[#6b7085]">Creating intent...</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[#d7dce9] bg-white shadow-[0_10px_26px_rgba(16,30,115,0.06)]">
            <div className="grid grid-cols-[1fr_auto] border-b border-[#e6e9f2] px-4 py-[14px] font-semibold text-[#1f2440] max-[720px]:grid-cols-1 max-[720px]:gap-1">
              <span>Subscription</span>
              <span>{serviceDetails.name}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] border-b border-[#e6e9f2] px-4 py-[14px] font-semibold text-[#1f2440] max-[720px]:grid-cols-1 max-[720px]:gap-1">
              <span>Account</span>
              <span>{account}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] border-b border-[#e6e9f2] px-4 py-[14px] font-semibold text-[#1f2440] max-[720px]:grid-cols-1 max-[720px]:gap-1">
              <span>Amount</span>
              <span>${Number(serviceDetails.price_usd).toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-[1fr_auto] border-b border-[#e6e9f2] px-4 py-[14px] font-semibold text-[#1f2440] max-[720px]:grid-cols-1 max-[720px]:gap-1">
              <span>Service Fee</span>
              <span>$0.50</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] px-4 py-[14px] font-extrabold text-[#1f2440] max-[720px]:grid-cols-1 max-[720px]:gap-1">
              <span>Total payment</span>
              <span>{Number(intent.exact_amount).toFixed(6)} USDC</span>
            </div>
          </div>

          <div className="mt-[22px] rounded-xl border border-[#d7dce9] bg-white p-[18px] shadow-[0_10px_26px_rgba(16,30,115,0.06)]">
            <div className="flex items-center gap-2 font-bold text-[#4b5270]">
              <span className="h-3 w-3 rounded-[4px] bg-[#2533ff]" />
              <span className="font-semibold text-[#8b90a7]">Network</span>
              <span className="text-[#1f2440]">Avalanche Fuji (Testnet)</span>
            </div>
            <p className="mt-4 mb-2 font-bold text-[#3a425c]">
              Send USDC to this address
            </p>
            <div className="flex items-center justify-between gap-2.5 rounded-[10px] border border-[#d7dce9] bg-[#fafbff] px-4 py-[14px] font-mono text-[#1f2440] max-[720px]:flex-col max-[720px]:items-start break-all">
              <span>{intent.treasury_wallet}</span>
              <button
                onClick={handleCopy}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2533ff] px-2.5 py-2 font-bold text-white hover:bg-[#1723c4] max-[720px]:w-full max-[720px]:justify-center"
              >
                <Copy size={18} />
                Copy
              </button>
            </div>
          </div>

          <div
            className={`mt-[18px] inline-flex items-center gap-2 font-semibold ${status === "confirmed" ? "text-[#1a7f3c]" : "text-[#1f2440]"
              }`}
          >
            <span
              className={`inline-block h-[14px] w-[14px] animate-pulse rounded-full border-2 ${status === "confirmed" ? "border-[#1a7f3c]" : status === "failed" ? "border-[#f32013]" : "border-[#2533ff]"
                }`}
            />
            {status === "waiting"
              ? "Waiting for payment..."
              : status === "failed"
                ? "Payment failed."
                : "Payment confirmed, redirecting..."}
          </div>
        </>
      )}
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f7f8fc] px-[22px] pt-8 pb-[60px] text-[#1f2440]">
          <header className="flex items-center justify-between py-[10px]">
            <Link
              className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
              href="/"
            >
              PayEase
            </Link>
          </header>
          <p className="mt-10 text-sm text-[#6b7085]">
            Preparing payment details...
          </p>
        </main>
      }
    >
      <PaymentPageInner />
    </Suspense>
  );
}
