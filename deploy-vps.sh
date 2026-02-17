#!/bin/bash
# ================================================
# Deploy script untuk portfolio di VPS
# Jalankan di VPS: bash deploy.sh
# ================================================

set -e

APP_DIR="/var/www/portfolio"
NGINX_HTML="/var/www/html"
PORT=3002

echo "=== 1. Setup directory ==="
mkdir -p $APP_DIR

echo "=== 2. Copy files ke $APP_DIR ==="
echo "Upload file-file project kamu ke $APP_DIR terlebih dahulu."
echo "Dari local machine, jalankan:"
echo ""
echo "  scp -r dist/ package.json server.js root@31.57.241.234:$APP_DIR/"
echo ""
read -p "Sudah upload? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Upload dulu, lalu jalankan script ini lagi."
    exit 1
fi

echo "=== 3. Install dependencies ==="
cd $APP_DIR
npm install --omit=dev express cors

echo "=== 4. Stop old process (jika ada) ==="
pm2 delete portfolio 2>/dev/null || true

echo "=== 5. Start server dengan PM2 ==="
PORT=$PORT pm2 start server.js --name portfolio
pm2 save

echo "=== 6. Update Nginx config ==="
cat > /etc/nginx/sites-available/portfolio << 'NGINX'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ezrabrilliant.tech www.ezrabrilliant.tech;
    return 301 https://$host$request_uri;
}

# HTTPS Block for Portfolio
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ezrabrilliant.tech www.ezrabrilliant.tech;

    ssl_certificate /etc/letsencrypt/live/ezrabrilliant.tech-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ezrabrilliant.tech-0001/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # API endpoint - proxy ke Express server
    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files - serve langsung dari dist
    root /var/www/portfolio/dist;
    index index.html;

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Handle PDF files
    location ~* \.pdf$ {
        add_header Content-Type application/pdf;
        add_header Content-Disposition inline;
        add_header Cache-Control "public, max-age=31536000";
        expires 1y;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
NGINX

# Symlink jika belum ada
ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio

echo "=== 7. Test & reload Nginx ==="
nginx -t && systemctl reload nginx

echo ""
echo "=== DONE ==="
echo "Portfolio running on port $PORT"
echo "Nginx proxying /api/* ke Express server"
echo "Static files served dari $APP_DIR/dist"
echo ""
echo "Cek status: pm2 status portfolio"
echo "Cek logs:   pm2 logs portfolio"
