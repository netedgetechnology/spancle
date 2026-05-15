// @ts-nocheck
import { cn } from '@/lib/utils/cn';

const ICON_MAP: Record<string, string> = {
  calendar:  '📅',
  receipt:   '🧾',
  building:  '🏢',
  user:      '👤',
  chart:     '📊',
  pencil:    '✏️',
  bolt:      '⚡',
  shield:    '🛡️',
  star:      '⭐',
  check:     '✅',
};

interface FeatureItem {
  title:        string;
  description:  string;
  iconName?:    string;
  accentColor?: string;
  linkHref?:    string;
  linkLabel?:   string;
}

function FeatureCard({ item }: { item: FeatureItem }): React.ReactElement {
  const accent = item.accentColor ?? '#0284c7';
  const emoji  = item.iconName ? (ICON_MAP[item.iconName] ?? '✦') : null;

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-7 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      {emoji && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
          style={{ backgroundColor: `${accent}15` }}
          aria-hidden="true"
        >
          {emoji}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
      </div>
      {item.linkHref && item.linkLabel && (
        <a
          href={item.linkHref}
          className="mt-auto text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline self-start"
        >
          {item.linkLabel} →
        </a>
      )}
    </div>
  );
}

export function FeatureHighlightsSection({ payload }: { payload: Record<string, any> }): React.ReactElement {
  const { heading, subheading, items = [], columns = 3 } = payload;

  const colClass =
    columns === 2 ? 'sm:grid-cols-2' :
    columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
    'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
          {subheading && (
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">{subheading}</p>
          )}
        </div>

        <div className={cn('grid grid-cols-1 gap-6', colClass)}>
          {items.map((item: FeatureItem, i: number) => (
            <FeatureCard key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
