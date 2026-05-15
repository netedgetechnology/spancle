'use client';
// @ts-nocheck
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

function AccordionItem({ item, isOpen, onToggle, index }: {
  item: { question: string; answer: string };
  isOpen: boolean; onToggle: () => void; index: number;
}): React.ReactElement {
  const id = `faq-ans-${index}`;
  return (
    <div className={cn('rounded-xl border transition-all duration-200', isOpen ? 'border-blue-200 bg-white shadow-sm' : 'border-transparent bg-white/60 hover:bg-white hover:border-gray-200')}>
      <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-controls={id}
        className="flex w-full items-start justify-between px-6 py-5 text-left gap-4 group">
        <span className={cn('text-base font-semibold leading-snug transition-colors', isOpen ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600')}>
          {item.question}
        </span>
        <span className={cn(
          'flex-shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
          isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600',
        )} aria-hidden="true">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>
      <div id={id} role="region" className={cn('overflow-hidden transition-all duration-300 ease-in-out', isOpen ? 'max-h-[800px]' : 'max-h-0')}>
        <p className="px-6 pb-6 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

export function FaqSection({ payload }: { payload: Record<string,any> }): React.ReactElement {
  const { heading, subheading, items = [], allowMultiOpen = false, cta } = payload;
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const toggle = (i: number) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(i)) { next.delete(i); } else { if (!allowMultiOpen) next.clear(); next.add(i); }
    return next;
  });

  return (
    <section className="py-24 relative overflow-hidden"
      style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%)' }}>
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize:'28px 28px' }}
        aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" aria-hidden="true" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          {heading && <h2 className="text-3xl font-bold text-white sm:text-4xl">{heading}</h2>}
          {subheading && <p className="mt-4 text-lg text-blue-200/70">{subheading}</p>}
        </div>
        <div className="flex flex-col gap-3">
          {items.map((item: { question: string; answer: string }, i: number) => (
            <AccordionItem key={i} index={i} item={item} isOpen={open.has(i)} onToggle={() => toggle(i)} />
          ))}
        </div>
        {cta && (
          <div className="mt-10 text-center">
            <Link href={cta.href ?? '#'}
              target={cta.targetBlank ? '_blank' : '_self'}
              rel={cta.targetBlank ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
