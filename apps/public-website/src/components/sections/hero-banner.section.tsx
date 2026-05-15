// @ts-nocheck
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

function DashboardMockup(): React.ReactElement {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0">
      <div className="absolute -inset-4 bg-blue-500/20 rounded-3xl blur-2xl" aria-hidden="true" />
      <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
          <span className="ml-2 text-xs text-white/40 font-medium">Spancle Dashboard</span>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Bookings today', value: '47', trend: '+12%' },
              { label: 'Revenue',        value: '₹84k', trend: '+8%'  },
              { label: 'Members',        value: '312', trend: '+3%'  },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/8 border border-white/10 p-3 flex flex-col gap-1">
                <span className="text-xs text-white/40 leading-tight">{s.label}</span>
                <span className="text-lg font-bold text-white">{s.value}</span>
                <span className="text-xs text-emerald-400 font-medium">{s.trend}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Recent Bookings</span>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { name: 'Rohan M.',  court: 'Court 3 · Badminton', time: '10:00 AM', ok: true  },
                { name: 'Priya S.',  court: 'Court 1 · Tennis',    time: '11:30 AM', ok: false },
                { name: 'Arjun K.', court: 'Court 2 · Squash',     time: '12:00 PM', ok: true  },
              ].map((r) => (
                <div key={r.name} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-blue-200">{r.name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{r.name}</p>
                      <p className="text-xs text-white/40 truncate">{r.court}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-white/50">{r.time}</span>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      r.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300')}>
                      {r.ok ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Revenue — 7 days</span>
              <span className="text-xs font-bold text-emerald-400">+18% vs last week</span>
            </div>
            <div className="flex items-end gap-1.5 h-10">
              {[40,65,50,80,70,90,100].map((h,i) => (
                <div key={i} className="flex-1 rounded-sm bg-blue-400/60" style={{ height: `${h}%` }} aria-hidden="true" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroBannerSection({ payload }: { payload: Record<string,any> }): React.ReactElement {
  const {
    headline, subheadline, body,
    primaryCta, secondaryCta,
    eyebrowText, layout = 'centered',
    textScheme = 'light',
  } = payload;

  const isSplit = layout === 'split';
  const isLeft  = layout === 'left-aligned';
  const isDark  = textScheme === 'dark';

  return (
    <section
      className="relative min-h-[640px] flex items-center overflow-hidden"
      style={{ background: isDark
        ? 'linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)'
        : 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#0f172a 100%)' }}
    >
      {!isDark && (
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize:'32px 32px' }}
          aria-hidden="true" />
      )}
      {!isDark && (
        <>
          <div className="pointer-events-none absolute top-0 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/25 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-400/15 blur-3xl" aria-hidden="true" />
        </>
      )}
      <div className={cn(
        'relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24',
        isSplit  && 'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center',
        !isSplit && 'flex flex-col',
        isLeft   && 'items-start text-left',
        !isLeft  && !isSplit && 'items-center text-center',
      )}>
        <div className="flex flex-col gap-7">
          {eyebrowText && (
            <div className="inline-flex self-start">
              <span className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-widest uppercase',
                isDark ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-blue-400/30 bg-blue-500/10 text-blue-300',
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', isDark ? 'bg-blue-500' : 'bg-blue-400')} aria-hidden="true" />
                {eyebrowText}
              </span>
            </div>
          )}
          <h1 className={cn(
            'text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl',
            isDark ? 'text-gray-900' : 'text-white',
          )}>
            {headline}
          </h1>
          {subheadline && (
            <p className={cn('text-xl font-medium leading-relaxed max-w-xl', isDark ? 'text-gray-600' : 'text-blue-100')}>
              {subheadline}
            </p>
          )}
          {body && (
            <p className={cn('text-base leading-relaxed max-w-lg', isDark ? 'text-gray-500' : 'text-blue-200/80')}>
              {body}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-4 pt-2">
              {primaryCta && (
                <Link href={primaryCta.href ?? '#'}
                  target={primaryCta.targetBlank ? '_blank' : '_self'}
                  rel={primaryCta.targetBlank ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:scale-105',
                    isDark ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' : 'bg-white text-gray-900 hover:bg-blue-50 focus:ring-white',
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
                    'inline-flex items-center justify-center rounded-xl border px-7 py-3.5 text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    isDark ? 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400' : 'border-white/20 bg-white/5 text-white hover:bg-white/10 focus:ring-white/50',
                  )}>
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
          <div className={cn('flex flex-wrap items-center gap-5 pt-2 text-xs', isDark ? 'text-gray-400' : 'text-blue-300/70')}>
            {['No credit card required','Free 30-day trial','Setup in minutes'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
        {isSplit && <div className="hidden lg:block"><DashboardMockup /></div>}
      </div>
    </section>
  );
}
