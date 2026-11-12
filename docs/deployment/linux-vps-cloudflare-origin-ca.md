# Deploy TaxPilot to an Ubuntu VPS with Cloudflare Origin CA

This guide deploys the current web app and TypeScript API to one Ubuntu 24.04 LTS VPS. Nginx serves the built React app and proxies API requests to Fastify on `127.0.0.1:4000`. PostgreSQL runs locally. Invoice files use a private S3-compatible object store; Better Auth manages email/password sign-in and cookie sessions in PostgreSQL.

The Nginx and systemd examples are in [`deploy/`](../../deploy/). Replace `taxpilot.example.com` with the real hostname before installing the Nginx site.

## What you need

- An Ubuntu 24.04 LTS server with a public IPv4 address, SSH access, and enough disk space for PostgreSQL, builds, and backups. Add an AAAA record only if the VPS has working IPv6 and its firewall is configured for it.
- A domain active in Cloudflare and permission to change DNS and SSL/TLS settings.
- A unique Better Auth secret generated for this deployment. Keep it server-side and back it up securely.
- A private S3-compatible bucket, credentials scoped to that bucket, and HTTPS access to its endpoint.
- A Git account or read-only deploy key that can clone this repository.

The API requires Node.js 22.18 or later and this repository pins pnpm 9.15.3. The production web build requires the public Vite settings described below.

## 1. Prepare the server

Update Ubuntu and install the system services and build tools:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib git curl ca-certificates python3 ufw rsync
sudo systemctl enable --now nginx postgresql
```

Install Node.js 22 from the NodeSource Debian repository, then the repository's pinned pnpm release:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
sudo npm install --global pnpm@9.15.3
node --version
pnpm --version
```

Confirm Node reports `v22.18.0` or newer and pnpm reports `9.15.3`. NodeSource documents the Debian and Ubuntu installation flow in its [distribution instructions](https://github.com/nodesource/distributions#installation-instructions); pnpm documents version pinning through `packageManager` in its [installation guide](https://pnpm.io/installation).

Create separate deployment and service users. The service account cannot log in; the deployment account owns the checkout and is also in the service group so it can install the API environment file for Prisma commands.

```bash
sudo adduser --system --group --no-create-home --shell /usr/sbin/nologin taxpilot
sudo adduser --disabled-password --gecos "" deploy
sudo adduser deploy taxpilot
sudo install -d -o root -g taxpilot -m 0750 /opt/taxpilot
sudo install -d -o deploy -g taxpilot -m 2750 /opt/taxpilot/app
sudo install -d -o root -g taxpilot -m 0750 /etc/taxpilot
sudo install -d -o root -g root -m 0700 /etc/ssl/cloudflare
sudo install -d -o root -g www-data -m 0755 /var/www/taxpilot/current
```

Set up SSH access for the `deploy` account using a read-only deploy key (or your organization’s approved Git access method). Do not put a repository token in the clone URL.

Restrict SSH to your management IP before enabling UFW. Keep the current SSH session open until you have confirmed a second session works:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from YOUR_ADMIN_PUBLIC_IP to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

The Nginx HTTPS site below serves app/API traffic only to Cloudflare's published proxy ranges; the HTTP listener redirects to HTTPS. For network-level filtering, configure the VPS provider firewall to allow ports 80 and 443 only from [Cloudflare's IP ranges](https://www.cloudflare.com/ips/), while retaining SSH access from your management IP. Cloudflare explains how its ranges protect proxied hostnames in its [IP address documentation](https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/).

## 2. Create the PostgreSQL database

Keep PostgreSQL on loopback; do not open port 5432 in UFW or the provider firewall. Ubuntu's package defaults bind PostgreSQL locally. Create a dedicated role and database:

```bash
openssl rand -hex 32
sudo -u postgres psql
```

In the PostgreSQL prompt, replace the password with the generated hex value:

```sql
CREATE ROLE taxpilot LOGIN PASSWORD 'PASTE_GENERATED_HEX_PASSWORD';
CREATE DATABASE taxpilot OWNER taxpilot;
\q
```

The hex password is URL-safe for `DATABASE_URL`. Keep a copy in your secret manager; do not commit it.

## 3. Create the Cloudflare Origin CA certificate

In Cloudflare, open **SSL/TLS → Origin Server → Create Certificate**. Include `taxpilot.example.com` as a hostname (and any additional hostname you will actually serve). Choose PEM format. Save the Origin Certificate and Private Key separately; Cloudflare only displays the private key when it is created.

The Origin CA certificate is for the Cloudflare-to-VPS connection. It is not a browser-trusted certificate. Keep the DNS record proxied through Cloudflare; direct requests to the VPS will be blocked by the Nginx allowlist. If Cloudflare proxying is paused or bypassed, visitors can see an untrusted certificate warning. Cloudflare describes this limitation in its [Origin CA guide](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/) and [troubleshooting guide](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/troubleshooting/).

Prepare files with restrictive permissions and paste the corresponding PEM contents using `sudoedit`:

```bash
sudo install -o root -g root -m 0644 /dev/null /etc/ssl/cloudflare/taxpilot-origin.pem
sudo install -o root -g root -m 0600 /dev/null /etc/ssl/cloudflare/taxpilot-origin.key
sudoedit /etc/ssl/cloudflare/taxpilot-origin.pem
sudoedit /etc/ssl/cloudflare/taxpilot-origin.key
sudo chmod 0644 /etc/ssl/cloudflare/taxpilot-origin.pem
sudo chmod 0600 /etc/ssl/cloudflare/taxpilot-origin.key
```

Never copy the private key into the repository, a web root, or a ticket. Keep a secure backup and calendar a rotation before its expiry.

## 4. Configure DNS, Cloudflare, and authentication

In Cloudflare DNS, create an `A` record for `taxpilot.example.com` pointing to the VPS public IPv4 address. Enable the orange-cloud proxy. Do not create a DNS-only record for this web origin.

After the certificate is installed and Nginx is serving HTTPS, set **SSL/TLS → Overview → Encryption mode** to **Full (strict)**. This mode validates the origin certificate and hostname; Cloudflare accepts Origin CA certificates in this mode. Do not use Flexible mode. Cloudflare's [Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) require a valid, unexpired certificate matching the hostname.

Under Cloudflare SSL/TLS, enable **Always Use HTTPS**. Keep an edge certificate active for the hostname. Better Auth runs on the same hostname as the site behind Nginx, so browser sessions use first-party, secure cookies and do not need a third-party identity-provider callback.

## 5. Install the app and environment settings

Clone the repository as the deployment user:

```bash
sudo -u deploy git clone YOUR_READ_ONLY_REPOSITORY_URL /opt/taxpilot/app
```

Before cloning a private repository, install a read-only deploy key for the `deploy` account and verify it can access the repository.

Create the server-only API environment file. The `DATABASE_URL` password below is the generated hex value. Omit `S3_ENDPOINT` if using AWS S3; for an S3-compatible provider, set its HTTPS endpoint and correct region/path-style option.

```bash
sudo install -o root -g taxpilot -m 0640 /dev/null /etc/taxpilot/api.env
sudoedit /etc/taxpilot/api.env
```

Generate a unique authentication secret and paste it into `BETTER_AUTH_SECRET` in the API environment file:

```bash
openssl rand -base64 48
```

Use these values in `/etc/taxpilot/api.env`:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
DATABASE_URL=postgresql://taxpilot:PASTE_GENERATED_HEX_PASSWORD@127.0.0.1:5432/taxpilot?schema=public
BETTER_AUTH_URL=https://taxpilot.example.com
BETTER_AUTH_SECRET=PASTE_THE_GENERATED_SECRET_HERE
S3_REGION=YOUR_OBJECT_STORE_REGION
S3_BUCKET=YOUR_PRIVATE_BUCKET
S3_ACCESS_KEY_ID=YOUR_BUCKET_SCOPED_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_BUCKET_SCOPED_SECRET
S3_FORCE_PATH_STYLE=false
WEB_ORIGINS=https://taxpilot.example.com
```

For an S3-compatible service, also set `S3_ENDPOINT=https://YOUR_OBJECT_STORE_ENDPOINT` and use the provider's required `S3_FORCE_PATH_STYLE` value. Set bucket CORS to allow only `https://taxpilot.example.com`, method `PUT`, and the `Content-Type` request header. Keep the bucket private and block public access.

Make the environment file available to Prisma's CLI without copying its secrets into the checkout:

```bash
sudo ln -s /etc/taxpilot/api.env /opt/taxpilot/app/backend/.env
```

Create the public web build settings. These values are included in the client bundle and must not contain secrets:

```bash
sudoedit /opt/taxpilot/app/.env.production
sudo chown deploy:taxpilot /opt/taxpilot/app/.env.production
sudo chmod 0640 /opt/taxpilot/app/.env.production
```

```dotenv
VITE_API_URL=https://taxpilot.example.com
```

`BETTER_AUTH_SECRET` must be unique, unpredictable, and stored only in `/etc/taxpilot/api.env`. Confirm `.env.production` contains no secrets and is not committed. Before allowing public production registration, configure transactional email and enable verified sign-up and password recovery in the application.

## 6. Build and migrate

Run installation, both production builds, and the checked-in database migration as the deployment user:

```bash
sudo -u deploy bash -lc 'cd /opt/taxpilot/app && pnpm install --frozen-lockfile && pnpm build && pnpm build:api && pnpm db:deploy'
```

The Prisma migration creates the schema. It does not import prototype records: the Convex database contains demo data only. Confirm the command completes before starting the API.

Install the static site files and ensure Nginx can read them:

```bash
sudo rsync -a --delete /opt/taxpilot/app/dist/ /var/www/taxpilot/current/
sudo chown -R root:www-data /var/www/taxpilot/current
sudo find /var/www/taxpilot/current -type d -exec chmod 0755 {} +
sudo find /var/www/taxpilot/current -type f -exec chmod 0644 {} +
```

## 7. Configure Nginx's Cloudflare allowlist

The repository script downloads both IPv4 and IPv6 ranges from Cloudflare's official lists, validates each CIDR, then creates Nginx directives that restore the real visitor IP and allow only Cloudflare proxy traffic. Install and run it while the default Nginx site is still active:

```bash
sudo install -o root -g root -m 0644 /opt/taxpilot/app/deploy/scripts/update-cloudflare-realip.py /usr/local/sbin/update-cloudflare-realip.py
sudo python3 /usr/local/sbin/update-cloudflare-realip.py
```

The script runs `nginx -t` before reloading Nginx. Install the updater timer so changes to Cloudflare's ranges are refreshed weekly:

```bash
sudo cp /opt/taxpilot/app/deploy/systemd/taxpilot-cloudflare-realip.service /etc/systemd/system/
sudo cp /opt/taxpilot/app/deploy/systemd/taxpilot-cloudflare-realip.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now taxpilot-cloudflare-realip.timer
```

The active range list is also published at [cloudflare.com/ips](https://www.cloudflare.com/ips/). Do not replace this list with a single Cloudflare address or trust arbitrary `X-Forwarded-For` headers.

## 8. Start the API and Nginx site

Install the systemd service and enable it:

```bash
sudo cp /opt/taxpilot/app/deploy/systemd/taxpilot-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now taxpilot-api
sudo systemctl status taxpilot-api --no-pager
```

Install Nginx's site config and replace the example hostname:

```bash
sudo cp /opt/taxpilot/app/deploy/nginx/taxpilot.conf /etc/nginx/sites-available/taxpilot
sudo sed -i 's/taxpilot\.example\.com/YOUR_REAL_HOSTNAME/g' /etc/nginx/sites-available/taxpilot
sudo ln -s /etc/nginx/sites-available/taxpilot /etc/nginx/sites-enabled/taxpilot
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

The Nginx site serves the React single-page app, proxies `/v1/` and `/health/` to localhost, redirects HTTP to HTTPS, and applies security headers. The API rate limiter keys requests using the restored client IP. Fastify trusts forwarded headers only from the loopback Nginx proxy.

## 9. Verify the deployment

Check the API locally from the VPS:

```bash
curl -i http://127.0.0.1:4000/health/live
curl -i http://127.0.0.1:4000/health/ready
```

Then check the public Cloudflare hostname:

```bash
curl -I https://taxpilot.example.com/
curl -i https://taxpilot.example.com/health/live
```

Open the site in a browser, sign in, create a business, add a sale, and verify a return can be exported. Test a small invoice upload and open the uploaded file; this confirms the S3 endpoint, bucket CORS, signed upload, and signed download are all configured. Invoice extraction is not implemented yet, so enter the supplier, invoice, and tax-line details manually before approving an uploaded invoice.

Use these commands when a component is unhealthy:

```bash
sudo journalctl -u taxpilot-api -n 100 --no-pager
sudo journalctl -u taxpilot-cloudflare-realip.service -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
sudo nginx -t
```

## 10. Routine updates and backups

For each release, take a database backup, fetch the reviewed commit as `deploy`, rebuild, apply migrations, publish the new static bundle, and restart the API:

```bash
sudo -u deploy bash -lc 'cd /opt/taxpilot/app && git fetch --prune && git checkout YOUR_RELEASE_TAG && pnpm install --frozen-lockfile && pnpm build && pnpm build:api && pnpm db:deploy'
sudo rsync -a --delete /opt/taxpilot/app/dist/ /var/www/taxpilot/current/
sudo systemctl restart taxpilot-api
sudo nginx -t && sudo systemctl reload nginx
```

Keep PostgreSQL backups encrypted and off the VPS, and rehearse restoring one to a separate database. Back up object storage independently; the database stores private object keys, not file contents. Preserve the previous build and database backup until the new release has passed its smoke checks. Apply OS security updates regularly and review `systemctl status`, API logs, PostgreSQL disk use, backup success, and Origin CA certificate expiry.

## Production hardening included in this repository

- Node.js and pnpm version requirements are pinned at the repository root.
- The Fastify API limits request bodies to 1 MiB, uses security headers, and applies a per-IP rate limit. The rate-limit package is `@fastify/rate-limit` 11.2 or later, which includes IPv6 normalization described in its [security advisory](https://github.com/fastify/fastify-rate-limit/security/advisories/GHSA-grpc-p53c-r64v).
- Fastify trusts proxy headers only from `127.0.0.1`; Nginx trusts `CF-Connecting-IP` only from Cloudflare's published ranges.
- The systemd service runs as a non-root user with a read-only filesystem view, private temporary directory, and no-new-privileges setting.
- PostgreSQL and Fastify bind to loopback; Nginx serves the built web app and is the only public web listener.
- Origin CA private key permissions are restricted; the object store is private and receives short-lived signed upload/download URLs.

This provides a single-VPS deployment baseline. The rate limiter uses local process memory, which is suitable for this single API process; use a shared store and revisit limits before running multiple API instances. Before serving customer tax records, also verify identity-provider configuration, object-store backup and retention policy, PostgreSQL restore procedures, monitoring/alert ownership, OCR behavior, and the tax calculation acceptance cases in the production plan.
