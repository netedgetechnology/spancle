// @ts-nocheck
'use client';

import { useState } from 'react';
import { Button } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { FaqPayload, FaqItem } from '@/types/homepage.types'

interface FaqSectionProps {
  payload: FaqPayload;
}

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between py-5 text-left gap-4 group"
      >
        <span className="text-base font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
          {item.question}
        </span>
        <svg
          className={cn(
            'h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 mt-0.5',
            isOpen && 'rotate-180',
          )}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isOpen ? 'max-h-[1000px] pb-5' : 'max-h-0',
        )}
      >
        <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

export function FaqSection({ payload }: FaqSectionProps): React.ReactElement {
  const { heading, subheading, items, allowMultiOpen = false, cta } = payload as Record<string, any>;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggle = (index: number): void => {
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
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
          {subheading && (
            <p className="text-lg text-gray-600">{subheading}</p>
          )}
        </div>

        <div
          className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm px-6"
          role="list"
        >
          {items.map((item: FaqItem, index: number) => (
            <AccordionItem
              key={index}
              item={item}
              isOpen={openItems.has(index)}
              onToggle={() => toggle(index)}
            />
          ))}
        </div>

        {cta && (
          <div className="mt-10 text-center">
            <Button asChild variant={cta.variant ?? 'primary'} size="lg">
              <a
                href={cta.href}
                target={cta.targetBlank ? '_blank' : '_self'}
                rel={cta.targetBlank ? 'noopener noreferrer' : undefined}
              >
                {cta.label}
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}