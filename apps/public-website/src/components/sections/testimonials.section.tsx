// @ts-nocheck
import { Card, CardContent } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { TestimonialsPayload, TestimonialItem } from '@/types/homepage.types';

interface TestimonialsSectionProps {
  payload: TestimonialsPayload;
}

const BG_CLASS: Record<string, string> = {
  white: 'bg-white',
  light: 'bg-gray-50',
  dark:  'bg-gray-900',
  brand: 'bg-primary-600',
};

const TEXT_CLASS: Record<string, { heading: string; body: string; meta: string }> = {
  white: { heading: 'text-gray-900', body: 'text-gray-700', meta: 'text-gray-500' },
  light: { heading: 'text-gray-900', body: 'text-gray-700', meta: 'text-gray-500' },
  dark:  { heading: 'text-white',    body: 'text-gray-300', meta: 'text-gray-400' },
  brand: { heading: 'text-white',    body: 'text-white/90', meta: 'text-white/70' },
};

const COL_CLASS: Record<1 | 2 | 3, string> = {
  1: 'max-w-2xl mx-auto',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

function StarRating({ rating }: { rating: number }): React.ReactElement {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={cn('h-4 w-4', i < rating ? 'text-amber-400' : 'text-gray-300')}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({
  item,
  bgStyle,
}: {
  item: TestimonialItem;
  bgStyle: string;
}): React.ReactElement {
  const isDarkBg = bgStyle === 'dark' || bgStyle === 'brand';

  return (
    <Card
      className={cn(
        'h-full flex flex-col',
        isDarkBg ? 'bg-white/10 border-white/20' : '',
      )}
    >
      <CardContent className="p-6 flex flex-col gap-4 flex-1">
        {item.rating !== undefined && <StarRating rating={item.rating} />}

        <blockquote className={cn('text-sm leading-relaxed flex-1', TEXT_CLASS[bgStyle]?.body)}>
          &ldquo;{item.quote}&rdquo;
        </blockquote>

        <div className="flex items-center gap-3 pt-2 border-t border-current/10">
          {item.avatarUrl ? (
            <img
              src={item.avatarUrl}
              alt={item.authorName}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary-600">
                {item.authorName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className={cn('text-sm font-semibold', TEXT_CLASS[bgStyle]?.heading)}>
              {item.authorName}
            </p>
            {(item.authorRole ?? item.authorOrg) && (
              <p className={cn('text-xs', TEXT_CLASS[bgStyle]?.meta)}>
                {[item.authorRole, item.authorOrg].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestimonialsSection({ payload }: TestimonialsSectionProps): React.ReactElement {
  const { heading, subheading, items, columns = 3, bgStyle = 'light' } = payload as Record<string, any>;
  const textColors = TEXT_CLASS[bgStyle] ?? TEXT_CLASS['light'];

  return (
    <section className={cn('py-20', BG_CLASS[bgStyle] ?? BG_CLASS['light'])}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-3">
          <h2 className={cn('text-3xl font-bold sm:text-4xl', textColors.heading)}>
            {heading}
          </h2>
          {subheading && (
            <p className={cn('text-lg max-w-2xl mx-auto', textColors.body)}>
              {subheading}
            </p>
          )}
        </div>

        <div
          className={cn(
            columns === 1 ? COL_CLASS[1] : `grid gap-6 ${COL_CLASS[columns as 2 | 3]}`,
          )}
        >
          {items.map((item, index) => (
            <TestimonialCard key={index} item={item} bgStyle={bgStyle} />
          ))}
        </div>
      </div>
    </section>
  );
}
