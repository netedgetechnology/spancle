# Spancle API Standard

## Base URL

https://api.spancle.com

Never:

https://api.spancle.com/api/v1

---

## Endpoint Format

Always:

/api/v1/...

Examples:

/api/v1/admin/stats

/api/v1/tenants

/api/v1/packages

/api/v1/cms/homepage

---

## Rules

✓ apiClient.baseURL never contains /api/v1

✓ Every request path starts with /api/v1

✓ Never concatenate /api/v1 dynamically

✓ Never mix /tenants and /api/v1/tenants

✓ Never hardcode API domains outside configuration
