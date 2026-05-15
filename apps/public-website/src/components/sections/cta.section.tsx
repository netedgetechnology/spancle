// @ts-nocheck
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

const BG: Record<string, string> = {
  brand: 'bg-primary-600',
  dark:  'bg-slate-900',
  light: 'bg-gray-50',
  image: 'bg-cover bg-center bg-no-repeat',
};

const TEXT: Record<string, { h: string; p: string }> = {
  brand: { h: 'text-white',     p: 'text-white/80'  },
  dark:  { h: 'text-white',     p: 'text-gray-300'  },
  light: { h: 'text-gray-900',  p: 'text-gray-600'  },
  image: { h: 'text-white',     p: 'text-white/80'  },
};

export function CtaSection({ payload }: { payload: Record<string, any> }): React.ReactElement {
  const {
    heading, subheading, body,
    primaryCta, secondaryCta,
    bgStyle = 'brand', backgroundImageUrl, overlayOpacity = 0.6,
    layout = 'centered', eyebrowText,
  } = payload;

  const colors  = TEXT[bgStyle] ?? TEXT['brand'];
  const isDarkBg = bgStyle === 'brand' || bgStyle === 'dark' || bgStyle === 'image';
  const isSplit  = layout === 'split-left' || layout === 'split-right';

  return (
    <section
      className={cn('relative py-24 overflow-hidden', BG[bgStyle] ?? BG['brand'])}
      style={bgStyle === 'image' && backgroundImageUrl
        ? { backgroundImage: `url(${backgroundImageUrl})` }
        : undefined}
    >
      {bgStyle === 'image' && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} aria-hidden="true" />
      )}

      {/* Decorative gradient blob for brand style */}
      {bgStyle === 'brand' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
        </div>
      )}

      <div
        className={cn(
          'relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
          !isSplit && 'flex flex-col items-center text-center',
          isSplit  && 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center',
        )}
      >
        <div className="flex flex-col gap-6 max-w-2xl">
          {eyebrowText && (
            <span className={cn(
              'inline-block self-start rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase',
              isDarkBg ? 'bg-white/15 text-white' : 'bg-primary-100 text-primary-700',
            )}>
              {eyebrowText}
            </span>
          )}

          <h2 className={cn('text-3xl font-extrabold sm:text-4xl lg:text-5xl leading-tight', colors.h)}>
            {heading}
          </h2>

          {subheading && (
            <p className={cn('text-xl font-medium', colors.p)}>{subheading}</p>
          )}

          {body && (
            <p className={cn('text-base leading-relaxed', colors.p)}>{body}</p>
          )}

          <div className={cn('flex flex-wrap gap-4 mt-2', !isSplit && 'justify-center')}>
            {primaryCta && (
              <Link
                href={primaryCta.href ?? '#'}
                target={primaryCta.targetBlank ? '_blank' : '_self'}
                rel={primaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                className={cn(
                  'inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  isDarkBg
                    ? 'bg-white text-gray-900 hover:bg-gray-100 focus:ring-white'
                    : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
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
                  isDarkBg
                    ? 'border-white/30 text-white hover:bg-white/10 focus:ring-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
                )}
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
