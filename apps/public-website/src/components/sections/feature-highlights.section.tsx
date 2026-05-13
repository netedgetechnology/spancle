// @ts-nocheck
import { Card, CardContent } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { FeatureHighlightsPayload, FeatureItem } from '@/types/homepage.types';

interface FeatureHighlightsSectionProps {
  payload: FeatureHighlightsPayload;
}

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

function FeatureCard({ item }: { item: FeatureItem }): React.ReactElement {
  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6 flex flex-col gap-4">
        {item.iconName && (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: item.accentColor ? `${item.accentColor}20` : '#e0f2fe' }}
          >
            <span
              className="text-2xl"
              style={{ color: item.accentColor ?? '#0284c7' }}
              aria-hidden="true"
            >
              ✦
            </span>
          </div>
        )}
        {item.imageUrl && (
          <img
            src={String(item.imageUrl ?? "")}
            alt={item.title as string}
            className="w-full h-40 object-cover rounded-lg"
          />
        )}
        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed flex-1">{item.description}</p>
        {item.linkHref && item.linkLabel && (
          <a
            href={item.linkHref}
            className="text-sm font-medium text-primary-600 hover:underline self-start"
          >
            {item.linkLabel} →
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export function FeatureHighlightsSection({ payload }: FeatureHighlightsSectionProps): React.ReactElement {
  const { heading, subheading, items, columns = 3 } = payload as Record<string, any>;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
          {subheading && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subheading}</p>
          )}
        </div>

        <div className={cn('grid grid-cols-1 gap-6', COLUMN_CLASS[columns as 2 | 3 | 4])}>
          {items.map((item: FeatureItem, index: number) => (
            <FeatureCard key={index} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
