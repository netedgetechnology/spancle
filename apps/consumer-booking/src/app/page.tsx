'use client';

/**
 * / — Public landing page
 *
 * Unauthenticated: venue/sport discovery CTA, guest booking link
 * Authenticated:   redirects to /  (dashboard home via layout)
 *
 * This page only shows to unauthenticated users because the (dashboard)
 * group wraps authenticated routes. The root page.tsx is inside the root
 * app/ — it shows to everyone who hasn't been caught by the dashboard layout.
 */

import Link                  from 'next/link';
import { useQuery }          from '@tanstack/react-query';
import { fetchVenues, venueKeys } from '@/lib/api/venue.api';
import { fetchSports, sportKeys } from '@/lib/api/sport.api';

const SPORT_EMOJIS: Record<string, string> = {
  tennis: '🎾', badminton: '🏸', squash: '🏉', padel: '🏓',
  cricket: '🏏', football: '⚽', basketball: '🏀', volleyball: '🏐',
  swimming: '🏊', gym: '💪',
};

function SportIcon({ slug, icon, name }: { slug: string; icon: string | null; name: string }): React.ReactElement {
  const emoji = icon ?? SPORT_EMOJIS[slug.toLowerCase()] ?? '🏟️';
  return (
    <span className="text-2xl" role="img" aria-label={name}>{emoji}</span>
  );
}

export default function PublicLandingPage(): React.ReactElement {
  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: venueKeys.list(),
    queryFn:  fetchVenues,
    staleTime: 10 * 60_000,
  });

  const { data: sports = [], isLoading: sportsLoading } = useQuery({
    queryKey: sportKeys.list(),
    queryFn:  fetchSports,
    staleTime: 10 * 60_000,
  });

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4 py-20 sm:py-28 text-white text-center">
        <div className="relative max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200 mb-4">
            Online Booking
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
            Book a Court,<br className="hidden sm:block" /> Play Today
          </h1>
          <p className="text-lg text-blue-100 mb-10 max-w-xl mx-auto">
            Find available slots at your nearest venue and book in minutes.
            No queues, no phone calls.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/book"
              className="w-full sm:w-auto rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-blue-700 hover:bg-blue-50 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
            >
              Book a court →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-2xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-xs text-blue-200">
            No account needed to book as a guest
          </p>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5 pointer-events-none" />
      </section>

      {/* Sports */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Browse by sport</h2>
        <p className="text-sm text-gray-500 mb-7">
          Select a sport to find available courts and times
        </p>

        {sportsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : sports.length === 0 ? (
          <p className="text-sm text-gray-400">No sports available right now.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sports.map((sport) => (
              <Link
                key={sport.id}
                href={`/book?sport=${sport.id}`}
                className="flex flex-col items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <SportIcon slug={sport.slug} icon={sport.icon} name={sport.name} />
                <span className="text-sm font-semibold text-gray-800">{sport.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Venues */}
      {(venues.length > 0 || venuesLoading) && (
        <section className="bg-gray-50 px-4 py-14">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Our venues</h2>
            <p className="text-sm text-gray-500 mb-7">Choose a venue to see what&apos;s available</p>

            {venuesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-gray-200" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {venues.map((venue) => (
                  <Link
                    key={venue.id}
                    href={`/book?venue=${venue.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 hover:border-blue-200 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{venue.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">View available courts →</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { step: '1', title: 'Choose a court', desc: 'Pick your venue, sport, and preferred court.', icon: '🏟️' },
            { step: '2', title: 'Select a time', desc: 'Browse real-time availability and choose your slots.', icon: '🕐' },
            { step: '3', title: 'Book & play', desc: 'Pay online and get instant confirmation with a QR code.', icon: '✅' },
          ].map(({ step, title, desc, icon }) => (
            <div key={step} className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-100 bg-white">
              <span className="text-3xl">{icon}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {step}
              </span>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guest lookup CTA */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-12 text-center">
        <p className="text-sm text-gray-600 mb-2">Already have a booking?</p>
        <Link
          href="/booking-lookup"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          Look up your booking →
        </Link>
      </section>
    </main>
  );
}
