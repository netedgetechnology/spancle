'use client';

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@spancle/ui-kit';
import { useToast } from '@spancle/ui-kit';
import { SectionList }        from '@/components/homepage/section-list';
import { SectionTypePicker }  from '@/components/homepage/section-type-picker';
import { SectionForm }        from '@/components/homepage/section-form';
import { apiClient }          from '@/lib/api/client';
import { PageLoader }         from '@/components/ui/page-loader';
import { ErrorDisplay }       from '@/components/ui/error-display';
import type { HomepageSection, SectionType } from '@/types/homepage.types';

/**
 * Homepage editor page — admin section builder.
 *
 * Responsibilities:
 *   - Fetches all sections (draft + published + archived) via TanStack Query
 *   - Handles add / edit / delete / reorder / clone / publish-all mutations
 *   - Opens SectionForm modal for editing
 *   - Displays SectionTypePicker for adding new sections
 *   - Shows toast notifications for all operations
 *
 * pageId: Sprint 2 will resolve this from the tenant's homepage page record.
 *         Hardcoded to the query param or the tenant's default homepage ID.
 */

/** Default payload templates for each section type */
const DEFAULT_PAYLOADS: Record<SectionType, Record<string, unknown>> = {
  hero_banner: {
    headline:    'Welcome to Spancle',
    subheadline: 'The sports platform built for your team',
    primaryCta:  { label: 'Get started', href: '/signup', variant: 'primary' },
    bgColor:     '#0ea5e9',
    textScheme:  'light',
    layout:      'centered',
  },
  feature_highlights: {
    heading:   'Everything your club needs',
    columns:   3,
    displayStyle: 'card',
    items: [
      { title: 'Feature 1', description: 'Describe this feature here.', iconName: 'star' },
      { title: 'Feature 2', description: 'Describe this feature here.', iconName: 'zap' },
      { title: 'Feature 3', description: 'Describe this feature here.', iconName: 'shield' },
    ],
  },
  testimonials: {
    heading: 'What our customers say',
    columns: 3,
    displayStyle: 'grid',
    bgStyle: 'light',
    showRatings: true,
    items: [
      { quote: 'Add your customer quote here.', authorName: 'Customer Name', authorRole: 'Role', rating: 5 },
    ],
  },
  pricing_preview: {
    heading: 'Simple, transparent pricing',
    tiers: [
      {
        tierKey: 'starter', name: 'Starter', priceDisplay: 'Free',
        features: ['Up to 5 users', '1 academy', 'Basic reporting'],
        cta: { label: 'Get started free', href: '/signup', variant: 'outline' },
        isHighlighted: false,
      },
      {
        tierKey: 'pro', name: 'Pro', priceDisplay: '$29', billingPeriod: '/month',
        features: ['Up to 100 users', '3 academies', 'Advanced analytics', 'Priority support'],
        cta: { label: 'Start free trial', href: '/signup?plan=pro', variant: 'primary' },
        isHighlighted: true, badgeText: 'Most Popular',
      },
    ],
  },
  faq: {
    heading: 'Frequently asked questions',
    displayStyle: 'accordion',
    allowMultiOpen: false,
    items: [
      { question: 'How do I get started?', answer: 'Add your answer here.' },
      { question: 'What payment methods do you accept?', answer: 'Add your answer here.' },
    ],
  },
  cta: {
    heading:    'Ready to get started?',
    subheading: 'Join thousands of sports organisations on Spancle.',
    primaryCta: { label: 'Start for free', href: '/signup', variant: 'primary' },
    bgStyle:    'brand',
    layout:     'centered',
  },
};

export default function HomepageEditorPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);

  // ── Fetch homepage page ID ─────────────────────────────────────────────────

  const {
    data:      homepagePage,
    isLoading: _pageLoading,
    error:     _pageError,
  } = useQuery<{ id: string; slug: string } | null>({
    queryKey: ['homepage-page'],
    queryFn:  async () => {
      try {
        const res = await apiClient.get<{ id: string; slug: string }>('/api/v1/cms/pages/homepage');
        return res.data;
      } catch {
        // No homepage page yet — return null, user will be prompted to create one
        return null;
      }
    },
  });

  const pageId = homepagePage?.id ?? null;

  // ── Fetch all sections ──────────────────────────────────────────────────────

  const {
    data: sections = [],
    isLoading,
    error,
    refetch,
  } = useQuery<HomepageSection[]>({
    queryKey: ['homepage-sections', pageId],
    queryFn:  async () => {
      if (!pageId) return [];
      const res = await apiClient.get<HomepageSection[]>(
        `/api/v1/cms/homepage/pages/${pageId}/sections`,
      );
      return res.data;
    },
    enabled: !!pageId,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['homepage-sections', pageId] }),
    [queryClient, pageId],
  );

  const addMutation = useMutation({
    mutationFn: async (sectionType: SectionType) => {
      await apiClient.post('/api/v1/cms/homepage/sections', {
        pageId:      pageId!,
        sectionType,
        adminLabel:  `New ${sectionType.replace(/_/g, ' ')}`,
        payload:     DEFAULT_PAYLOADS[sectionType],
        status:      'draft',
      });
    },
    onSuccess: () => {
      void invalidate();
      toast({ title: 'Section added', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add section', description: err.message, intent: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id, payload, adminLabel, status,
    }: { id: string; payload: Record<string, unknown>; adminLabel: string; status: string }) => {
      await apiClient.patch(`/api/v1/cms/homepage/sections/${id}`, {
        payload, adminLabel, status,
      });
    },
    onSuccess: () => {
      void invalidate();
      setEditingSection(null);
      toast({ title: 'Section saved', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save section', description: err.message, intent: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/cms/homepage/sections/${id}`);
    },
    onSuccess: () => {
      void invalidate();
      toast({ title: 'Section deleted', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete section', description: err.message, intent: 'error' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: HomepageSection[]) => {
      await apiClient.post('/api/v1/cms/homepage/sections/reorder', {
        pageId:   pageId!,
        sections: reordered.map((s, i) => ({ id: s.id, sortOrder: i })),
      });
    },
    onSuccess: () => void invalidate(),
    onError:   (err: Error) => {
      toast({ title: 'Reorder failed', description: err.message, intent: 'error' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/v1/cms/homepage/sections/${id}`, { status: 'published' });
    },
    onSuccess: () => {
      void invalidate();
      toast({ title: 'Section published', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Publish failed', description: err.message, intent: 'error' });
    },
  });

  const publishAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ published: number }>(
        `/api/v1/cms/homepage/pages/${pageId}/publish-all`,
        {},
      );
      return res.data;
    },
    onSuccess: (data) => {
      void invalidate();
      toast({
        title:       `${data.published} section(s) published`,
        description: 'Your homepage is now live.',
        intent:      'success',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Publish all failed', description: err.message, intent: 'error' });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/cms/homepage/sections/${id}/clone`, {
        adminLabel: `Copy of ${sections.find((s) => s.id === id)?.adminLabel ?? 'section'}`,
      });
    },
    onSuccess: () => {
      void invalidate();
      toast({ title: 'Section cloned', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Clone failed', description: err.message, intent: 'error' });
    },
  });

  // ── Reorder helpers (arrow-based) ──────────────────────────────────────────

  const swap = (dir: 'up' | 'down', id: string): void => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const next = [...sections];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
    reorderMutation.mutate(next);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isBusy =
    addMutation.isPending     ||
    updateMutation.isPending  ||
    deleteMutation.isPending  ||
    reorderMutation.isPending ||
    publishMutation.isPending ||
    publishAllMutation.isPending ||
    cloneMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Homepage sections</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Build and manage your homepage content. Sections render in sortOrder.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading || isBusy}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => publishAllMutation.mutate()}
            isLoading={publishAllMutation.isPending}
            loadingText="Publishing..."
            disabled={isBusy}
          >
            Publish all drafts
          </Button>
        </div>
      </div>

      {/* Section list */}
      {isLoading ? (
        <PageLoader message="Loading sections..." />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load sections"
          message={(error as Error).message}
          retry={() => void refetch()}
        />
      ) : (
        <SectionList
          sections={sections}
          onEdit={setEditingSection}
          onDelete={(id) => deleteMutation.mutate(id)}
          onMoveUp={(id) => swap('up', id)}
          onMoveDown={(id) => swap('down', id)}
          onPublish={(id) => publishMutation.mutate(id)}
          onClone={(id) => cloneMutation.mutate(id)}
          isLoading={isBusy}
        />
      )}

      {/* Add section */}
      <SectionTypePicker
        onAdd={(type) => addMutation.mutate(type)}
        isLoading={addMutation.isPending}
      />

      {/* Edit modal */}
      <SectionForm
        section={editingSection}
        isOpen={editingSection !== null}
        onClose={() => setEditingSection(null)}
        onSave={(id, payload, adminLabel, status) =>
          updateMutation.mutateAsync({ id, payload, adminLabel, status })
        }
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}
