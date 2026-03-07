type StepCardProps = {
  step: number;
  title: string;
  description: string;
};

function StepCard({ step, title, description }: StepCardProps) {
  return (
    <div className="relative rounded-xl bg-[#0d304e] p-6 text-center">
      {/* Step number */}
      <div className="mx-auto mb-4 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold">
        {step}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium">{title}</h3>

      {/* Description */}
      <p className="mt-2 text-xs leading-relaxed text-white/70">
        {description}
      </p>
    </div>
  );
}

export default function HowPayEaseWorks() {
  return (
    <section className="relative hero px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="text-2xl font-semibold">How PayEase Work</h2>
          <p className="mt-3 text-sm text-white/70">
            Simple, secure, and straightforward
          </p>
        </div>

        {/* Steps container */}
        <div className="rounded-2xl bg-[#0A0B4A] p-8 backdrop-blur-md">
          <div className="grid gap-6 md:grid-cols-4">
            <StepCard
              step={1}
              title="Choose Service"
              description="Select the subscription you want to activate"
            />
            <StepCard
              step={2}
              title="Enter Details"
              description="Provide your account email or username"
            />
            <StepCard
              step={3}
              title="Pay with USDC"
              description="Send USDC on Avalanche to our secure address"
            />
            <StepCard
              step={4}
              title="Get Activated"
              description="We activate your subscription instantly"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
