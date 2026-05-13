// @ts-nocheck
'use client';

import { useState } from 'react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { PricingPreviewPayload, PricingTier } from '@/types/homepage.types';

interface PricingPreviewSectionProps {
  payload: PricingPreviewPayload;
}

function PricingTierCard({ tier }: { tier: PricingTier }): React.ReactElement {
  return (
    <Card
      className={cn(
        'flex flex-col relative transition-shadow duration-200',
        tier.isHighlighted
          ? 'border-primary-500 shadow-xl ring-2 ring-primary-500'
          : 'hover:shadow-md',
      )}
    >
      {tier.isHighlighted && tier.badgeText && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge intent="primary" size="md" className="px-4 py-1">
            {String(tier.badgeText ?? "")}
          </Badge>
        </div>
      )}

      <CardHeader className={cn(tier.isHighlighted && 'bg-primary-50 rounded-t-xl')}>
        <CardTitle className="text-xl">{String(tier.name ?? "")}</CardTitle>
        {tier.description && (
          <p className="text-sm text-gray-500 mt-1">{String(tier.description ?? "")}</p>
        )}
        <div className="mt-4">
          <span className="text-4xl font-extrabold text-gray-900">{String(tier.priceDisplay ?? "")}</span>
          {tier.billingPeriod && (
            <span className="text-sm text-gray-500 ml-1">{String(tier.billingPeriod ?? "")}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 py-6">
        <ul className="space-y-3">
          {tier.features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <svg
                className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5"
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-0 pb-6 px-6">
        <Button
          asChild
          variant={tier.isHighlighted ? 'primary' : 'outline'}
          fullWidth
          size="lg"
        >
          <a
            href={tier.cta.href}
            target={tier.cta.targetBlank ? '_blank' : '_self'}
            rel={tier.cta.targetBlank ? 'noopener noreferrer' : undefined}
          >
            {tier.cta.label}
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PricingPreviewSection({ payload }: PricingPreviewSectionProps): React.ReactElement {
  const {
    heading, subheading, tiers,
    showBillingToggle = false, annualSavingText, footerNote,
  } = payload as Record<string, any>;

  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
          {subheading && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subheading}</p>
          )}
          {showBillingToggle && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className={cn('text-sm', !isAnnual ? 'font-semibold text-gray-900' : 'text-gray-500')}>
                Monthly
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAnnual}
                onClick={() => setIsAnnual((p) => !p)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isAnnual ? 'bg-primary-600' : 'bg-gray-200',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    isAnnual ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
              <span className={cn('text-sm', isAnnual ? 'font-semibold text-gray-900' : 'text-gray-500')}>
                Annual
                {annualSavingText && (
                  <span className="ml-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-full px-2 py-0.5">
                    {annualSavingText}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'grid gap-8',
            tiers.length === 2 && 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto',
            tiers.length === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            tiers.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
          )}
        >
          {tiers.map((tier, index) => (
            <PricingTierCard key={index} tier={tier} />
          ))}
        </div>

        {footerNote && (
          <p className="text-center text-sm text-gray-500 mt-10">{footerNote}</p>
        )}
      </div>
    </section>
  );
}
