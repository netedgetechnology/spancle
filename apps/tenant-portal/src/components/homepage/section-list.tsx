'use client';

import { Badge, Button } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { HomepageSection } from '@/types/homepage.types';
import { type SectionType } from '@/types/homepage.types';

interface SectionListProps {
  sections:   HomepageSection[];
  onEdit:     (section: HomepageSection) => void;
  onDelete:   (id: string) => void;
  onMoveUp:   (id: string) => void;
  onMoveDown: (id: string) => void;
  onPublish:  (id: string) => void;
  onClone:    (id: string) => void;
  isLoading?: boolean;
}

const STATUS_INTENT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  published: 'success',
  draft:     'warning',
  archived:  'danger',
};

const SECTION_LABELS: Record<SectionType, string> = {
  hero_banner:        'Hero Banner',
  feature_highlights: 'Feature Highlights',
  testimonials:       'Testimonials',
  pricing_preview:    'Pricing Preview',
  faq:               'FAQ',
  cta:               'Call to Action',
};

/**
 * SectionList — displays all homepage sections in sortOrder.
 *
 * Each row shows:
 *   - Section type label + admin label
 *   - Status badge (draft / published / archived)
 *   - Visibility indicator
 *   - Reorder arrows (up / down)
 *   - Edit / Clone / Delete actions
 *
 * Drag-and-drop reorder is planned for Sprint 3 (react-dnd).
 * Arrow-based reorder is the current implementation.
 */
export function SectionList({
  sections,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onPublish,
  onClone,
  isLoading = false,
}: SectionListProps): React.ReactElement {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
        <p className="text-sm font-medium text-gray-500">No sections yet</p>
        <p className="text-xs text-gray-400 mt-1">Add a section using the picker below</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Homepage sections">
      {sections.map((section, index) => (
        <li
          key={section.id}
          className={cn(
            'flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm',
            'transition-shadow duration-150 hover:shadow-md',
            section.status === 'archived' && 'opacity-60',
          )}
        >
          {/* Sort order */}
          <span className="flex-shrink-0 w-6 text-center text-xs font-mono text-gray-400">
            {index + 1}
          </span>

          {/* Reorder controls */}
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onMoveUp(section.id)}
              disabled={index === 0 || isLoading}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              aria-label="Move section up"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(section.id)}
              disabled={index === sections.length - 1 || isLoading}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              aria-label="Move section down"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Section info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900 truncate">
                {section.adminLabel}
              </span>
              <span className="text-xs text-gray-400 truncate">
                {SECTION_LABELS[section.sectionType] ?? section.sectionType}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge intent={((STATUS_INTENT as Record<string, string>)[section.status ?? ""] ?? "default") as "default" | "success" | "danger" | "warning" | "primary" | "info"} size="sm" dot>
                {section.status}
              </Badge>
              {!section.isVisible && (
                <Badge intent="default" size="sm">hidden</Badge>
              )}
              {section.abVariant && (
                <Badge intent="info" size="sm">A/B: {section.abVariant}</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {section.status === 'draft' && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onPublish(section.id)}
                disabled={isLoading}
              >
                Publish
              </Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onEdit(section)}
              disabled={isLoading}
            >
              Edit
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onClone(section.id)}
              disabled={isLoading}
            >
              Clone
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => onDelete(section.id)}
              disabled={isLoading}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
