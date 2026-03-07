"use client";

import { useState } from "react";
import { SubscriptionState } from "../SubscriptionFlow";

export default function PaymentStep({
  state,
  onBack,
  onSuccess,
}: {
  state: SubscriptionState;
  onBack: () => void;
  onSuccess: (txHash: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceMap = {
    x: { monthly: 8, yearly: 84 },
    replit: { monthly: 20, yearly: 180 },
  };

  const amount = priceMap[state.platform!][state.plan!];

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const mockTxHash = "mock-tx-hash";
      onSuccess(mockTxHash);
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold">Confirm & Pay</h2>
      <p className="mt-2 text-sm text-gray-400">
        Review your subscription and complete payment.
      </p>

      <div className="mt-6 p-4 rounded-xl bg-black border border-white/10 text-sm">
        <div className="flex justify-between mb-2">
          <span>Platform</span>
          <span className="font-semibold">
            {state.platform === "x" ? "X Blue" : "Replit"}
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Plan</span>
          <span className="font-semibold">{state.plan}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Account</span>
          <span className="font-semibold truncate max-w-[200px]">
            {state.accountIdentifier}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Total</span>
          <span className="font-semibold">{amount} USDC</span>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back
        </button>
        <button
          onClick={handlePay}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Processing..." : "Pay with USDC"}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        Payment is made in USDC on Solana. We handle the subscription
        activation.
      </p>
    </div>
  );
}
