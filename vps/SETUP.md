# VPS Media Server Setup

Run these commands on the VPS (SSH as root or sudo user).

## 1 — Install dependencies

```bash
apt update && apt install -y nginx certbot python3-certbot-nginx nodejs npm
node --version   # must be >= 18; if not: apt install nodejs (or use nvm)
```

## 2 — Create upload directory

```bash
mkdir -p /var/www/media/uploads
chown -R www-data:www-data /var/www/media
chmod -R 755 /var/www/media
```

## 3 — Deploy server files

```bash
mkdir -p /opt/top87-media
# Copy server.js, package.json, .env to /opt/top87-media/
# (easiest: use scp from your Windows machine)
# scp vps/server.js vps/package.json vps/.env root@187.77.117.43:/opt/top87-media/

cd /opt/top87-media
npm install --omit=dev
chown -R www-data:www-data /opt/top87-media
```

## 4 — Install systemd service

```bash
cp /opt/top87-media/top87-media.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable top87-media
systemctl start top87-media
systemctl status top87-media   # should show "active (running)"
```

## 5 — Configure nginx

```bash
cp /opt/top87-media/nginx-media.conf /etc/nginx/sites-available/media.top87.id
ln -s /etc/nginx/sites-available/media.top87.id /etc/nginx/sites-enabled/
nginx -t   # must say "test is successful"
systemctl reload nginx
```

## 6 — SSL certificate (Let's Encrypt)

Wait a few minutes for DNS to propagate, then:

```bash
certbot --nginx -d media.top87.id --non-interactive --agree-tos -m chibib.bibieb@gmail.com
systemctl reload nginx
```

## 7 — Verify

```bash
curl https://media.top87.id/api/health
# Expected: {"ok":true}
```

## Uploading files from Windows (scp)

Open PowerShell and run from the project root:
```powershell
scp vps/server.js vps/package.json vps/.env vps/nginx-media.conf vps/top87-media.service root@187.77.117.43:/opt/top87-media/
```
