import React from 'react';
'use client';

import { useState } from 'react';
import { Button, Input, Badge } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import { generateSlug } from '@/lib/blog.api';
import type { BlogCategoryWithCount, CreateCategoryInput, UpdateCategoryInput } from '@/types/blog.types';

interface CategoryManagerProps {
  categories:   BlogCategoryWithCount[];
  onAdd:        (input: CreateCategoryInput) => void | Promise<void>;
  onUpdate:     (id: string, input: UpdateCategoryInput) => void | Promise<void>;
  onDelete:     (id: string) => void | Promise<void>;
  isLoading?:   boolean;
}

interface CategoryRowState {
  id:          string;
  name:        string;
  slug:        string;
  description: string;
  isEditing:   boolean;
  isSaving:    boolean;
}

interface NewCategoryState {
  name:        string;
  slug:        string;
  description: string;
  slugDirty:   boolean;
  errors:      { name?: string; slug?: string };
}

const EMPTY_NEW: NewCategoryState = {
  name:        '',
  slug:        '',
  description: '',
  slugDirty:   false,
  errors:      {},
};

/**
 * CategoryManager — inline category management table.
 *
 * Design:
 *   - Categories listed in a table with post count badges
 *   - Click "Edit" to open an inline editing row
 *   - "Add category" form at the bottom
 *   - Delete guarded: categories with posts cannot be deleted
 *     (backend enforces; frontend shows warning)
 *
 * All actions are async with loading states per row.
 */
export function CategoryManager({
  categories,
  onAdd,
  onUpdate,
  onDelete,
  isLoading = false,
}: CategoryManagerProps): React.ReactElement {
  const [rows, setRows] = useState<CategoryRowState[]>([]);
  const [newCat, setNewCat] = useState<NewCategoryState>(EMPTY_NEW);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Inline edit helpers ────────────────────────────────────────────────────

  const startEdit = (cat: BlogCategoryWithCount): void => {
    setRows((prev) => {
      const exists = prev.find((r) => r.id === cat.id);
      if (exists) return prev.map((r) => r.id === cat.id ? { ...r, isEditing: true } : r);
      return [
        ...prev,
        { id: cat.id, name: cat.name, slug: cat.slug, description: cat.description ?? '', isEditing: true, isSaving: false },
      ];
    });
  };

  const cancelEdit = (id: string): void => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const saveEdit = async (id: string): Promise<void> => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    setRows((prev) => prev.map((r) => r.id === id ? { ...r, isSaving: true } : r));
    try {
      await onUpdate(id, { name: row.name, slug: row.slug, description: row.description || undefined });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, isSaving: false } : r));
    }
  };

  const setRowField = (id: string, field: keyof Pick<CategoryRowState, 'name' | 'slug' | 'description'>, val: string): void => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: val } : r));
  };

  // ── New category helpers ───────────────────────────────────────────────────

  const setNew = <K extends keyof NewCategoryState>(key: K, val: NewCategoryState[K]): void => {
    setNewCat((prev) => ({ ...prev, [key]: val, errors: { ...prev.errors, [key]: undefined } }));
  };

  const handleNewNameChange = (name: string): void => {
    setNew('name', name);
    if (!newCat.slugDirty) {
      setNewCat((prev) => ({ ...prev, name, slug: generateSlug(name), errors: {} }));
    }
  };

  const validateNew = (): boolean => {
    const errs: NewCategoryState['errors'] = {};
    if (!newCat.name.trim()) errs.name = 'Name is required';
    if (!newCat.slug.trim()) errs.slug = 'Slug is required';
    if (newCat.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newCat.slug))
      errs.slug = 'Lowercase alphanumeric and hyphens only';
    if (categories.some((c) => c.slug === newCat.slug))
      errs.slug = 'This slug is already taken';
    setNewCat((prev) => ({ ...prev, errors: errs }));
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async (): Promise<void> => {
    if (!validateNew()) return;
    setIsAdding(true);
    try {
      await onAdd({ name: newCat.name, slug: newCat.slug, description: newCat.description || undefined });
      setNewCat(EMPTY_NEW);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (cat: BlogCategoryWithCount): Promise<void> => {
    if (cat.postCount > 0) return; // Guarded by UI — backend also enforces
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    setDeletingId(cat.id);
    try {
      await onDelete(cat.id);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Category table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {categories.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No categories yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first category below</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100" aria-label="Blog categories">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Posts</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => {
                const row = rows.find((r) => r.id === cat.id);
                const isEditingThis = row?.isEditing ?? false;

                return (
                  <tr key={cat.id} className={cn(isEditingThis && 'bg-primary-50')}>
                    <td className="px-4 py-3">
                      {isEditingThis && row ? (
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => setRowField(cat.id, 'name', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {isEditingThis && row ? (
                        <input
                          type="text"
                          value={row.slug}
                          onChange={(e) => setRowField(cat.id, 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-xs font-mono text-gray-500">{cat.slug}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge intent={cat.postCount > 0 ? 'info' : 'default'} size="sm">
                        {cat.postCount}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditingThis && row ? (
                          <>
                            <Button
                              size="xs"
                              onClick={() => void saveEdit(cat.id)}
                              isLoading={row.isSaving}
                              loadingText="Saving…"
                              disabled={isLoading}
                            >
                              Save
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => cancelEdit(cat.id)}
                              disabled={row.isSaving}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => startEdit(cat)}
                              disabled={isLoading}
                            >
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              className={cn(
                                cat.postCount > 0
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-500 hover:bg-red-50 hover:text-red-600',
                              )}
                              onClick={() => void handleDelete(cat)}
                              disabled={isLoading || deletingId === cat.id || cat.postCount > 0}
                              title={cat.postCount > 0 ? 'Cannot delete — has posts' : 'Delete category'}
                            >
                              {deletingId === cat.id ? 'Deleting…' : 'Delete'}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add new category */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Add category</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <Input
              label="Name"
              placeholder="e.g. Coaching Tips"
              value={newCat.name}
              onChange={(e) => handleNewNameChange(e.target.value)}
              error={newCat.errors.name}
            />
          </div>
          <div>
            <Input
              label="Slug"
              placeholder="coaching-tips"
              value={newCat.slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                setNew('slugDirty', true as unknown as NewCategoryState['slugDirty']);
                setNew('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
              }}
              error={newCat.errors.slug}
              className="font-mono text-sm"
            />
          </div>
          <Button
            onClick={() => void handleAdd()}
            isLoading={isAdding}
            loadingText="Adding…"
            disabled={isLoading}
            className="h-10"
          >
            Add category
          </Button>
        </div>
      </div>
    </div>
  );
}
