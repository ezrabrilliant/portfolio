#!/bin/bash

# Portfolio Quick Update Script for Ubuntu Server with Node.js Auto Upgrade
# Usage: Run this script on your Ubuntu server after pushing to GitHub

echo "Starting Portfolio Update..."

# Navigate to portfolio directory
cd /var/www/portfolio || { echo "Portfolio directory not found"; exit 1; }

# Check Node.js version and upgrade if needed
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
    echo "Current Node.js version: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "Upgrading Node.js to version 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "Node.js upgraded to $(node --version)"
fi

# Pull latest changes from GitHub
echo "Pulling latest changes from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "Git pull failed"
    exit 1
fi

# Clear npm cache and reinstall dependencies
echo "Installing dependencies..."
npm cache clean --force 2>/dev/null || true
rm -rf node_modules package-lock.json
npm install

# Build project
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed"
    exit 1
fi

# Copy built files to nginx directory
echo "Copying files to web directory..."
cp -r dist/* /var/www/html/

# Set proper permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Reload nginx
echo "Reloading Nginx..."
systemctl reload nginx

echo "Portfolio updated successfully!"
echo "Access your portfolio at: http://31.57.241.234"

# Optional: Show recent git log
echo ""
echo "Latest changes:"
git log --oneline -5
