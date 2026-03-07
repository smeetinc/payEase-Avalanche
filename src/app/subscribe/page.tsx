"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSessionIdentity,
  persistSessionIdentity,
} from "@/lib/payeaseAccountStore";
import { fetchApi } from "@/lib/apiClient";



function SubscribePageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const preselect = search.get("service");
  const [fetchedServices, setFetchedServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    fetchApi("/services")
      .then((data) => {
        setFetchedServices(data);
      })
      .catch((err) => console.error("Failed to fetch services:", err))
      .finally(() => setLoadingServices(false));
  }, []);

  const mergedServices = useMemo(() => {
    return fetchedServices.map((s) => ({
      id: s.id, // backend UUID
      slug: s.slug,
      name: s.name,
      price: Number(s.price_usd),
      priceLabel: `$${s.price_usd}/month`,
      fee: 0.5,
      copy: s.description || "Premium subscription",
      perks:
        s.slug === "x-blue"
          ? ["Blue checkmark verification", "Faster performance", "Longer posts", "Priority support"]
          : s.slug === "replit-pro"
            ? ["Unlimited private repls", "Faster performance", "Always-on projects", "Priority support"]
            : ["Premium features", "Priority support"],
      logo: s.slug === "x-blue" ? "✕" : s.slug === "replit-pro" ? "▢" : "★",
    }));
  }, [fetchedServices]);

  const validPreselect =
    preselect && mergedServices.find((s) => s.slug === preselect)
      ? mergedServices.find((s) => s.slug === preselect)?.id
      : null;

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (validPreselect && !selected) {
      setSelected(validPreselect);
    }
  }, [validPreselect, selected]);

  const activeService = useMemo(
    () => mergedServices.find((s) => s.id === selected),
    [selected, mergedServices]
  );
  const total = activeService ? activeService.price + activeService.fee : 0;

  const session = getSessionIdentity();

  const handleContinue = () => {
    if (!selected || !activeService) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("payease_access_token") : null;
    if (session.email && token) {
      persistSessionIdentity(session.email, token);
    }
    const query = new URLSearchParams({ service: activeService.slug, serviceId: selected });
    if (session.email) query.set("account", session.email);
    const path =
      activeService.slug === "replit-pro"
        ? "/subscribe/replit/details"
        : "/subscribe/payment";
    router.push(`${path}?${query.toString()}`);
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
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#1f2c7a]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#1f2c7a] font-extrabold text-white">
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
        <div className="grid justify-items-center gap-1.5 text-[0.95rem] font-bold text-[#a0a6b8]">
          <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#e6e8f5] font-extrabold text-[#1f2c7a]">
            3
          </span>
          <p>Payment</p>
        </div>
      </div>

      <section className="mb-6">
        <h1 className="mb-2 text-[1.7rem] text-[#1f2440]">
          Choose Your Subscription
        </h1>
        <p className="font-medium text-[#6b7085]">
          Select the service you want to activate with USDC
        </p>
        {session.email ? (
          <p className="mt-2 text-sm font-semibold text-[#4f5a86]">
            Signed in as <span className="text-[#1f2c7a]">{session.email}</span>
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-4">
        {loadingServices ? (
          <p className="py-4 text-center text-[#6b7085]">Loading services...</p>
        ) : mergedServices.length === 0 ? (
          <p className="py-4 text-center text-[#6b7085]">No services available.</p>
        ) : (
          mergedServices.map((service) => (
            <article
              className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-[14px] rounded-[14px] border p-[18px] shadow-[0_10px_26px_rgba(16,30,115,0.06)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[#b9c4ea] max-[900px]:grid-cols-1 max-[900px]:items-start ${selected === service.id
                ? "border-[#1f2c7a] bg-[linear-gradient(0deg,rgba(31,44,122,0.05),rgba(31,44,122,0.05)),#ffffff] shadow-[0_12px_28px_rgba(31,44,122,0.16)]"
                : "border-[#d7dce9] bg-white"
                }`}
              key={service.id}
              onClick={() => setSelected(service.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelected(service.id)}
            >
              <div className="grid h-[52px] w-[52px] place-items-center rounded-xl bg-[#0f1d60] text-[1.4rem] font-extrabold text-white">
                {service.logo}
              </div>
              <div>
                <h3 className="mb-1.5 text-[1.1rem]">{service.name}</h3>
                <p className="mb-2.5 text-[#6b7085]">{service.copy}</p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-[10px] gap-y-1.5 font-semibold text-[#3a425c]">
                  {service.perks.map((perk: string) => (
                    <span className="inline-flex items-center gap-1.5" key={perk}>
                      <Check size={18} />
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right font-bold text-[#1f2440] max-[900px]:text-left">
                <strong className="block text-[1.3rem]">${service.price}</strong>
                <span className="text-[#6b7085]">/ month</span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-[26px] rounded-xl border border-[#e2e2f4] bg-[#f5f4ff] p-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <h4 className="mb-3 text-base text-[#1f2440]">Payment Summary</h4>
        <div className="flex items-center justify-between py-1.5 font-semibold text-[#3a425c]">
          <span>Subscription</span>
          <span>{activeService ? `$${activeService.price} USD` : "--"}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 font-semibold text-[#3a425c]">
          <span>Service Fee</span>
          <span>{activeService ? `$${activeService.fee} USD` : "--"}</span>
        </div>
        <div className="mt-1 flex items-center justify-between py-1.5 font-extrabold text-[#11163a]">
          <span>Total (USDC)</span>
          <span>{activeService ? `${total} USDC` : "--"}</span>
        </div>
      </div>

      <button
        className="mt-7 w-full rounded-[10px] bg-[#c9cddc] px-3.5 py-[14px] font-bold text-white transition-[background,transform,box-shadow] duration-150 disabled:cursor-not-allowed enabled:cursor-pointer enabled:bg-[#1f2c7a] enabled:shadow-[0_10px_24px_rgba(31,44,122,0.25)] enabled:hover:-translate-y-px"
        disabled={!selected}
        onClick={handleContinue}
      >
        Continue
      </button>
    </main>
  );
}

export default function SubscribePage() {
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
            Loading subscription options...
          </p>
        </main>
      }
    >
      <SubscribePageInner />
    </Suspense>
  );
}
