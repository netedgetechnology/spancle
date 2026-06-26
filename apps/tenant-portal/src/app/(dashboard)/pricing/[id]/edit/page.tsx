'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PricingRuleForm } from '@/components/pricing/pricing-rule-form';
import { fetchPricingRule, updatePricingRule, pricingKeys } from '@/lib/pricing.api';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';

export default function EditPricingRulePage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data: rule, isLoading, error, refetch } = useQuery({
    queryKey: pricingKeys.detail(id),
    queryFn:  () => fetchPricingRule(id),
    enabled:  !!id,
  });

  const mutation = useMutation({
    mutationFn: (v: Parameters<typeof updatePricingRule>[1]) => updatePricingRule(id, v),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.all() });
      router.push('/pricing');
    },
  });

  if (isLoading) return <PageLoader message="Loading rule…" />;
  if (error || !rule) return (
    <ErrorDisplay title="Failed to load rule" message={(error as Error)?.message ?? ''} retry={() => void refetch()} />
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <a href="/pricing" className="hover:text-gray-600 transition-colors">Pricing Rules</a>
          <span>/</span>
          <span className="text-gray-600 font-medium">Edit</span>
        </nav>
        <h2 className="text-lg font-semibold text-gray-900">Edit: {rule.name}</h2>
      </div>
      {mutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {(mutation.error as Error).message ?? 'Failed to save.'}
        </div>
      )}
      <PricingRuleForm
        initial={rule}
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Save changes"
      />
    </div>
  );
}
