/**
 * sport.types.ts — Frontend type definitions for the sport management module.
 * Mirrors backend SportEntity, SportBranchEntity, and SportResponse exactly.
 */

// ── Status ────────────────────────────────────────────────────────────────────

export type SportStatus = 'active' | 'inactive';

export const SPORT_STATUS_CONFIG: Record<SportStatus, {
  label:  string;
  bg:     string;
  text:   string;
  dot:    string;
  ring:   string;
}> = {
  active:   { label: 'Active',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400',    ring: 'ring-gray-200'    },
};

// ── Sport ─────────────────────────────────────────────────────────────────────

/** Sport-specific configuration — common keys, all optional */
export interface SportConfig {
  teamSize?:            number;
  minPlayers?:          number;
  maxPlayers?:          number;
  sessionDurationMins?: number;
  ageGroups?:           string[];
  equipment?:           string[];
  scoringSystem?:       string;
  notes?:               string;
  [key: string]:        unknown;
}

/** Full sport response from API — includes branchIds from join table */
export interface Sport {
  id:          string;
  tenantId:    string;
  name:        string;
  slug:        string;
  description: string | null;
  icon:        string | null;
  color:       string | null;
  config:      SportConfig;
  status:      SportStatus;
  sortOrder:   number;
  isDeleted:   boolean;
  createdAt:   string;
  updatedAt:   string;
  /** Branch IDs this sport is assigned to (from sport_branches join) */
  branchIds:   string[];
}

// ── Form values ───────────────────────────────────────────────────────────────

export interface SportFormValues {
  name:                string;
  slug:                string;
  description:         string;
  icon:                string;
  color:               string;
  status:              SportStatus;
  sortOrder:           number;
  branchIds:           string[];
  // Config fields (flattened for form inputs)
  teamSize:            string;
  minPlayers:          string;
  maxPlayers:          string;
  sessionDurationMins: string;
  ageGroups:           string;   // comma-separated
  equipment:           string;   // comma-separated
  scoringSystem:       string;
  configNotes:         string;
}

export const EMPTY_FORM: SportFormValues = {
  name: '', slug: '', description: '', icon: '', color: '#3b82f6',
  status: 'active', sortOrder: 0, branchIds: [],
  teamSize: '', minPlayers: '', maxPlayers: '',
  sessionDurationMins: '', ageGroups: '', equipment: '',
  scoringSystem: '', configNotes: '',
};

export function sportToFormValues(sport: Sport): SportFormValues {
  const c = sport.config;
  return {
    name:        sport.name,
    slug:        sport.slug,
    description: sport.description ?? '',
    icon:        sport.icon        ?? '',
    color:       sport.color       ?? '#3b82f6',
    status:      sport.status,
    sortOrder:   sport.sortOrder,
    branchIds:   sport.branchIds,
    teamSize:            c.teamSize            != null ? String(c.teamSize)            : '',
    minPlayers:          c.minPlayers          != null ? String(c.minPlayers)          : '',
    maxPlayers:          c.maxPlayers          != null ? String(c.maxPlayers)          : '',
    sessionDurationMins: c.sessionDurationMins != null ? String(c.sessionDurationMins) : '',
    ageGroups:   Array.isArray(c.ageGroups)  ? (c.ageGroups as string[]).join(', ')  : '',
    equipment:   Array.isArray(c.equipment)  ? (c.equipment as string[]).join(', ')  : '',
    scoringSystem: typeof c.scoringSystem === 'string' ? c.scoringSystem : '',
    configNotes:   typeof c.notes         === 'string' ? c.notes          : '',
  };
}

/**
 * Converts SportFormValues to the API payload shape.
 * Config fields are assembled back into a config object.
 */
export function formValuesToPayload(form: Partial<SportFormValues>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (form.name        !== undefined) payload['name']        = form.name.trim();
  if (form.slug        !== undefined) payload['slug']        = form.slug.trim().toLowerCase();
  if (form.description !== undefined) payload['description'] = form.description.trim() || null;
  if (form.icon        !== undefined) payload['icon']        = form.icon.trim()        || null;
  if (form.color       !== undefined) payload['color']       = form.color.trim()       || null;
  if (form.status      !== undefined) payload['status']      = form.status;
  if (form.sortOrder   !== undefined) payload['sortOrder']   = form.sortOrder;
  if (form.branchIds   !== undefined) payload['branchIds']   = form.branchIds;

  // Assemble config from flattened form fields
  const hasConfigFields = [
    'teamSize', 'minPlayers', 'maxPlayers', 'sessionDurationMins',
    'ageGroups', 'equipment', 'scoringSystem', 'configNotes',
  ].some((k) => form[k as keyof SportFormValues] !== undefined);

  if (hasConfigFields) {
    const config: Record<string, unknown> = {};
    const n = (v: string | undefined) => {
      if (v === undefined || v.trim() === '') return undefined;
      const parsed = Number(v);
      return isNaN(parsed) ? undefined : parsed;
    };
    const list = (v: string | undefined) =>
      v?.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

    const teamSize            = n(form.teamSize);
    const minPlayers          = n(form.minPlayers);
    const maxPlayers          = n(form.maxPlayers);
    const sessionDurationMins = n(form.sessionDurationMins);
    const ageGroups           = list(form.ageGroups);
    const equipment           = list(form.equipment);

    if (teamSize            != null) config['teamSize']            = teamSize;
    if (minPlayers          != null) config['minPlayers']          = minPlayers;
    if (maxPlayers          != null) config['maxPlayers']          = maxPlayers;
    if (sessionDurationMins != null) config['sessionDurationMins'] = sessionDurationMins;
    if (ageGroups           != null) config['ageGroups']           = ageGroups;
    if (equipment           != null) config['equipment']           = equipment;
    if (form.scoringSystem?.trim())  config['scoringSystem']       = form.scoringSystem.trim();
    if (form.configNotes?.trim())    config['notes']               = form.configNotes.trim();

    payload['config'] = config;
  }

  return payload;
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** Predefined sport palette for the colour picker */
export const SPORT_COLORS = [
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Green',   value: '#10b981' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Purple',  value: '#8b5cf6' },
  { label: 'Pink',    value: '#ec4899' },
  { label: 'Yellow',  value: '#eab308' },
  { label: 'Teal',    value: '#14b8a6' },
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Gray',    value: '#6b7280' },
];

/** Common sport icon suggestions */
export const SPORT_ICON_PRESETS = [
  { label: 'Football',    value: '⚽' },
  { label: 'Rugby',       value: '🏉' },
  { label: 'Basketball',  value: '🏀' },
  { label: 'Tennis',      value: '🎾' },
  { label: 'Cricket',     value: '🏏' },
  { label: 'Swimming',    value: '🏊' },
  { label: 'Athletics',   value: '🏃' },
  { label: 'Cycling',     value: '🚴' },
  { label: 'Badminton',   value: '🏸' },
  { label: 'Golf',        value: '⛳' },
  { label: 'Boxing',      value: '🥊' },
  { label: 'Gymnastics',  value: '🤸' },
  { label: 'Hockey',      value: '🏑' },
  { label: 'Volleyball',  value: '🏐' },
  { label: 'Martial Arts', value: '🥋' },
];

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
