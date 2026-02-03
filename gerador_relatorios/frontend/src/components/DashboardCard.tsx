'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  href: string;
  variant?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function DashboardCard({
  title,
  subtitle,
  icon: Icon,
  href,
  variant = 'primary',
  className
}: DashboardCardProps) {
  const variants = {
    primary: 'bg-zinc-900 border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800/50',
    secondary: 'bg-zinc-900 border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800/50',
    accent: 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/50',
  };

  return (
    <Link href={href} className="block w-full">
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={twMerge(
          'relative p-6 rounded-xl border transition-all duration-300 group h-full',
          variants[variant],
          className
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={clsx(
            'p-3 rounded-lg bg-zinc-950/50 ring-1 ring-inset',
            variant === 'primary' ? 'ring-blue-500/20 text-blue-400' :
            variant === 'secondary' ? 'ring-purple-500/20 text-purple-400' :
            'ring-emerald-500/20 text-emerald-400'
          )}>
            {Icon && <Icon size={24} />}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-mono text-zinc-500">OPEN</span>
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-zinc-100 mb-1 font-sans tracking-tight">
          {title}
        </h3>
        
        {subtitle && (
          <p className="text-sm text-zinc-400 font-medium">
            {subtitle}
          </p>
        )}
      </motion.div>
    </Link>
  );
}
