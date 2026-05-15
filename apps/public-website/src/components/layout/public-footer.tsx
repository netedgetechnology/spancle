import Link from 'next/link';

const FOOTER_LINKS = {
  Product: [
    { label: 'Features',  href: '/#feature_highlights' },
    { label: 'Pricing',   href: '/#pricing_preview'    },
    { label: 'Changelog', href: '/changelog'            },
    { label: 'Roadmap',   href: '/roadmap'              },
  ],
  Company: [
    { label: 'About',    href: '/about'   },
    { label: 'Blog',     href: '/blog'    },
    { label: 'Careers',  href: '/careers' },
    { label: 'Contact',  href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy',   href: '/privacy'  },
    { label: 'Terms of Service', href: '/terms'    },
    { label: 'Cookie Policy',    href: '/cookies'  },
  ],
} as const;

/**
 * PublicFooter — marketing site footer.
 * Renders on all public-website pages via layout.tsx.
 */
export function PublicFooter(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate-900" aria-label="Site footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Spancle home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-sm">
                S
              </span>
              <span className="text-sm font-semibold text-white">Spancle</span>
            </Link>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              The enterprise operating system for sports organisations. Bookings,
              memberships, payments and CMS — unified in one platform.
            </p>
          </div>

          {/* Link columns */}
          {(Object.entries(FOOTER_LINKS) as [string, readonly { label: string; href: string }[]][]).map(([group, links]) => (
            <div key={group} className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {group}
              </p>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {year} Spancle Technologies. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">
            Built in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}
