'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PricingRuleForm } from '@/components/pricing/pricing-rule-form';
import { createPricingRule, pricingKeys } from '@/lib/pricing.api';

export default function NewPricingRulePage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createPricingRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.all() });
      router.push('/pricing');
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <a href="/pricing" className="hover:text-gray-600 transition-colors">Pricing Rules</a>
          <span>/</span>
          <span className="text-gray-600 font-medium">New rule</span>
        </nav>
        <h2 className="text-lg font-semibold text-gray-900">New pricing rule</h2>
      </div>
      {mutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {(mutation.error as Error).message ?? 'Failed to create pricing rule.'}
        </div>
      )}
      <PricingRuleForm
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Create rule"
      />
    </div>
  );
}
