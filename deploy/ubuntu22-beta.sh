#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/holding-kashani
DATA_DIR=/var/lib/holding-kashani
REPO=https://github.com/seyedabolfazlgolpar27-prog/holding-kashani-erp.git

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git python3 python3-venv python3-pip nginx curl

mkdir -p "$APP_DIR" "$DATA_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"/*
  git clone "$REPO" "$APP_DIR"
fi

python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install --upgrade pip
"$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/requirements.txt"

cat >/etc/systemd/system/holding-kashani.service <<'EOF'
[Unit]
Description=Holding Kashani Beta API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/holding-kashani
Environment=DATA_DIR=/var/lib/holding-kashani
Environment=DB_PATH=/var/lib/holding-kashani/beta.db
Environment=PORT=8080
ExecStart=/opt/holding-kashani/.venv/bin/gunicorn --bind 127.0.0.1:8080 --workers 2 --threads 4 --timeout 60 app:app
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
printf '\n\nHolding Kashani Beta is running.\nOpen: http://93.126.18.48\nDefault beta password: Beta@1405\n'
