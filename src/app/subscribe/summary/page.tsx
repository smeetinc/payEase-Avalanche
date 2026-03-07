"use client";

import Link from "next/link";
import { CheckCircle, Plus, X } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSessionIdentity,
  persistSessionIdentity,
} from "@/lib/payeaseAccountStore";
import { fetchApi } from "@/lib/apiClient";

function SummaryPageInner() {
  const search = useSearchParams();
  const session = getSessionIdentity(search);

  useEffect(() => {
    if (session.email) {
      persistSessionIdentity(session.email, typeof window !== 'undefined' ? localStorage.getItem('payease_access_token') || "" : "");
    }
  }, [session.email]);

  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/cards/dashboard/history")
      .then(setHistoryData)
      .catch((e) => console.error("Failed to load history", e))
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    const activeSubscriptions = historyData
      .filter((h) => h.status === "completed")
      .map((h) => ({
        id: h.intent_id,
        slug: h.service_name.toLowerCase().includes("replit") ? "replit-pro" : "x-blue",
        name: h.service_name,
        account: session.email || "User",
        price: `$${Number(h.amount_usdc).toFixed(2)}`,
        status: "Active",
        started: new Date(h.created_at).toLocaleDateString(),
        renewal: "Manual",
        method: "USDC",
        cardId: h.card_id,
      }));

    const history = historyData.map((h) => ({
      id: h.intent_id,
      title: h.service_name,
      date: new Date(h.created_at).toLocaleDateString(),
      amount: `${Number(h.amount_usdc).toFixed(2)} USDC`,
      status: h.status.toUpperCase(),
      cardId: h.card_id,
    }));

    return { subscriptions: activeSubscriptions, history };
  }, [historyData, session.email]);

  const addMoreQuery = new URLSearchParams();
  if (session.email) addMoreQuery.set("account", session.email);
  const addMoreHref = `/subscribe${addMoreQuery.toString() ? `?${addMoreQuery.toString()}` : ""
    }`;

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f8f9fc] px-[18px] pt-7 pb-[60px] text-[#171b34]">
      <header className="flex items-center justify-between pt-2 pb-[18px]">
        <Link
          className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
          href="/"
        >
          PayEase
        </Link>
        <Link className="p-1.5 text-[#171b34]" href="/" aria-label="Close">
          <X size={20} />
        </Link>
      </header>

      <div className="inline-flex items-center gap-2 rounded-[10px] border border-[#c8efcf] bg-[#e8f8eb] px-[14px] py-[10px] font-bold text-[#2f8f44]">
        <CheckCircle size={20} />
        {data.subscriptions.length
          ? "Subscription Activated!"
          : "Account Ready!"}
      </div>

      <h2 className="mt-5 mb-2.5 text-[1.1rem]">Your Subscriptions</h2>
      {session.email ? (
        <p className="mb-3 text-sm font-semibold text-[#556080]">
          Signed in as <span className="text-[#1f2c7a]">{session.email}</span>
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 font-semibold text-[#4a5066]">Loading...</p>
      ) : data.subscriptions.length ? (
        <div className="flex flex-col gap-4">
          {data.subscriptions.map((sub: any) => (
            <section
              className="rounded-[14px] border border-[#e2e6f0] bg-white p-4 shadow-[0_14px_30px_rgba(17,24,69,0.08)]"
              key={sub.id}
            >
              <div className="flex items-center justify-between gap-[14px] max-[720px]:flex-col max-[720px]:items-start">
                <div className="flex items-center gap-3">
                  <div className="grid h-[52px] w-[52px] place-items-center rounded-xl bg-[#0f1d60] text-[1.4rem] font-extrabold text-white">
                    {sub.slug === "x-blue" ? "✕" : sub.slug === "replit-pro" ? "▢" : "★"}
                  </div>
                  <div>
                    <h3 className="text-[1.05rem]">{sub.name}</h3>
                    <p className="mt-0.5 text-[#4a5066]">
                      Account: {sub.account}
                    </p>
                    <span className="mt-1.5 inline-flex rounded-md bg-[#daf5df] px-2 py-1 text-[0.85rem] font-bold text-[#2f8f44]">
                      {sub.status}
                    </span>
                  </div>
                </div>
                <div className="font-extrabold text-[#171b34]">{sub.price}</div>
              </div>

              <div className="my-[14px] h-px bg-[#e6e8f2]" />

              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                <div>
                  <label className="mb-1 block text-[0.9rem] text-[#5d6378]">
                    Started
                  </label>
                  <span className="font-bold text-[#1b2140]">
                    {sub.started}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-[0.9rem] text-[#5d6378]">
                    Next Renewal
                  </label>
                  <span className="font-bold text-[#1b2140]">
                    {sub.renewal}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-[0.9rem] text-[#5d6378]">
                    Payment Method
                  </label>
                  <span className="font-bold text-[#1b2140]">{sub.method}</span>
                </div>
              </div>

               <div className="mt-4 flex gap-2.5 max-[720px]:flex-col">
                 <button className="flex-1 cursor-pointer rounded-[10px] bg-[#0f0f62] p-3 font-bold text-white">
                   Manage Subscription
                 </button>
                 <button className="flex-1 cursor-pointer rounded-[10px] bg-[#f3f3f8] p-3 font-bold text-[#1b2140]">
                   View Details
                 </button>
                 {sub.cardId && (
                   <Link 
                     href={`/subscribe/payment/card?service=${sub.slug}&card_id=${sub.cardId}&account=${session.email}`}
                     className="flex-1 cursor-pointer rounded-[10px] bg-[#e8f2ff] p-3 font-bold text-[#0f0f62] text-center"
                   >
                     View Card Details
                   </Link>
                 )}
               </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="rounded-[14px] border border-[#e2e6f0] bg-white p-4 shadow-[0_14px_30px_rgba(17,24,69,0.08)]">
          <p className="font-semibold text-[#4a5066]">
            No active subscriptions yet.
          </p>
        </section>
      )}

      <section className="my-6 rounded-xl border border-dashed border-[#d0d6e7] bg-[#fafbff] p-[22px] text-center text-[#2b314d]">
        <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-full border border-[#c6ccde]">
          <Plus size={20} />
        </div>
        <h4>Add Another Subscription</h4>
        <p>Pay for more services with USDC</p>
        <Link
          className="mt-3 inline-block cursor-pointer rounded-[10px] bg-[#0f0f62] px-5 py-2.5 font-bold text-white hover:bg-[#17177f]"
          href={addMoreHref}
        >
          Browse Services
        </Link>
      </section>

      <section className="mt-2.5">
        <h3 className="mb-2.5">Payment History</h3>
        {loading ? (
          <div className="mt-2.5 text-[#606680]">Loading...</div>
        ) : data.history.length ? (
          <div className="flex flex-col gap-2.5">
             {data.history.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-[10px] border border-[#e2e6f0] bg-white px-[14px] py-3 shadow-[0_6px_20px_rgba(17,24,69,0.05)] max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-1.5"
              >
                <div>
                  <div className="font-bold">{item.title}</div>
                  <div className="mt-1 text-[#606680]">{item.date}</div>
                </div>
                <div className="text-right font-bold text-[#1b2140]">
                  <span>{item.amount}</span>
                  <span
                    className={`mt-0.5 block ${item.status === "COMPLETED"
                      ? "text-[#2f8f44]"
                      : item.status === "FAILED"
                        ? "text-[#f32013]"
                        : "text-[#2533ff]"
                      }`}
                  >
                    {item.status}
                  </span>
                  {item.cardId && (
                    <Link 
                      href={`/subscribe/payment/card?service=${item.title.toLowerCase().includes("replit") ? "replit-pro" : "x-blue"}&card_id=${item.cardId}&account=${session.email}`}
                      className="mt-1 inline-block text-sm text-[#0f0f62] hover:underline"
                    >
                      View Card
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[10px] border border-[#e2e6f0] bg-white px-[14px] py-3 text-[#606680] shadow-[0_6px_20px_rgba(17,24,69,0.05)]">
            No payments yet.
          </div>
        )}
      </section>
    </main>
  );
}

export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f8f9fc] px-[18px] pt-7 pb-[60px] text-[#171b34]">
          <header className="flex items-center justify-between pt-2 pb-[18px]">
            <Link
              className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]"
              href="/"
            >
              PayEase
            </Link>
          </header>
          <p className="mt-10 text-sm text-[#556080]">
            Loading your subscriptions...
          </p>
        </main>
      }
    >
      <SummaryPageInner />
    </Suspense>
  );
}
