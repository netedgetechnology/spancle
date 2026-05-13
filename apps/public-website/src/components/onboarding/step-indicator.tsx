import { cn } from '@/lib/utils/cn';

interface Step {
  label:    string;
  sublabel: string;
}

const STEPS: Step[] = [
  { label: '1',  sublabel: 'Sign up'     },
  { label: '2',  sublabel: 'Verify email' },
  { label: '3',  sublabel: 'Choose plan'  },
  { label: '4',  sublabel: 'Set up'       },
];

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

/**
 * StepIndicator — horizontal step progress indicator.
 * Steps to the left of currentStep are shown as completed (green check).
 * currentStep is highlighted. Steps to the right are muted.
 */
export function StepIndicator({ currentStep }: StepIndicatorProps): React.ReactElement {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const stepNumber  = (index + 1) as 1 | 2 | 3 | 4;
          const isCompleted = stepNumber < currentStep;
          const isCurrent   = stepNumber === currentStep;
          const isUpcoming  = stepNumber > currentStep;
          const isLast      = index === STEPS.length - 1;

          return (
            <li key={step.label} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isCompleted && 'bg-emerald-500 text-white',
                    isCurrent   && 'bg-primary-600 text-white ring-4 ring-primary-100',
                    isUpcoming  && 'bg-gray-100 text-gray-400',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span>{step.label}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isCurrent   && 'text-primary-700',
                    isCompleted && 'text-emerald-600',
                    isUpcoming  && 'text-gray-400',
                  )}
                >
                  {step.sublabel}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-3 mb-5 rounded-full transition-colors',
                    stepNumber < currentStep ? 'bg-emerald-400' : 'bg-gray-200',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
