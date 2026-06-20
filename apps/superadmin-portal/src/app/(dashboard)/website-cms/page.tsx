import Link from 'next/link';

const CMS_CARDS = [
  {
    title:       'Pages',
    description: 'Create, edit and publish public website pages (About, Features, Pricing, etc.).',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    action: (
      <Link
        href="/website-cms/pages"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Edit pages →
      </Link>
    ),
  },
  {
    title:       'Homepage',
    description: 'Manage homepage sections: hero, features, FAQ, CTA and more.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    action: (
      <Link
        href="/website-cms/homepage"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Edit homepage →
      </Link>
    ),
  },
  {
    title:       'SEO',
    description: 'Edit meta titles, descriptions, robots and canonical URLs for each page.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    action: (
      <Link
        href="/website-cms/pages"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Edit page SEO →
      </Link>
    ),
  },
];

export default function WebsiteCmsPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Website CMS</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Manage public website content at{' '}
          <a
            href="https://www.spancle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            www.spancle.com
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CMS_CARDS.map((card) => (
          <div
            key={card.title}
            className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
              {card.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{card.description}</p>
            </div>
            <div className="mt-auto pt-2">
              {card.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
