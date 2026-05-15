// @ts-nocheck
import {
  Calendar, Receipt, Building2, User, BarChart3, PenLine,
  Zap, Shield, Star, CheckCircle2, Globe, Lock,
  CreditCard, Bell, FileText, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar:      Calendar,
  receipt:       Receipt,
  building:      Building2,
  user:          User,
  chart:         BarChart3,
  pencil:        PenLine,
  bolt:          Zap,
  shield:        Shield,
  star:          Star,
  check:         CheckCircle2,
  globe:         Globe,
  lock:          Lock,
  card:          CreditCard,
  bell:          Bell,
  file:          FileText,
  settings:      Settings,
};

const KEYWORD_ICONS: [string, React.ComponentType<{className?: string}>][] = [
  ['book',    Calendar],
  ['invoice', Receipt],
  ['gst',     Receipt],
  ['payment', CreditCard],
  ['report',  BarChart3],
  ['analyt',  BarChart3],
  ['branch',  Building2],
  ['venue',   Building2],
  ['member',  User],
  ['staff',   User],
  ['cms',     PenLine],
  ['website', Globe],
  ['portal',  Globe],
  ['notif',   Bell],
  ['alert',   Bell],
  ['securit', Shield],
  ['role',    Lock],
];

const ACCENT_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-cyan-500 to-cyan-600',
];

function resolveIcon(item: Record<string,any>): React.ComponentType<{className?:string}> {
  if (item.iconName && ICON_MAP[item.iconName.toLowerCase()]) return ICON_MAP[item.iconName.toLowerCase()];
  const titleLower = (item.title ?? '').toLowerCase();
  for (const [kw, Icon] of KEYWORD_ICONS) {
    if (titleLower.includes(kw)) return Icon;
  }
  return CheckCircle2;
}

function FeatureCard({ item, index }: { item: Record<string,any>; index: number }): React.ReactElement {
  const Icon     = resolveIcon(item);
  const gradient = ACCENT_GRADIENTS[index % ACCENT_GRADIENTS.length]!;
  return (
    <div className="group relative flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-7 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
      <div className={cn('relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm flex-shrink-0', gradient)}>
        <Icon className="h-6 w-6 text-white" aria-hidden="true" />
      </div>
      <div className="relative flex flex-col gap-2">
        <h3 className="text-base font-semibold text-gray-900 leading-snug">{item.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
      </div>
      {item.linkHref && item.linkLabel && (
        <a href={item.linkHref} className="relative mt-auto text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 self-start transition-colors">
          {item.linkLabel} →
        </a>
      )}
    </div>
  );
}

export function FeatureHighlightsSection({ payload }: { payload: Record<string,any> }): React.ReactElement {
  const { heading, subheading, items = [], columns = 3 } = payload;
  const colClass = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="py-24 relative overflow-hidden"
      style={{ background:'linear-gradient(180deg,#f8fafc 0%,#ffffff 100%)' }}>
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          {heading && <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>}
          {subheading && <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">{subheading}</p>}
        </div>
        <div className={cn('grid grid-cols-1 gap-6', colClass)}>
          {items.map((item: Record<string,any>, i: number) => (
            <FeatureCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
