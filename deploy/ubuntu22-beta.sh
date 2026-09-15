#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/holding-kashani
DATA_DIR=/var/lib/holding-kashani
ENV_FILE=/etc/holding-kashani.env
CRED_FILE=/root/holding-kashani-internal-credentials.txt
REPO=https://github.com/seyedabolfazlgolpar27-prog/holding-kashani-erp.git

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git python3 python3-venv python3-pip python3-flask python3-werkzeug gunicorn nginx curl openssl

mkdir -p "$APP_DIR" "$DATA_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"/*
  git clone "$REPO" "$APP_DIR"
fi

# Create one private bootstrap credential for the internal manager.
# It is stored only on this VPS and is not committed to GitHub.
if [ ! -f "$ENV_FILE" ] || ! grep -q '^INITIAL_INTERNAL_PASSWORD=' "$ENV_FILE"; then
  INTERNAL_PASSWORD="HK-$(openssl rand -hex 12)"
  printf 'INITIAL_INTERNAL_PASSWORD=%s\n' "$INTERNAL_PASSWORD" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
else
  INTERNAL_PASSWORD="$(sed -n 's/^INITIAL_INTERNAL_PASSWORD=//p' "$ENV_FILE" | head -n1)"
fi
printf 'username: internal\npassword: %s\n' "$INTERNAL_PASSWORD" > "$CRED_FILE"
chmod 600 "$CRED_FILE"

# Use Ubuntu's Python packages as a fallback so deployment does not depend on PyPI.
rm -rf "$APP_DIR/.venv"
python3 -m venv --system-site-packages "$APP_DIR/.venv"
export PIP_DEFAULT_TIMEOUT=120
export PIP_RETRIES=10
if ! "$APP_DIR/.venv/bin/pip" install --disable-pip-version-check --timeout 120 --retries 10 -r "$APP_DIR/requirements.txt"; then
  echo "WARNING: PyPI is unreachable/slow. Continuing with Ubuntu packaged Flask/Werkzeug/Gunicorn."
fi

cat >/etc/systemd/system/holding-kashani.service <<'EOF'
[Unit]
Description=Holding Kashani ERP API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/holding-kashani
Environment=DATA_DIR=/var/lib/holding-kashani
Environment=DB_PATH=/var/lib/holding-kashani/beta.db
Environment=PORT=8080
EnvironmentFile=-/etc/holding-kashani.env
ExecStart=/opt/holding-kashani/.venv/bin/python -m gunicorn --bind 127.0.0.1:8080 --workers 2 --threads 4 --timeout 60 app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/nginx/sites-available/holding-kashani <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10m;

    gzip on;
    gzip_vary on;
    gzip_min_length 512;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;

    location /static/ {
        alias /opt/holding-kashani/static/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/holding-kashani /etc/nginx/sites-enabled/holding-kashani
nginx -t
systemctl daemon-reload
systemctl enable --now holding-kashani
systemctl enable --now nginx
systemctl restart holding-kashani nginx

if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
fi

sleep 2
curl -fsS http://127.0.0.1:8080/health
printf '\n\nHolding Kashani is running.\nOpen: http://93.126.18.48\n\nONLY ACTIVE BOOTSTRAP ACCOUNT:\nusername: internal\npassword: %s\n\nCredentials also saved at: %s\n' "$INTERNAL_PASSWORD" "$CRED_FILE"
