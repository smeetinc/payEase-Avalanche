import type { ReactNode } from "react";
import Image from "next/image";
import { BsTwitterX } from "react-icons/bs";

type ServiceCardProps = {
  name: string;
  description: string;
  price: string;
  icon: ReactNode | string;
};

function ServiceCard({ name, description, price, icon }: ServiceCardProps) {
  return (
    <div className="relative rounded-2xl border border-white/15  p-6 backdrop-blur-md">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Content */}
      <div className="relative flex h-full flex-col">
        {/* Icon placeholder */}
        <div className="mb-4 flex h-8 w-12 items-center justify-center rounded-xl border border-white/20">
          {typeof icon === "string" ? (
            <Image
              src={icon}
              alt={name}
              width={24}
              height={24}
              className="object-contain"
            />
          ) : (
            icon
          )}
        </div>

        <h3 className="text-lg font-medium">{name}</h3>

        <p className="mt-2 text-sm text-white/70">{description}</p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-6">
          <span className="text-sm font-medium">{price}</span>

          <button className="rounded-lg bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400 hover:bg-blue-500/20">
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Platforms() {
  return (
    <section className="relative bg-[#070838] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <div className="mb-16 text-center">
          <h2 className="text-2xl font-semibold">Supported Services</h2>
          <p className="mt-3 text-sm text-white/70">
            Pay with USDC for these premium subscriptions
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          <ServiceCard
            name="X Blue"
            description="Get verified with the blue checkmark and unlock premium features on X (formerly Twitter)."
            price="$5/month"
            icon={<BsTwitterX />}
          />

          <ServiceCard
            name="Replit Pro"
            description="Unlock advanced developer tools and boost your productivity on Replit."
            price="$20/month"
            icon="/replit.png"
          />
        </div>
      </div>
    </section>
  );
}
