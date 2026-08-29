// components/ui/AuthCard.tsx
'use client';

import { motion } from 'framer-motion';
import { Poppins } from 'next/font/google';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'] });

export function AuthCard({
  title,
  subtitle,
  children,
  shake = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Triggers a brief horizontal shake — used for auth error feedback. */
  shake?: boolean;
}) {
  return (
    <div className={`flex min-h-screen items-center justify-center bg-[#e6e6e6] p-6 ${poppins.className}`}>
      <motion.div
        className="flex aspect-square w-[340px] flex-col items-center justify-center rounded-[40px] bg-[#e6e6e6] px-9 py-10 sm:w-[420px] md:w-[460px]"
        style={{
          boxShadow:
            '-20px -20px 40px #ffffff, 20px 20px 40px #c5c5c5, inset -3px -3px 6px #ffffff, inset 3px 3px 6px #c8c8c8',
        }}
        animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-neutral-700 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mb-6 mt-1 text-center text-sm text-neutral-500">{subtitle}</p>}
        <div className="flex w-full max-w-[260px] flex-col gap-3.5">{children}</div>
      </motion.div>
    </div>
  );
}