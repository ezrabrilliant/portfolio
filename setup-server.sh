#!/bin/bash

# Portfolio Initial Setup Script for Ubuntu Server
# Run this ONCE to set up the server initially

echo "🚀 Starting Portfolio Initial Setup..."

# Update system packages
echo "📦 Updating system packages..."
apt update

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "🔧 Installing Nginx..."
    apt install nginx -y
fi

# Install Node.js and npm if not installed
if ! command -v node &> /dev/null; then
    echo "🔧 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

# Create web directory
mkdir -p /var/www/portfolio
mkdir -p /var/www/html

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/ezrabrilliant/portfolio.git /var/www/portfolio
cd /var/www/portfolio

# Install dependencies
echo "⚙️ Installing dependencies..."
npm install

# Build project
echo "🔨 Building project..."
npm run build

# Copy built files to nginx directory
echo "📋 Copying files to web directory..."
cp -r dist/* /var/www/html/

# Create nginx configuration
echo "🔧 Configuring Nginx..."
tee /etc/nginx/sites-available/portfolio > /dev/null <<EOF
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
ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    # Reload nginx
    systemctl reload nginx
    echo "🎉 Initial setup completed successfully!"
    echo "🌐 Your portfolio is now available at: http://31.57.241.234"
else
    echo "❌ Nginx configuration error. Please check the configuration."
    exit 1
fi

# Set proper permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Make deploy.sh executable
chmod +x /var/www/portfolio/deploy.sh

echo "✨ Portfolio initial setup finished!"
echo "🔗 Access your portfolio at: http://31.57.241.234"
echo ""
echo "📋 For future updates, just run:"
echo "   cd /var/www/portfolio && ./deploy.sh"
