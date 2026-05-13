/**
 * court.types.ts — Frontend type definitions for court management.
 * Mirrors backend CourtEntity exactly.
 */
import type { WeeklyTimings } from './branch.types';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type CourtStatus  = 'available' | 'unavailable' | 'maintenance' | 'retired';
export type CourtType    = 'indoor' | 'outdoor';
export type SurfaceType  =
  | 'grass' | 'artificial_grass' | 'hard_court' | 'clay'
  | 'carpet' | 'wood' | 'rubber' | 'sand' | 'water' | 'ice' | 'other';

// ── Display config ────────────────────────────────────────────────────────────

export const COURT_STATUS_CONFIG: Record<CourtStatus, {
  label:  string;
  bg:     string;
  text:   string;
  dot:    string;
  ring:   string;
}> = {
  available:   { label: 'Available',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  unavailable: { label: 'Unavailable', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   ring: 'ring-amber-200'   },
  maintenance: { label: 'Maintenance', bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     ring: 'ring-red-200'     },
  retired:     { label: 'Retired',     bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    ring: 'ring-gray-200'    },
};

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  grass:            'Grass',
  artificial_grass: 'Artificial Grass',
  hard_court:       'Hard Court',
  clay:             'Clay',
  carpet:           'Carpet',
  wood:             'Wood',
  rubber:           'Rubber',
  sand:             'Sand',
  water:            'Water',
  ice:              'Ice',
  other:            'Other',
};

export const COURT_TYPE_LABELS: Record<CourtType, string> = {
  indoor:  'Indoor',
  outdoor: 'Outdoor',
};

export const SURFACE_TYPE_OPTIONS: { value: SurfaceType; label: string }[] = [
  { value: 'grass',            label: 'Grass'            },
  { value: 'artificial_grass', label: 'Artificial Grass' },
  { value: 'hard_court',       label: 'Hard Court'       },
  { value: 'clay',             label: 'Clay'             },
  { value: 'carpet',           label: 'Carpet'           },
  { value: 'wood',             label: 'Wood'             },
  { value: 'rubber',           label: 'Rubber'           },
  { value: 'sand',             label: 'Sand'             },
  { value: 'water',            label: 'Water'            },
  { value: 'ice',              label: 'Ice'              },
  { value: 'other',            label: 'Other'            },
];

// ── Entity mirror ─────────────────────────────────────────────────────────────

export interface Court {
  id:                     string;
  tenantId:               string;
  branchId:               string;
  sportId:                string | null;
  name:                   string;
  code:                   string | null;
  description:            string | null;
  courtType:              CourtType;
  surfaceType:            SurfaceType;
  capacity:               number | null;
  maxBookingsConcurrent:  number;
  dimensions:             string | null;
  status:                 CourtStatus;
  maintenanceNote:        string | null;
  maintenanceStartedAt:   string | null;
  maintenanceExpectedEnd: string | null;
  operatingHours:         WeeklyTimings | null;
  courtNumber:            number | null;
  sortOrder:              number;
  imageUrl:               string | null;
  amenities:              string[] | null;
  hourlyRateMinor:        number | null;
  isDeleted:              boolean;
  createdAt:              string;
  updatedAt:              string;
}

// ── Generate result ───────────────────────────────────────────────────────────

export interface GenerateCourtsResult {
  courts:  Court[];
  created: number;
  skipped: number;
}

// ── Form values ───────────────────────────────────────────────────────────────

export interface CourtFormValues {
  branchId:              string;
  sportId:               string;
  name:                  string;
  code:                  string;
  description:           string;
  courtType:             CourtType;
  surfaceType:           SurfaceType;
  capacity:              string;
  maxBookingsConcurrent: string;
  dimensions:            string;
  status:                CourtStatus;
  operatingHours:        WeeklyTimings | null;
  sortOrder:             number;
  imageUrl:              string;
  amenities:             string;
  hourlyRateMinor:       string;
}

export interface GenerateFormValues {
  branchId:      string;
  sportId:       string;
  namePrefix:    string;
  separator:     string;
  startNumber:   number;
  count:         number;
  courtType:     CourtType;
  surfaceType:   SurfaceType;
  capacity:      string;
  useCustomHours: boolean;
  operatingHours: WeeklyTimings | null;
}

export const EMPTY_COURT_FORM: CourtFormValues = {
  branchId: '', sportId: '', name: '', code: '', description: '',
  courtType: 'indoor', surfaceType: 'hard_court',
  capacity: '', maxBookingsConcurrent: '1', dimensions: '',
  status: 'available', operatingHours: null,
  sortOrder: 0, imageUrl: '', amenities: '', hourlyRateMinor: '',
};

export function courtToFormValues(court: Court): CourtFormValues {
  return {
    branchId:              court.branchId,
    sportId:               court.sportId               ?? '',
    name:                  court.name,
    code:                  court.code                  ?? '',
    description:           court.description           ?? '',
    courtType:             court.courtType,
    surfaceType:           court.surfaceType,
    capacity:              court.capacity              != null ? String(court.capacity)              : '',
    maxBookingsConcurrent: String(court.maxBookingsConcurrent),
    dimensions:            court.dimensions             ?? '',
    status:                court.status,
    operatingHours:        court.operatingHours,
    sortOrder:             court.sortOrder,
    imageUrl:              court.imageUrl               ?? '',
    amenities:             court.amenities?.join(', ')  ?? '',
    hourlyRateMinor:       court.hourlyRateMinor        != null ? String(court.hourlyRateMinor) : '',
  };
}

export function formValuesToPayload(form: Partial<CourtFormValues>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const opt = (v: string | undefined) => v?.trim() || null;
  const num = (v: string | undefined) => {
    if (!v?.trim()) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  };

  if (form.branchId      !== undefined) p['branchId']     = form.branchId;
  if (form.sportId       !== undefined) p['sportId']      = form.sportId?.trim() || null;
  if (form.name          !== undefined) p['name']         = form.name.trim();
  if (form.code          !== undefined) p['code']         = opt(form.code);
  if (form.description   !== undefined) p['description']  = opt(form.description);
  if (form.courtType     !== undefined) p['courtType']    = form.courtType;
  if (form.surfaceType   !== undefined) p['surfaceType']  = form.surfaceType;
  if (form.dimensions    !== undefined) p['dimensions']   = opt(form.dimensions);
  if (form.status        !== undefined) p['status']       = form.status;
  if (form.operatingHours !== undefined) p['operatingHours'] = form.operatingHours;
  if (form.sortOrder     !== undefined) p['sortOrder']    = form.sortOrder;
  if (form.imageUrl      !== undefined) p['imageUrl']     = opt(form.imageUrl);
  if (form.amenities     !== undefined) {
    p['amenities'] = form.amenities?.trim()
      ? form.amenities.split(',').map((s) => s.trim()).filter(Boolean)
      : null;
  }

  const cap  = num(form.capacity);
  const mbc  = num(form.maxBookingsConcurrent);
  const rate = num(form.hourlyRateMinor);
  if (cap  !== undefined) p['capacity']              = cap;
  if (mbc  !== undefined) p['maxBookingsConcurrent'] = mbc;
  if (rate !== undefined) p['hourlyRateMinor']       = rate;

  return p;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatRate(minorUnits: number | null, currency = 'GBP'): string {
  if (minorUnits == null) return 'Default rate';
  if (minorUnits === 0)   return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(minorUnits / 100) + '/hr';
}

export function courtTypeIcon(type: CourtType): string {
  return type === 'indoor' ? '🏢' : '🌳';
}
