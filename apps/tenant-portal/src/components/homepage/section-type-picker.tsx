'use client';

import { useState } from 'react';
import { Button, Select } from '@spancle/ui-kit';
import { SECTION_TYPES, type SectionType } from '@/types/homepage.types';

interface SectionTypePickerProps {
  onAdd:      (type: SectionType) => void;
  isLoading?: boolean;
}

const SECTION_TYPE_META: Record<SectionType, { label: string; description: string }> = {
  hero_banner:        { label: 'Hero Banner',          description: 'Full-width headline, CTA and background image' },
  feature_highlights: { label: 'Feature Highlights',   description: 'Grid of feature cards with icons and descriptions' },
  testimonials:       { label: 'Testimonials',          description: 'Customer quotes and star ratings' },
  pricing_preview:    { label: 'Pricing Preview',       description: 'Tiered pricing cards with feature lists' },
  faq:               { label: 'FAQ',                   description: 'Accordion of questions and answers' },
  cta:               { label: 'Call to Action',        description: 'Bold section with primary and secondary CTA buttons' },
};

/**
 * SectionTypePicker — allows admins to select and add a new homepage section.
 * Renders a Select dropdown + Add button.
 */
export function SectionTypePicker({
  onAdd,
  isLoading = false,
}: SectionTypePickerProps): React.ReactElement {
  const [selected, setSelected] = useState<SectionType>('hero_banner');

  const options = SECTION_TYPES.map((type) => ({
    value: type,
    label: SECTION_TYPE_META[type].label,
  }));

  const meta = SECTION_TYPE_META[selected];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-700">Add a section</p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Select
            options={options}
            value={selected}
            onValueChange={(v: string) => setSelected(v as SectionType)}
            label="Section type"
          />
        </div>
        <Button
          onClick={() => onAdd(selected)}
          disabled={isLoading}
          isLoading={isLoading}
          loadingText="Adding..."
          size="md"
        >
          Add section
        </Button>
      </div>

      <p className="text-xs text-gray-500">{meta.description}</p>
    </div>
  );
}
