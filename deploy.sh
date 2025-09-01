#!/bin/bash

# Portfolio Deployment Script for Ubuntu Server
# Usage: Run this script on your Ubuntu server

echo "🚀 Starting Portfolio Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "🔧 Installing Nginx..."
    sudo apt install nginx -y
fi

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create web directory
sudo mkdir -p /var/www/portfolio

# Clone or update repository
if [ -d "/var/www/portfolio/.git" ]; then
    echo "🔄 Updating existing repository..."
    cd /var/www/portfolio
    sudo git pull origin main
else
    echo "📥 Cloning repository..."
    sudo git clone https://github.com/ezrabrilliant/portfolio.git /var/www/portfolio
    cd /var/www/portfolio
fi

# Install dependencies and build
echo "⚙️ Installing dependencies..."
sudo npm install

echo "🔨 Building project..."
sudo npm run build

# Copy built files to nginx directory
echo "📋 Copying files to web directory..."
sudo cp -r dist/* /var/www/html/

# Create nginx configuration
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/portfolio > /dev/null <<EOF
server {
    listen 80;
    server_name 31.57.241.234;
    root /var/www/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/x-javascript;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
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
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    # Reload nginx
    sudo systemctl reload nginx
    echo "🎉 Deployment completed successfully!"
    echo "🌐 Your portfolio is now available at: http://31.57.241.234"
else
    echo "❌ Nginx configuration error. Please check the configuration."
    exit 1
fi

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

echo "✨ Portfolio deployment finished!"
echo "🔗 Access your portfolio at: http://31.57.241.234"
