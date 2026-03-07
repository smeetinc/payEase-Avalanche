'use client'

import { useState } from 'react'

export default function AccountStep({
  platform,
  onBack,
  onNext,
}: {
  platform: 'x' | 'replit'
  onBack: () => void
  onNext: (accountIdentifier: string) => void
}) {
  const [value, setValue] = useState('')

  return (
    <div>
      <h2 className="text-2xl font-semibold">Enter your account</h2>
      <p className="mt-2 text-sm text-gray-400">
        {platform === 'x'
          ? 'Enter your X username or email.'
          : 'Enter the email associated with your Replit account.'}
      </p>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={platform === 'x' ? '@username or email' : 'email@example.com'}
        className="mt-6 w-full p-3 rounded-xl bg-black border border-white/10 text-white placeholder-gray-500"
      />

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white">
          ← Back
        </button>
        <button
          disabled={!value}
          onClick={() => onNext(value)}
          className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
