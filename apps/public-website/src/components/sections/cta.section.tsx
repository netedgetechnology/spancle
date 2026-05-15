// @ts-nocheck
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export function CtaSection({ payload }: { payload: Record<string,any> }): React.ReactElement {
  const {
    heading, subheading, body,
    primaryCta, secondaryCta,
    bgStyle = 'brand', backgroundImageUrl, overlayOpacity = 0.55,
    layout = 'centered', eyebrowText,
  } = payload;

  const isSplit  = layout === 'split-left' || layout === 'split-right';
  const isLight  = bgStyle === 'light';
  const isImage  = bgStyle === 'image';
  const isDarkBg = !isLight;

  const bgStyle_  = isImage && backgroundImageUrl
    ? { backgroundImage:`url(${backgroundImageUrl})`, backgroundSize:'cover', backgroundPosition:'center' }
    : bgStyle === 'dark'
      ? { background:'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }
      : bgStyle === 'light'
        ? { background:'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }
        : { background:'linear-gradient(135deg,#1d4ed8 0%,#0f172a 55%,#1d4ed8 100%)' };

  return (
    <section className="relative py-28 overflow-hidden" style={bgStyle_}>
      {isImage && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} aria-hidden="true" />
      )}
      {/* Decorative elements */}
      {isDarkBg && !isImage && (
        <>
          <div className="pointer-events-none absolute inset-0"
            style={{ backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize:'32px 32px' }}
            aria-hidden="true" />
          <div className="pointer-events-none absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-3xl" aria-hidden="true" />
        </>
      )}
      <div className={cn(
        'relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        !isSplit && 'flex flex-col items-center text-center',
        isSplit  && 'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center',
      )}>
        <div className="flex flex-col gap-7 max-w-2xl">
          {eyebrowText && (
            <span className={cn(
              'inline-block self-start rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest uppercase',
              isDarkBg ? 'border-blue-400/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700',
            )}>
              {eyebrowText}
            </span>
          )}
          <h2 className={cn(
            'text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl',
            isDarkBg ? 'text-white' : 'text-gray-900',
          )}>
            {heading}
          </h2>
          {subheading && (
            <p className={cn('text-xl font-medium', isDarkBg ? 'text-blue-100/80' : 'text-gray-600')}>
              {subheading}
            </p>
          )}
          {body && (
            <p className={cn('text-base leading-relaxed', isDarkBg ? 'text-blue-200/60' : 'text-gray-500')}>
              {body}
            </p>
          )}
          <div className={cn('flex flex-wrap gap-4 pt-2', !isSplit && 'justify-center')}>
            {primaryCta && (
              <Link href={primaryCta.href ?? '#'}
                target={primaryCta.targetBlank ? '_blank' : '_self'}
                rel={primaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  isDarkBg ? 'bg-white text-gray-900 hover:bg-blue-50 focus:ring-white shadow-white/10' : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
                )}>
                {primaryCta.label}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href ?? '#'}
                target={secondaryCta.targetBlank ? '_blank' : '_self'}
                rel={secondaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                className={cn(
                  'inline-flex items-center justify-center rounded-xl border px-8 py-4 text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  isDarkBg ? 'border-white/20 bg-white/5 text-white hover:bg-white/10 focus:ring-white/40' : 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
                )}>
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
