// @ts-nocheck
import { Button } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { HeroBannerPayload } from '@/types/homepage.types';

interface HeroBannerSectionProps {
  payload: HeroBannerPayload;
}

/**
 * HeroBannerSection — full-width hero block.
 *
 * Supports:
 *   - Background image with configurable overlay opacity
 *   - Gradient fallback when no image is provided
 *   - Three layout variants: centered | left-aligned | split
 *   - Primary and secondary CTA buttons
 *   - Eyebrow badge text
 *   - Light and dark text schemes
 */
export function HeroBannerSection({ payload }: HeroBannerSectionProps): React.ReactElement {
  const {
    headline, subheadline, body,
    primaryCta, secondaryCta,
    backgroundImageUrl, overlayOpacity = 0.4,
    bgColor = '#0ea5e9', textScheme = 'light',
    eyebrowText, layout = 'centered',
  } = payload as Record<string, any>;

  const isDark   = textScheme === 'dark';
  const isSplit  = layout === 'split';
  const isLeft   = layout === 'left-aligned';

  return (
    <section
      className="relative min-h-[520px] flex items-center overflow-hidden"
      aria-label={headline}
    >
      {/* Background */}
      {backgroundImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: overlayOpacity }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: bgColor }}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20',
          isSplit  && 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center',
          !isSplit && 'flex flex-col',
          isLeft   && 'items-start text-left',
          !isLeft && !isSplit && 'items-center text-center',
        )}
      >
        <div className={cn('flex flex-col gap-6', isSplit && 'lg:col-span-1')}>
          {eyebrowText && (
            <span
              className={cn(
                'inline-block self-start rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase',
                isDark
                  ? 'bg-gray-800 text-gray-200'
                  : 'bg-white/20 text-white backdrop-blur-sm',
              )}
            >
              {eyebrowText}
            </span>
          )}

          <h1
            className={cn(
              'text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl',
              isDark ? 'text-gray-900' : 'text-white',
            )}
          >
            {headline}
          </h1>

          {subheadline && (
            <p
              className={cn(
                'text-xl font-medium',
                isDark ? 'text-gray-700' : 'text-white/90',
              )}
            >
              {subheadline}
            </p>
          )}

          {body && (
            <p
              className={cn(
                'text-base max-w-2xl leading-relaxed',
                isDark ? 'text-gray-600' : 'text-white/80',
              )}
            >
              {body}
            </p>
          )}

          {(primaryCta ?? secondaryCta) && (
            <div className="flex flex-wrap gap-4 mt-2">
              {primaryCta && (
                <Button
                  asChild
                  variant={isDark ? 'primary' : 'secondary'}
                  size="lg"
                >
                  <a
                    href={primaryCta.href}
                    target={primaryCta.targetBlank ? '_blank' : '_self'}
                    rel={primaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                  >
                    {primaryCta.label}
                  </a>
                </Button>
              )}
              {secondaryCta && (
                <Button
                  asChild
                  variant={isDark ? 'outline' : 'ghost'}
                  size="lg"
                  className={!isDark ? 'text-white border-white/40 hover:bg-white/10' : ''}
                >
                  <a
                    href={secondaryCta.href}
                    target={secondaryCta.targetBlank ? '_blank' : '_self'}
                    rel={secondaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                  >
                    {secondaryCta.label}
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
