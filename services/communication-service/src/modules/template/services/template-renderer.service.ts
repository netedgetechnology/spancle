import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource }  from '@nestjs/typeorm';
import { DataSource }        from 'typeorm';
import { TemplateEntity }    from '../entities/template.entity';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Flat or dot-path-keyed variable map for template substitution. */
export type TemplateVariables = Record<string, unknown>;

export interface RenderedTemplate {
  subject:  string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  /** The template that was resolved (useful for debugging). */
  resolvedSlug:    string;
  resolvedLocale:  string;
  resolvedTenantId: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * TemplateRenderer
 *
 * Resolves a template by (tenantId, slug, channel, locale) with a
 * three-tier fallback chain, then substitutes {{variable}} placeholders.
 *
 * Fallback chain (first match wins):
 *   1. Tenant-specific override  — tenantId = <real UUID>, locale = <requested>
 *   2. System default for locale — tenantId = 'system',   locale = <requested>
 *   3. System English default    — tenantId = 'system',   locale = 'en'
 *
 * Variable substitution:
 *   Syntax: {{dot.path}}
 *   The variable map may be flat ({ "customer.name": "Alice" }) or nested
 *   ({ customer: { name: "Alice" } }) — both are resolved by flattenVariables().
 *   Unknown variables are left in-place ({{unknown.key}}) so callers can
 *   detect missing values in logs without silently swallowing them.
 *
 * System tenantId:
 *   The reserved string 'system' identifies platform-wide defaults.
 *   It is intentionally a short string (not a UUID) so it never collides
 *   with a real tenant UUID.
 */
@Injectable()
export class TemplateRenderer {
  static readonly SYSTEM_TENANT_ID = 'system';

  private readonly logger = new Logger(TemplateRenderer.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * resolve()
   *
   * Finds the best-matching template using the fallback chain and renders it.
   *
   * @param params.tenantId  Tenant requesting the template
   * @param params.slug      Template slug (e.g. 'booking_confirmed_email')
   * @param params.channel   'email' | 'sms' | 'push' | 'in_app'
   * @param params.locale    BCP-47 locale, e.g. 'en', 'fr' (default: 'en')
   * @param variables        Values to substitute into {{placeholders}}
   *
   * Returns null when no template is found in any tier.
   */
  async resolve(
    params: {
      tenantId: string;
      slug:     string;
      channel:  string;
      locale?:  string;
    },
    variables: TemplateVariables = {},
  ): Promise<RenderedTemplate | null> {
    const locale = params.locale ?? 'en';
    const flat   = flattenVariables(variables);

    const template = await this.lookupWithFallback(
      params.tenantId,
      params.slug,
      params.channel,
      locale,
    );

    if (!template) {
      this.logger.warn(
        `Template not found — slug=${params.slug} channel=${params.channel} ` +
        `locale=${locale} tenant=${params.tenantId}`,
      );
      return null;
    }

    this.logger.debug(
      `Template resolved — slug=${template.slug} tenant=${template.tenantId} locale=${template.locale}`,
    );

    return {
      subject:          template.subject   ? render(template.subject,   flat) : null,
      bodyHtml:         template.bodyHtml  ? render(template.bodyHtml,  flat) : null,
      bodyText:         template.bodyText  ? render(template.bodyText,  flat) : null,
      resolvedSlug:     template.slug,
      resolvedLocale:   template.locale,
      resolvedTenantId: template.tenantId,
    };
  }

  /**
   * renderString()
   *
   * Standalone variable substitution on an arbitrary string.
   * Useful for rendering subject lines or SMS bodies without a DB lookup.
   */
  renderString(template: string, variables: TemplateVariables = {}): string {
    return render(template, flattenVariables(variables));
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async lookupWithFallback(
    tenantId: string,
    slug:     string,
    channel:  string,
    locale:   string,
  ): Promise<TemplateEntity | null> {
    const repo  = this.ds.getRepository(TemplateEntity);
    // channel param is string — cast to entity union type for TypeORM FindOptionsWhere
    const ch    = channel as TemplateEntity['channel'];

    // Tier 1 — Tenant + locale (only if tenantId is not 'system')
    if (tenantId !== TemplateRenderer.SYSTEM_TENANT_ID) {
      const t1 = await repo.findOne({
        where: { tenantId, slug, channel: ch, locale, isDeleted: false },
      });
      if (t1) return t1;
    }

    // Tier 2 — System + requested locale
    const t2 = await repo.findOne({
      where: {
        tenantId: TemplateRenderer.SYSTEM_TENANT_ID,
        slug, channel: ch, locale,
        isDeleted: false,
      },
    });
    if (t2) return t2;

    // Tier 3 — System + English fallback
    if (locale !== 'en') {
      const t3 = await repo.findOne({
        where: {
          tenantId: TemplateRenderer.SYSTEM_TENANT_ID,
          slug, channel: ch, locale: 'en',
          isDeleted: false,
        },
      });
      if (t3) return t3;
    }

    return null;
  }
}

// ── Pure helpers (exported for testing) ──────────────────────────────────────

/**
 * flattenVariables()
 *
 * Converts nested objects to dot-path keys:
 *   { customer: { name: 'Alice' }, booking: { reference: 'BK-001' } }
 *   → { 'customer.name': 'Alice', 'booking.reference': 'BK-001' }
 *
 * Flat maps pass through unchanged.
 * Depth is limited to 5 levels to prevent pathological inputs.
 */
export function flattenVariables(
  obj:    Record<string, unknown>,
  prefix = '',
  depth  = 0,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (depth > 5) return out;

  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenVariables(v as Record<string, unknown>, key, depth + 1));
    } else {
      out[key] = v == null ? '' : String(v);
    }
  }
  return out;
}

/**
 * render()
 *
 * Replaces {{key}} placeholders with values from the flat variable map.
 * Unmatched placeholders are left as-is.
 */
export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? (vars[key] ?? '') : match,
  );
}
