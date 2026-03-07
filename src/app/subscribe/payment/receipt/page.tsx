'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { getSessionIdentity, persistSessionIdentity } from '@/lib/payeaseAccountStore';
import { fetchApi } from '@/lib/apiClient';

interface IntentData {
  intent_id: string;
  status: string;
  service_name: string;
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  tx_hash: string | null;
}

interface ServiceData {
  id: string;
  name: string;
  slug: string;
  price_usd: string;
}

function ReceiptPageInner() {
  const search = useSearchParams();
  const serviceId = search.get('service') || 'x-blue';
  const intentId = search.get('intent_id');
  const session = getSessionIdentity(search);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<IntentData | null>(null);
  const [serviceDetails, setServiceDetails] = useState<ServiceData | null>(null);

  // Persist session but do NOT overwrite the JWT token — read it from localStorage first
  useEffect(() => {
    if (session.email) {
      const existingToken = typeof window !== 'undefined'
        ? localStorage.getItem('payease_access_token') || ''
        : '';
      persistSessionIdentity(session.email, existingToken);
    }
  }, [session.email]);

  // Fetch receipt data
  useEffect(() => {
    async function loadReceiptData() {
      try {
        let confirmedIntent: IntentData | null = null;

        if (intentId) {
          // Best case: we have the specific intent ID from the redirect
          const data: IntentData = await fetchApi(`/subscriptions/intent/${intentId}`);
          confirmedIntent = data;
        } else {
          // Fallback: find the most recent confirmed/fulfilled intent
          const intents: IntentData[] = await fetchApi('/subscriptions/intents');
          confirmedIntent = intents.find(
            (i) => i.status === 'confirmed' || i.status === 'fulfilled'
          ) || null;
        }

        if (confirmedIntent) {
          setIntent(confirmedIntent);
        } else {
          setError('No confirmed payment found.');
          setLoading(false);
          return;
        }

        // Fetch services to show price breakdown
        const services: ServiceData[] = await fetchApi('/services');
        const match = services.find((s) => s.name === confirmedIntent.service_name);
        setServiceDetails(match || null);
      } catch (e: any) {
        console.error('Receipt load error:', e);
        setError('Failed to load receipt data. Please check your login status and try again.');
      } finally {
        setLoading(false);
      }
    }
    loadReceiptData();
  }, [intentId]);

  const serviceFee = 0.5;
  const basePrice = serviceDetails ? Number(serviceDetails.price_usd) : 0;
  const total = basePrice + serviceFee;
  const serviceName = intent?.service_name || 'Subscription';
  const serviceSlug = serviceDetails?.slug || serviceId;

  const doneQuery = new URLSearchParams({ service: serviceSlug });
  if (session.email) doneQuery.set('account', session.email);

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f9ff] px-4 py-8">
      <div className="w-full max-w-[480px] rounded-[18px] border border-[#e4e7f3] bg-white px-[18px] pt-5 pb-6 shadow-[0_16px_40px_rgba(20,28,90,0.12)]">
        <header className="relative mb-1.5 flex items-center justify-center">
          <h1 className="text-[1.35rem] text-[#111428]">Receipt</h1>
          <Link className="absolute top-0 right-0 p-1.5 text-[#111428]" href="/" aria-label="Close">
            <X size={20} />
          </Link>
        </header>

        {loading ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-[3px] border-[#e6e8f5] border-t-[#1f2c7a]" />
            <p className="text-[#4a5066]">Loading receipt...</p>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="mb-3 font-semibold text-red-500">{error}</p>
            <button
              className="cursor-pointer rounded-[10px] bg-[#0f0f62] px-5 py-2.5 font-bold text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <p className="mb-[14px] text-center font-semibold text-[#4a5066]">Transaction successful</p>

            <div className="grid gap-2.5 rounded-xl border border-[#e4e7f3] bg-[#f5f6fb] px-4 py-[14px]">
              <div className="flex justify-between font-bold text-[#141829]">
                <span>Subscription</span>
                <span>{serviceName}</span>
              </div>
              <div className="flex justify-between font-bold text-[#141829]">
                <span>Amount</span>
                <span>${basePrice.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between font-bold text-[#141829]">
                <span>Fee</span>
                <span>${serviceFee.toFixed(2)} USD</span>
              </div>
              <div className="mt-1.5 flex justify-between font-bold text-[#141829]">
                <span>Total</span>
                <span>${total.toFixed(2)} USDC</span>
              </div>
              {intent?.tx_hash && (
                <div className="mt-1 flex justify-between text-sm text-[#4a5066]">
                  <span>Tx Hash</span>
                  <span className="max-w-[180px] truncate font-mono text-[0.8rem]">
                    {intent.tx_hash}
                  </span>
                </div>
              )}
            </div>

            <Link
              className="mt-[18px] block cursor-pointer rounded-[10px] bg-[#0f0f62] px-2.5 py-3 text-center font-bold text-white shadow-[0_10px_26px_rgba(15,15,98,0.3)] hover:bg-[#17177f]"
              href={
                serviceSlug === 'x-blue'
                  ? `/subscribe/payment/card?${doneQuery.toString()}`
                  : `/subscribe/replit/invite?${doneQuery.toString()}`
              }
            >
              Done
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f8f9ff] px-4 py-8">
          <div className="w-full max-w-[480px] rounded-[18px] border border-[#e4e7f3] bg-white px-[18px] pt-5 pb-6 shadow-[0_16px_40px_rgba(20,28,90,0.12)]">
            <header className="relative mb-1.5 flex items-center justify-center">
              <h1 className="text-[1.35rem] text-[#111428]">Receipt</h1>
            </header>
            <p className="text-center text-sm text-[#4a5066]">Preparing your receipt...</p>
          </div>
        </div>
      }
    >
      <ReceiptPageInner />
    </Suspense>
  );
}
