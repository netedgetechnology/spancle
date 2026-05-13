// @ts-nocheck
import { Button } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { CtaSectionPayload } from '@/types/homepage.types';

interface CtaSectionProps {
  payload: CtaSectionPayload;
}

const BG_CLASSES: Record<string, string> = {
  brand: 'bg-primary-600',
  dark:  'bg-gray-900',
  light: 'bg-gray-50',
  image: 'bg-cover bg-center bg-no-repeat',
};

const TEXT_CLASSES: Record<string, { heading: string; body: string }> = {
  brand: { heading: 'text-white',     body: 'text-white/85'   },
  dark:  { heading: 'text-white',     body: 'text-gray-300'   },
  light: { heading: 'text-gray-900',  body: 'text-gray-600'   },
  image: { heading: 'text-white',     body: 'text-white/85'   },
};

export function CtaSection({ payload }: CtaSectionProps): React.ReactElement {
  const {
    heading, subheading, body,
    primaryCta, secondaryCta,
    bgStyle = 'brand', backgroundImageUrl, overlayOpacity = 0.6,
    layout = 'centered', eyebrowText,
  } = payload as Record<string, any>;

  const textColors = TEXT_CLASSES[bgStyle] ?? TEXT_CLASSES['brand'];
  const isSplit    = layout === 'split-left' || layout === 'split-right';
  const isDarkBg   = bgStyle === 'brand' || bgStyle === 'dark' || bgStyle === 'image';

  return (
    <section
      className={cn('relative py-20 overflow-hidden', BG_CLASSES[bgStyle] ?? BG_CLASSES['brand'])}
      style={
        bgStyle === 'image' && backgroundImageUrl
          ? { backgroundImage: `url(${backgroundImageUrl})` }
          : undefined
      }
    >
      {bgStyle === 'image' && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
          !isSplit && 'text-center flex flex-col items-center',
          isSplit  && 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center',
        )}
      >
        <div className="flex flex-col gap-6 max-w-2xl">
          {eyebrowText && (
            <span
              className={cn(
                'inline-block self-start rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase',
                isDarkBg
                  ? 'bg-white/15 text-white'
                  : 'bg-primary-100 text-primary-700',
              )}
            >
              {eyebrowText}
            </span>
          )}

          <h2 className={cn('text-3xl font-bold sm:text-4xl lg:text-5xl', textColors?.heading)}>
            {heading}
          </h2>

          {subheading && (
            <p className={cn('text-xl font-medium', textColors?.body)}>{subheading}</p>
          )}

          {body && (
            <p className={cn('text-base leading-relaxed', textColors?.body)}>{body}</p>
          )}

          <div className={cn('flex flex-wrap gap-4 mt-2', !isSplit && 'justify-center')}>
            {primaryCta && (
              <Button
                asChild
                variant={isDarkBg ? 'secondary' : 'primary'}
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
                variant="ghost"
                size="lg"
                className={cn(isDarkBg && 'text-white border-white/30 hover:bg-white/10')}
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
        </div>
      </div>
    </section>
  );
}
