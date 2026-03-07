'use client'

export default function PlanStep({
  platform,
  onBack,
  onNext,
}: {
  platform: 'x' | 'replit'
  onBack: () => void
  onNext: (plan: 'monthly' | 'yearly') => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold">Choose a plan</h2>
      <p className="mt-2 text-sm text-gray-400">
        Billing frequency for {platform === 'x' ? 'X Blue' : 'Replit'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <button
          onClick={() => onNext('monthly')}
          className="p-4 rounded-xl border border-white/10 hover:border-indigo-500 bg-black text-left"
        >
          <div className="font-semibold">Monthly</div>
          <div className="text-sm text-gray-400">Pay month-to-month</div>
        </button>

        <button
          onClick={() => onNext('yearly')}
          className="p-4 rounded-xl border border-white/10 hover:border-indigo-500 bg-black text-left"
        >
          <div className="font-semibold">Yearly</div>
          <div className="text-sm text-gray-400">Save with annual billing</div>
        </button>
      </div>

      <button onClick={onBack} className="mt-6 text-sm text-gray-400 hover:text-white">
        ← Back
      </button>
    </div>
  )
}
