'use client'

export default function PlatformStep({ onNext }: { onNext: (p: 'x' | 'replit') => void }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold">Choose a platform</h2>
      <p className="mt-2 text-sm text-gray-400">Which subscription do you want to activate?</p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <button
          onClick={() => onNext('x')}
          className="p-4 rounded-xl border border-white/10 hover:border-indigo-500 bg-black text-left"
        >
          <div className="font-semibold">X (Twitter) Blue</div>
          <div className="text-sm text-gray-400">Verified badge + premium features</div>
        </button>

        <button
          onClick={() => onNext('replit')}
          className="p-4 rounded-xl border border-white/10 hover:border-indigo-500 bg-black text-left"
        >
          <div className="font-semibold">Replit</div>
          <div className="text-sm text-gray-400">Developer tools and hosting</div>
        </button>
      </div>
    </div>
  )
}
