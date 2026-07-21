'use client';

import { cn } from '@/lib/utils/cn';

export interface Step {
  id:    number;
  label: string;
}

interface StepIndicatorProps {
  steps:       Step[];
  currentStep: number;
  className?:  string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps): React.ReactElement {
  return (
    <nav aria-label="Booking steps" className={cn('flex items-center gap-0', className)}>
      {steps.map((step, i) => {
        const done    = step.id < currentStep;
        const active  = step.id === currentStep;
        const last    = i === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step bubble */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done   && 'bg-blue-600 text-white',
                  active && 'bg-blue-600 text-white ring-4 ring-blue-100',
                  !done && !active && 'bg-gray-200 text-gray-500',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span className={cn(
                'mt-1 hidden sm:block text-[10px] font-medium whitespace-nowrap',
                active ? 'text-blue-600' : done ? 'text-gray-600' : 'text-gray-400',
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {!last && (
              <div className={cn(
                'mx-1 h-0.5 w-8 sm:w-12 flex-shrink-0 transition-colors',
                done ? 'bg-blue-600' : 'bg-gray-200',
              )} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
