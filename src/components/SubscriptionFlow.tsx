'use client'

import { useState } from 'react'
import PlatformStep from './steps/PlatformStep'
import PlanStep from './steps/PlanStep'
import AccountStep from './steps/AccountStep'
import PaymentStep from './steps/PaymentStep'
import SuccessStep from './steps/SuccessStep'

export type SubscriptionState = {
  platform: 'x' | 'replit' | null
  plan: 'monthly' | 'yearly' | null
  accountIdentifier: string
  txHash?: string
}

export default function SubscriptionFlow() {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<SubscriptionState>({
    platform: null,
    plan: null,
    accountIdentifier: '',
  })

  return (
    <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-2xl p-6">
      {step === 0 && (
        <PlatformStep
          onNext={(platform) => {
            setState((s) => ({ ...s, platform }))
            setStep(1)
          }}
        />
      )}

      {step === 1 && (
        <PlanStep
          platform={state.platform!}
          onBack={() => setStep(0)}
          onNext={(plan) => {
            setState((s) => ({ ...s, plan }))
            setStep(2)
          }}
        />
      )}

      {step === 2 && (
        <AccountStep
          platform={state.platform!}
          onBack={() => setStep(1)}
          onNext={(accountIdentifier) => {
            setState((s) => ({ ...s, accountIdentifier }))
            setStep(3)
          }}
        />
      )}

      {step === 3 && (
        <PaymentStep
          state={state}
          onBack={() => setStep(2)}
          onSuccess={(txHash) => {
            setState((s) => ({ ...s, txHash }))
            setStep(4)
          }}
        />
      )}

      {step === 4 && <SuccessStep state={state} />}
    </div>
  )
}
