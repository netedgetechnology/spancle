/**
 * template-renderer.service.spec.ts
 *
 * Tests for TemplateRenderer: pure helpers and the full lookup/render pipeline.
 *
 * Strategy:
 *   - flattenVariables() and render() are pure functions — tested without mocking.
 *   - TemplateRenderer.resolve() depends on DataSource (TypeORM).
 *     We inject a stub DataSource whose getRepository() returns a mock repo
 *     whose findOne() we control per test.
 *
 * Covers:
 *   ✓ flattenVariables — flat, nested, null values, depth limit
 *   ✓ render — substitution, unknown keys left in-place, multiple occurrences
 *   ✓ resolve — tier 1 (tenant override)
 *   ✓ resolve — tier 2 (system + requested locale)
 *   ✓ resolve — tier 3 (system + 'en' fallback when locale not found)
 *   ✓ resolve — returns null when nothing found
 *   ✓ resolve — renders subject, bodyHtml, bodyText with variables
 *   ✓ resolve — system tenantId skips tier 1
 *   ✓ renderString — standalone substitution
 */

import {
  TemplateRenderer,
  flattenVariables,
  render,
  type TemplateVariables,
} from '../services/template-renderer.service';
import type { TemplateEntity } from '../entities/template.entity';
import type { DataSource }     from 'typeorm';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<TemplateEntity> = {}): TemplateEntity {
  return {
    id:         'tmpl-uuid-0001',
    tenantId:   'system',
    name:       'Test Template',
    slug:       'booking_confirmed_email',
    channel:    'email',
    locale:     'en',
    subject:    'Booking {{booking.reference}} confirmed',
    bodyHtml:   '<p>Hi {{customer.name}}!</p>',
    bodyText:   'Hi {{customer.name}}!',
    variables:  {},
    isDeleted:  false,
    createdAt:  new Date(),
    updatedAt:  new Date(),
    deletedAt:  null,
    ...overrides,
  };
}

/**
 * Builds a TemplateRenderer with a stub DataSource.
 * findOneResponses: array of results returned per call in order.
 *   null  → findOne returns null (not found)
 *   entity → findOne returns that entity
 */
function makeRenderer(
  findOneResponses: (TemplateEntity | null)[],
): TemplateRenderer {
  let callIndex = 0;
  const mockRepo = {
    findOne: jest.fn().mockImplementation(() => {
      const response = findOneResponses[callIndex] ?? null;
      callIndex++;
      return Promise.resolve(response);
    }),
  };
  const mockDs = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
  } as unknown as DataSource;

  return new TemplateRenderer(mockDs);
}

// ── Pure helper tests ─────────────────────────────────────────────────────────

describe('flattenVariables()', () => {
  it('passes flat maps through unchanged', () => {
    const input  = { 'customer.name': 'Alice', 'booking.reference': 'BK-001' };
    const result = flattenVariables(input);
    expect(result['customer.name']).toBe('Alice');
    expect(result['booking.reference']).toBe('BK-001');
  });

  it('flattens one level of nesting', () => {
    const result = flattenVariables({ customer: { name: 'Bob' } });
    expect(result['customer.name']).toBe('Bob');
  });

  it('flattens two levels of nesting', () => {
    const result = flattenVariables({ booking: { venue: { name: 'Centre Court' } } });
    expect(result['booking.venue.name']).toBe('Centre Court');
  });

  it('converts non-string values to strings', () => {
    const result = flattenVariables({ count: 42, active: true });
    expect(result['count']).toBe('42');
    expect(result['active']).toBe('true');
  });

  it('converts null values to empty string', () => {
    const result = flattenVariables({ field: null });
    expect(result['field']).toBe('');
  });

  it('handles empty object', () => {
    expect(flattenVariables({})).toEqual({});
  });

  it('does not exceed depth limit', () => {
    // 6 levels deep — the 6th level should be ignored
    const deep = { a: { b: { c: { d: { e: { f: { g: 'too deep' } } } } } } };
    const result = flattenVariables(deep as Record<string, unknown>);
    expect(result['a.b.c.d.e.f.g']).toBeUndefined();
  });
});

describe('render()', () => {
  it('substitutes a single placeholder', () => {
    expect(render('Hello {{name}}!', { name: 'Alice' })).toBe('Hello Alice!');
  });

  it('substitutes multiple different placeholders', () => {
    const result = render('{{greeting}}, {{customer.name}}!', {
      greeting:      'Hi',
      'customer.name': 'Bob',
    });
    expect(result).toBe('Hi, Bob!');
  });

  it('leaves unknown placeholders in-place', () => {
    const result = render('Hello {{customer.name}}!', {});
    expect(result).toBe('Hello {{customer.name}}!');
  });

  it('substitutes the same placeholder multiple times', () => {
    const result = render('{{ref}} and {{ref}}', { ref: 'BK-001' });
    expect(result).toBe('BK-001 and BK-001');
  });

  it('handles empty variable map', () => {
    expect(render('No vars here.', {})).toBe('No vars here.');
  });

  it('handles empty template string', () => {
    expect(render('', { key: 'value' })).toBe('');
  });

  it('handles template with no placeholders', () => {
    expect(render('Hello world!', { name: 'Alice' })).toBe('Hello world!');
  });

  it('substitutes dot-path placeholders', () => {
    expect(render('{{booking.reference}}', { 'booking.reference': 'BK-42' })).toBe('BK-42');
  });
});

// ── TemplateRenderer.resolve() ────────────────────────────────────────────────

describe('TemplateRenderer', () => {
  const SLUG    = 'booking_confirmed_email';
  const CHANNEL = 'email';
  const TENANT  = 'tenant-aaa-bbb-ccc-ddd';

  describe('resolve() — fallback chain', () => {
    it('returns tier 1 (tenant override) when found', async () => {
      const tenantTemplate = makeTemplate({ tenantId: TENANT, locale: 'en' });
      // First findOne (tier 1) returns the tenant template
      const renderer = makeRenderer([tenantTemplate]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL });

      expect(result).not.toBeNull();
      expect(result!.resolvedTenantId).toBe(TENANT);
    });

    it('falls back to tier 2 (system + locale) when tier 1 not found', async () => {
      const systemLocale = makeTemplate({ tenantId: 'system', locale: 'fr' });
      // tier1=null, tier2=systemLocale
      const renderer = makeRenderer([null, systemLocale]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL, locale: 'fr' });

      expect(result).not.toBeNull();
      expect(result!.resolvedTenantId).toBe('system');
      expect(result!.resolvedLocale).toBe('fr');
    });

    it('falls back to tier 3 (system + en) when tier 1 and tier 2 not found', async () => {
      const systemEn = makeTemplate({ tenantId: 'system', locale: 'en' });
      // tier1=null, tier2=null, tier3=systemEn
      const renderer = makeRenderer([null, null, systemEn]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL, locale: 'fr' });

      expect(result).not.toBeNull();
      expect(result!.resolvedTenantId).toBe('system');
      expect(result!.resolvedLocale).toBe('en');
    });

    it('returns null when no template exists in any tier', async () => {
      const renderer = makeRenderer([null, null, null]);
      const result   = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL });
      expect(result).toBeNull();
    });

    it('skips tier 1 when tenantId is "system"', async () => {
      const systemEn = makeTemplate({ tenantId: 'system', locale: 'en' });
      // When tenantId='system', tier 1 is skipped → first call is tier 2
      const renderer = makeRenderer([systemEn]);

      const result = await renderer.resolve({
        tenantId: 'system',
        slug:     SLUG,
        channel:  CHANNEL,
        locale:   'en',
      });

      expect(result).not.toBeNull();
      // Only one findOne call (tier 2, not tier 1 + tier 2)
      expect((renderer as unknown as { ds: { getRepository: jest.Mock } })
        .ds.getRepository()
        .findOne as jest.Mock
      ).toHaveBeenCalledTimes(1);
    });

    it('skips tier 3 when locale is already "en"', async () => {
      // tier1=null, tier2=null → should return null (no tier3 for en→en)
      const renderer = makeRenderer([null, null]);
      const result   = await renderer.resolve({
        tenantId: TENANT, slug: SLUG, channel: CHANNEL, locale: 'en',
      });
      expect(result).toBeNull();
    });
  });

  describe('resolve() — variable substitution', () => {
    const VARS: TemplateVariables = {
      customer:  { name: 'Alice' },
      booking:   { reference: 'BK-20250101-001' },
      venue:     { name: 'Wimbledon Centre Court' },
    };

    it('substitutes variables in subject', async () => {
      const tmpl = makeTemplate({ subject: 'Booking {{booking.reference}} confirmed' });
      const renderer = makeRenderer([tmpl]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL }, VARS);

      expect(result!.subject).toBe('Booking BK-20250101-001 confirmed');
    });

    it('substitutes variables in bodyHtml', async () => {
      const tmpl = makeTemplate({ bodyHtml: '<p>Hi {{customer.name}}!</p>' });
      const renderer = makeRenderer([tmpl]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL }, VARS);

      expect(result!.bodyHtml).toBe('<p>Hi Alice!</p>');
    });

    it('substitutes variables in bodyText', async () => {
      const tmpl = makeTemplate({ bodyText: 'Hi {{customer.name}}, ref: {{booking.reference}}' });
      const renderer = makeRenderer([tmpl]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL }, VARS);

      expect(result!.bodyText).toBe('Hi Alice, ref: BK-20250101-001');
    });

    it('leaves unknown placeholders in-place', async () => {
      const tmpl = makeTemplate({ subject: 'Hi {{unknown.field}}' });
      const renderer = makeRenderer([tmpl]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL }, VARS);

      expect(result!.subject).toBe('Hi {{unknown.field}}');
    });

    it('returns null subject/html/text when template fields are null', async () => {
      const tmpl = makeTemplate({ subject: null, bodyHtml: null, bodyText: null });
      const renderer = makeRenderer([tmpl]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL }, VARS);

      expect(result!.subject).toBeNull();
      expect(result!.bodyHtml).toBeNull();
      expect(result!.bodyText).toBeNull();
    });

    it('handles flat variable map (no nesting)', async () => {
      const tmpl = makeTemplate({ subject: '{{name}}' });
      const renderer = makeRenderer([tmpl]);

      const result = await renderer.resolve(
        { tenantId: TENANT, slug: SLUG, channel: CHANNEL },
        { name: 'Bob' },
      );

      expect(result!.subject).toBe('Bob');
    });

    it('defaults locale to "en" when not provided', async () => {
      const tmpl = makeTemplate({ locale: 'en' });
      const renderer = makeRenderer([tmpl]);

      const result = await renderer.resolve({ tenantId: TENANT, slug: SLUG, channel: CHANNEL });

      expect(result).not.toBeNull();
      expect(result!.resolvedLocale).toBe('en');
    });
  });

  describe('renderString()', () => {
    it('substitutes variables in an arbitrary string', () => {
      const renderer = makeRenderer([]);
      const result   = renderer.renderString('Hello {{customer.name}}!', {
        customer: { name: 'Carol' },
      });
      expect(result).toBe('Hello Carol!');
    });

    it('returns original string when no variables match', () => {
      const renderer = makeRenderer([]);
      expect(renderer.renderString('No vars here')).toBe('No vars here');
    });
  });
});
