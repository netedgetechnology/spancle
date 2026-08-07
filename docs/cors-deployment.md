# CORS Configuration — Deployment Guide

## What was broken

The browser sends an HTTP `OPTIONS` preflight request before every
cross-origin API call (e.g. `manage.spancle.com` → `api.spancle.com`).

The previous nginx configuration had no `OPTIONS` handler and no
`Access-Control-*` headers. The SaaS platform service upstream was
returning `204 No Content` with no CORS headers, causing:

```
Cross-Origin Request Blocked: CORS header 'Access-Control-Allow-Origin' missing.
Status code: 204.
```

## What was fixed

### 1. `infrastructure/nginx/snippets/cors.conf` _(new file)_

A reusable snippet included in every proxying `location` block.

- **OPTIONS preflight** — nginx responds `204` immediately with all
  required `Access-Control-*` headers. No upstream round-trip occurs,
  so there is no risk of a non-CORS upstream response reaching the browser.

- **All other methods** — `Access-Control-Allow-Origin` and
  `Access-Control-Allow-Credentials` are added to the proxied response.

- **Security header inheritance fix** — nginx's `add_header` directive
  is inherited from parent contexts only when the current context defines
  _no_ `add_header` directives of its own. Because `cors.conf` adds
  CORS headers at `location` level, any `add_header` directives at
  `server` level (including `security-headers.conf`) would be silently
  dropped. To prevent this, `cors.conf` includes `security-headers.conf`
  directly, ensuring security headers are always emitted alongside CORS headers.

### 2. `infrastructure/nginx/conf.d/spancle-api.conf` _(updated)_

- Added a `map $http_origin $cors_origin` block at `http` context level.
- Unknown origins map to `''` (empty string) — no CORS header is sent
  and the browser blocks the request. This is the correct security behaviour.
- Added `include /etc/nginx/snippets/cors.conf;` to every `location`
  block that proxies to an upstream service.

### 3. `ecosystem.config.js` _(updated)_

- `CORS_ORIGINS` default now includes `https://manage.spancle.com` and
  all other required origins so NestJS `app.enableCors()` also allows
  these origins at the application layer.

## Allowed origins

| Origin | Purpose |
|--------|---------|
| `https://manage.spancle.com` | Superadmin portal |
| `https://www.spancle.com` | Public website |
| `https://spancle.com` | Apex domain |
| `https://*.spancle.com` | Wildcard tenant subdomains |
| `http://localhost:3000–3002` | Local development |

Unknown origins receive no `Access-Control-Allow-Origin` header —
the browser blocks the request. This is intentional.

## Deployment steps

```bash
# 1. Copy updated files to the server
sudo cp infrastructure/nginx/snippets/cors.conf      /etc/nginx/snippets/cors.conf
sudo cp infrastructure/nginx/conf.d/spancle-api.conf /etc/nginx/conf.d/spancle-api.conf

# 2. Validate configuration
sudo nginx -t

# Expected output:
#   nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
#   nginx: configuration file /etc/nginx/nginx.conf test is successful

# 3. Reload nginx (zero-downtime)
sudo systemctl reload nginx

# 4. Restart the SaaS platform service so it picks up the new CORS_ORIGINS
pm2 restart spancle-saas-platform

# 5. Verify — should return 204 with CORS headers
curl -si -X OPTIONS https://api.spancle.com/api/v1/tenants \
  -H "Origin: https://manage.spancle.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,X-Tenant-Id" \
  | grep -E "HTTP|Access-Control|Vary"

# Expected:
#   HTTP/1.1 204 No Content
#   Access-Control-Allow-Origin: https://manage.spancle.com
#   Access-Control-Allow-Credentials: true
#   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
#   Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Tenant-Id, X-Request-ID
#   Access-Control-Max-Age: 86400
```

## Security notes

- `Access-Control-Allow-Origin` is never `*`. It echoes the exact
  request `Origin` value after validating it against the allowlist.
- `Access-Control-Allow-Credentials: true` is set, which is required
  for the browser to send the session cookie. A wildcard `*` origin
  is incompatible with `credentials: true` — the explicit origin is
  required by the CORS specification.
- The tenant subdomain regex (`^https://[a-z0-9][a-z0-9-]*\.spancle\.com$`)
  is anchored at both ends to prevent bypass via substrings.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Content-Security-Policy`, etc.) continue to be emitted on all
  responses through the `cors.conf` → `security-headers.conf` include chain.
