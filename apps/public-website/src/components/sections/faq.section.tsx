'use client';
// @ts-nocheck
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface FaqItem { question: string; answer: string; }

function AccordionItem({
  item, isOpen, onToggle, index,
}: {
  item: FaqItem; isOpen: boolean; onToggle: () => void; index: number;
}): React.ReactElement {
  const id = `faq-answer-${index}`;
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={id}
        className="flex w-full items-start justify-between py-5 text-left gap-4 group"
      >
        <span className="text-base font-medium text-gray-900 group-hover:text-primary-600 transition-colors leading-snug">
          {item.question}
        </span>
        <span
          className={cn(
            'flex-shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-400 transition-all duration-200',
            isOpen && 'rotate-180 border-primary-300 text-primary-500 bg-primary-50',
          )}
          aria-hidden="true"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      <div
        id={id}
        role="region"
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[800px] pb-5' : 'max-h-0',
        )}
      >
        <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

export function FaqSection({ payload }: { payload: Record<string, any> }): React.ReactElement {
  const { heading, subheading, items = [], allowMultiOpen = false, cta } = payload;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));

  const toggle = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!allowMultiOpen) next.clear();
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
          {subheading && (
            <p className="mt-4 text-lg text-gray-500">{subheading}</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-200 px-6">
          {items.map((item: FaqItem, i: number) => (
            <AccordionItem
              key={i}
              index={i}
              item={item}
              isOpen={openItems.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>

        {cta && (
          <div className="mt-10 text-center">
            <Link
              href={cta.href ?? '#'}
              target={cta.targetBlank ? '_blank' : '_self'}
              rel={cta.targetBlank ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
