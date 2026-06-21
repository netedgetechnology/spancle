'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { fetchCmsPages } from '@/lib/cms-pages.api';
import {
  fetchHomepageSections, publishHomepageSection, unpublishHomepageSection,
  homepageSectionKeys,
} from '@/lib/cms-homepage.api';
import type { HomepageSection, SectionStatus } from '@/lib/cms-homepage.api';
import { cn } from '@/lib/utils/cn';

const STATUS_STYLES: Record<SectionStatus, string> = {
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  draft:     'bg-gray-100  text-gray-600    ring-gray-500/20',
  archived:  'bg-amber-50  text-amber-700   ring-amber-600/20',
};

function StatusBadge({ status }: { status: SectionStatus }): React.ReactElement {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset capitalize',
      STATUS_STYLES[status] ?? STATUS_STYLES['draft'],
    )}>
      {status}
    </span>
  );
}

function RowActions({ section, onRefresh }: { section: HomepageSection; onRefresh: () => void }): React.ReactElement {
  const { addToast } = useToast();
  const qc = useQueryClient();

  const invalidate = () => { void qc.invalidateQueries({ queryKey: homepageSectionKeys.all() }); onRefresh(); };

  const publish = useMutation({
    mutationFn: () => publishHomepageSection(section.id),
    onSuccess:  () => { invalidate(); addToast(`"${section.adminLabel}" published.`); },
    onError:    () => { addToast('Failed to publish section.', 'error'); },
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishHomepageSection(section.id),
    onSuccess:  () => { invalidate(); addToast(`"${section.adminLabel}" moved to draft.`, 'info'); },
    onError:    () => { addToast('Failed to unpublish section.', 'error'); },
  });

  const busy = publish.isPending || unpublish.isPending;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/website-cms/homepage/${section.id}`}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Edit
      </Link>

      {section.status !== 'published' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => publish.mutate()}
          className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
        >
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => unpublish.mutate()}
          className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
        >
          {unpublish.isPending ? 'Unpublishing…' : 'Unpublish'}
        </button>
      )}
    </div>
  );
}

export default function HomepageSectionsPage(): React.ReactElement {
  // Resolve the homepage page id from the existing pages list
  const { data: pagesData, isLoading: pagesLoading, error: pagesError } = useQuery({
    queryKey: ['cms-pages-for-homepage-lookup'],
    queryFn:  () => fetchCmsPages({ limit: 100 }),
  });

  const homepagePage = pagesData?.data.find((p) => p.isHomepage);

  // TEMP DEBUG — remove after diagnosing missing sections request
  // eslint-disable-next-line no-console
  console.log('[homepage-debug] pagesData:', pagesData);
  // eslint-disable-next-line no-console
  console.log('[homepage-debug] homepagePage:', homepagePage);
  // eslint-disable-next-line no-console
  console.log('[homepage-debug] firstPage', pagesData?.data?.[0]);
  // eslint-disable-next-line no-console
  console.log('[homepage-debug] homepagePage', homepagePage);

  const { data: sections, isLoading: sectionsLoading, error: sectionsError, refetch } = useQuery({
    queryKey: homepageSectionKeys.list(homepagePage?.id ?? ''),
    queryFn:  () => fetchHomepageSections(homepagePage!.id),
    enabled:  !!homepagePage?.id,
  });

  const isLoading = pagesLoading || (!!homepagePage && sectionsLoading);
  const error      = pagesError || sectionsError;

  const sorted = [...(sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <Link href="/website-cms" className="hover:text-gray-600 transition-colors">Website CMS</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">Homepage</span>
        </nav>
        <h2 className="text-lg font-semibold text-gray-900">Homepage Sections</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Manage the sections that appear on{' '}
          <a href="https://www.spancle.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            www.spancle.com
          </a>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Order', 'Label', 'Type', 'Status', 'Visible', 'Updated', 'Actions'].map((h) => (
                <th key={h} scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={7} className="py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading…
                </div>
              </td></tr>
            )}
            {error && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-red-500">
                Failed to load homepage sections.
              </td></tr>
            )}
            {!isLoading && !error && !homepagePage && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                No homepage page found. The homepage page must be seeded first.
              </td></tr>
            )}
            {!isLoading && !error && homepagePage && sorted.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                No sections found for the homepage.
              </td></tr>
            )}
            {sorted.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{s.sortOrder}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.adminLabel}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-500">{s.sectionType}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.isVisible ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(s.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <RowActions section={s} onRefresh={() => void refetch()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
