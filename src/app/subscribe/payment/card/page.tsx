'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlarmClock, AlertTriangle, Lock, X } from 'lucide-react';
import { getSessionIdentity, persistSessionIdentity } from '@/lib/payeaseAccountStore';
import { fetchApi } from '@/lib/apiClient';

interface CardData {
  id: string;
  last4: string;
  expiry_month: string;
  expiry_year: string;
  status: string;
  created_at: string;
  service_name?: string;
  card_number?: string | null;
  cvv?: string | null;
}

const CARD_EXPIRY_SECONDS = 20 * 60; // 20 minutes for user to complete checkout

function formatCardNumber(num: string): string {
  // Format as groups of 4: "1234567890123456" → "1234 5678 9012 3456"
  return num.replace(/(.{4})/g, '$1 ').trim();
}

function CardPageInner() {
  const search = useSearchParams();
  const router = useRouter();
  const serviceId = search.get('service') || 'x-blue';
  const cardId = search.get('card_id');
  const session = getSessionIdentity(search);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [card, setCard] = useState<CardData | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CARD_EXPIRY_SECONDS);

  // Persist session — read existing JWT from localStorage, do NOT overwrite with authMethod
  useEffect(() => {
    if (session.email) {
      const existingToken = typeof window !== 'undefined'
        ? localStorage.getItem('payease_access_token') || ''
        : '';
      persistSessionIdentity(session.email, existingToken);
    }
  }, [session.email]);

  // Fetch the card and reveal its sensitive data
  useEffect(() => {
    async function loadCard() {
      try {
        let targetCard: CardData | null = null;
        
        if (cardId) {
          // If card ID is provided, fetch that specific card
          console.log('Fetching specific card:', cardId);
          const cards: CardData[] = await fetchApi('/cards');
          targetCard = cards.find(card => card.id === cardId) || null;
          
          if (!targetCard) {
            setError('Card not found');
            setLoading(false);
            return;
          }
        } else {
          // If no card ID, use the latest card
          console.log('Fetching latest card from /cards endpoint');
          const cards: CardData[] = await fetchApi('/cards');
          console.log('Cards fetched:', cards);
          if (!cards.length) {
            setError('No virtual card found. Your card may still be generating — please wait a moment and refresh.');
            setLoading(false);
            return;
          }
          targetCard = cards[0];
        }

        // Reveal sensitive data (one-time operation)
        try {
          const sensitiveData: CardData = await fetchApi(`/cards/${targetCard.id}/reveal`);
          setCard(sensitiveData);
          setRevealed(true);
        } catch (revealErr: any) {
          // If reveal fails (already revealed), still show masked card info
          setCard(targetCard);
          setError('Card details were already revealed and can no longer be shown. Please check your records.');
        }
      } catch (e: any) {
        setError('Failed to load card data: ' + e.message);
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [cardId]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const minutes = Math.max(0, Math.floor(secondsLeft / 60));
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const expired = secondsLeft <= 0;

  const handleContinue = () => {
    if (!session.email) {
      router.push('/subscribe/summary');
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('payease_access_token') || '' : '';
    persistSessionIdentity(session.email, token);
    const query = new URLSearchParams({ account: session.email });
    router.push(`/subscribe/summary?${query.toString()}`);
  };

  // Display values
  const displayCardNumber = card?.card_number ? formatCardNumber(card.card_number) : `•••• •••• •••• ${card?.last4 || '****'}`;
  const displayExpiry = card ? `${card.expiry_month}/${card.expiry_year.slice(-2)}` : '--/--';
  const displayCvv = card?.cvv || '•••';
  const displayHolder = session.email || 'Card Holder';
  const serviceName = card?.service_name || 'X Premium';

  const isXBlue = serviceId === 'x-blue' || serviceName.toLowerCase().includes('x premium');

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f8fbff] px-[18px] pt-7 pb-[60px] text-[#161b33]">
      <header className="flex items-center justify-between pt-2 pb-[18px]">
        <Link className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]" href="/">
          PayEase
        </Link>
        <Link className="p-1.5 text-[#161b33]" href="/" aria-label="Close">
          <X size={20} />
        </Link>
      </header>

      {loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-[3px] border-[#e6e8f5] border-t-[#1f2c7a]" />
          <p className="text-[#4c5572]">Loading your virtual card...</p>
        </div>
      ) : error && !card ? (
        <div className="rounded-xl border border-[#f5c5bd] bg-[#fff5f3] p-6 text-center">
          <AlertTriangle size={28} className="mx-auto mb-2 text-[#b43426]" />
          <p className="font-semibold text-[#b43426]">{error}</p>
          <button
            className="mt-4 cursor-pointer rounded-[10px] bg-[#0f0f62] px-5 py-2.5 font-bold text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="mb-[18px] text-center">
            <h1 className="mb-2 text-[1.5rem]">
              Complete Your {serviceName} Payment
            </h1>
            <p className="whitespace-pre-line leading-[1.5] text-[#4c5572]">
              Use the secure card below to finish checkout.{'\n'}This card is generated only for this payment.
            </p>
          </section>

          {error && (
            <div className="mb-4 rounded-[10px] border border-[#f5c5bd] bg-[#fff5f3] px-4 py-3 font-semibold text-[#b43426]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 rounded-[10px] border border-[#cfe0ff] bg-[#eef5ff] px-[14px] py-3 font-bold text-[#1f2c7a]">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={16} /> Single-use card
            </span>
            <span className="inline-flex items-center gap-2">
              <Lock size={16} /> {isXBlue ? 'Locked to x.com' : 'Locked to merchant'}
            </span>
            <span className="inline-flex items-center gap-2">
              <AlarmClock size={16} /> Auto-expires
            </span>
          </div>

          <div className="my-4 grid place-items-center rounded-xl border border-[#d9e7ff] bg-[#e8f2ff] p-5">
            <div className="relative grid h-[140px] w-[120px] place-items-center rounded-[20px] bg-[linear-gradient(180deg,#12142c_0%,#14174a_100%)] text-[#d9e2ff] shadow-[0_20px_40px_rgba(14,16,56,0.25)] after:absolute after:right-0 after:bottom-1/2 after:left-0 after:h-[2px] after:bg-white/25 max-[720px]:h-[130px] max-[720px]:w-[110px]">
              <div className="text-[2.4rem] font-extrabold">{mm}</div>
              <div className="text-[0.9rem] opacity-80">min</div>
              <div className="text-[0.9rem] opacity-70">
                {mm}:{ss}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#07119b_0%,#0a0f6f_100%)] p-[18px] text-[#ecedff] shadow-[0_24px_50px_rgba(4,10,75,0.35)]">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[0.8rem] uppercase tracking-[0.08em] opacity-80">Virtual card</span>
              <span className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 font-bold">Single card use</span>
            </div>
            <div className="mb-3 text-[1.2rem] font-bold">{displayHolder}</div>
            <div className="mb-[18px] font-mono text-[1.4rem] tracking-[3px]">{displayCardNumber}</div>
            <div className="flex items-center gap-6 max-[720px]:flex-col max-[720px]:items-start">
              <div>
                <label className="mb-1 block text-[0.75rem] opacity-70">VALID UNTIL</label>
                <span className="text-base font-bold">{displayExpiry}</span>
              </div>
              <div>
                <label className="mb-1 block text-[0.75rem] opacity-70">CVV</label>
                <span className="text-base font-bold tracking-[2px]">{displayCvv}</span>
              </div>
            </div>
            <div className="absolute right-[18px] bottom-4 flex gap-2">
              <span className="h-9 w-9 rounded-full bg-[#eb001b] opacity-90" />
              <span className="-ml-2.5 h-9 w-9 rounded-full bg-[#f79e1b] opacity-90" />
            </div>
          </div>

          <div className="my-[18px] rounded-xl border border-[#e3e7f0] bg-[#f4f5f8] p-4">
            <h3 className="mb-2 text-base">How to use this card</h3>
            <ul className="list-disc pl-[18px] leading-[1.6] text-[#2b314d]">
              {isXBlue ? (
                <>
                  <li>Open x.com</li>
                  <li>Go to X Premium checkout</li>
                  <li>Enter the card details above</li>
                  <li>Complete payment before the timer expires</li>
                </>
              ) : (
                <>
                  <li>Go to the service checkout page</li>
                  <li>Enter the card details above</li>
                  <li>Complete payment before the timer expires</li>
                </>
              )}
            </ul>
          </div>

          <div className="grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-[10px] border border-[#f5c5bd] bg-[#fff5f3] p-3 font-semibold text-[#b43426]">
            <AlertTriangle size={18} />
            <div>
              This card will automatically expire after use or when the timer ends.
              It cannot be reused or accessed again.
            </div>
          </div>

          <button
            className="mt-[18px] w-full cursor-pointer rounded-[10px] bg-[#0f0f62] px-3 py-[14px] font-bold text-white shadow-[0_14px_32px_rgba(15,15,98,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={expired}
            onClick={handleContinue}
          >
            {expired ? 'Card expired' : 'Continue'}
          </button>
        </>
      )}
    </main>
  );
}

export default function CardPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-[1100px] bg-[#f8fbff] px-[18px] pt-7 pb-[60px] text-[#161b33]">
          <header className="flex items-center justify-between pt-2 pb-[18px]">
            <Link className="font-[family-name:var(--font-itim)] text-2xl text-[#1b2b6f]" href="/">
              PayEase
            </Link>
          </header>
          <p className="mt-10 text-sm text-[#4c5572]">Loading virtual card...</p>
        </main>
      }
    >
      <CardPageInner />
    </Suspense>
  );
}
