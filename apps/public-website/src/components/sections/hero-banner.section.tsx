// @ts-nocheck
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface CtaButton { label: string; href: string; targetBlank?: boolean; variant?: string; }

interface HeroBannerProps {
  payload: Record<string, any>;
}

export function HeroBannerSection({ payload }: HeroBannerProps): React.ReactElement {
  const {
    headline, subheadline, body,
    primaryCta, secondaryCta,
    backgroundImageUrl, overlayOpacity = 0.45,
    bgColor = '#0284c7', textScheme = 'light',
    eyebrowText, layout = 'centered',
  } = payload;

  const isDark  = textScheme === 'dark';
  const isLeft  = layout === 'left-aligned';
  const isSplit = layout === 'split';

  return (
    <section
      className="relative min-h-[580px] flex items-center overflow-hidden"
      aria-label={headline}
    >
      {/* Background */}
      {backgroundImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: bgColor }} aria-hidden="true" />
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24',
          isSplit  && 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center',
          !isSplit && 'flex flex-col',
          isLeft   && 'items-start text-left',
          !isLeft  && !isSplit && 'items-center text-center',
        )}
      >
        <div className={cn('flex flex-col gap-6', isSplit && 'lg:col-span-1', !isSplit && 'max-w-3xl')}>

          {eyebrowText && (
            <span className={cn(
              'inline-block self-start rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase',
              isDark ? 'bg-gray-100 text-gray-800' : 'bg-white/20 text-white backdrop-blur-sm',
            )}>
              {eyebrowText}
            </span>
          )}

          <h1 className={cn(
            'text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl',
            isDark ? 'text-gray-900' : 'text-white',
          )}>
            {headline}
          </h1>

          {subheadline && (
            <p className={cn(
              'text-xl font-medium leading-relaxed',
              isDark ? 'text-gray-700' : 'text-white/90',
            )}>
              {subheadline}
            </p>
          )}

          {body && (
            <p className={cn(
              'text-base leading-relaxed max-w-2xl',
              isDark ? 'text-gray-600' : 'text-white/80',
            )}>
              {body}
            </p>
          )}

          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-4 mt-2">
              {primaryCta && (
                <Link
                  href={primaryCta.href ?? '#'}
                  target={primaryCta.targetBlank ? '_blank' : '_self'}
                  rel={primaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    isDark
                      ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
                      : 'bg-white text-gray-900 hover:bg-gray-100 focus:ring-white',
                  )}
                >
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href ?? '#'}
                  target={secondaryCta.targetBlank ? '_blank' : '_self'}
                  rel={secondaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'inline-flex items-center justify-center rounded-xl border px-7 py-3.5 text-base font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    isDark
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400'
                      : 'border-white/40 text-white hover:bg-white/10 focus:ring-white',
                  )}
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
