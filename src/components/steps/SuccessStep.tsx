'use client'

import { SubscriptionState } from '../SubscriptionFlow'

export default function SuccessStep({ state }: { state: SubscriptionState }) {
  return (
    <div className="text-center">
      <div className="text-3xl mb-4">✅</div>
      <h2 className="text-2xl font-semibold">Subscription Activated</h2>
      <p className="mt-2 text-sm text-gray-400">
        Your {state.platform === 'x' ? 'X Blue' : 'Replit'} subscription is now active.
      </p>

      <div className="mt-6 p-4 rounded-xl bg-black border border-white/10 text-sm">
        <div className="flex justify-between mb-2">
          <span>Account</span>
          <span className="font-semibold truncate max-w-[200px]">
            {state.accountIdentifier}
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Plan</span>
          <span className="font-semibold">{state.plan}</span>
        </div>
        <div className="flex justify-between">
          <span>Transaction</span>
          <span className="font-semibold truncate max-w-[200px]">
            {state.txHash}
          </span>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-400">
        You’ll receive confirmation shortly. No further action needed.
      </p>
    </div>
  )
}
