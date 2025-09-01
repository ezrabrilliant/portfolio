#!/bin/bash

# Portfolio Quick Update Script for Ubuntu Server
# Usage: Run this script on your Ubuntu server after pushing to GitHub

echo "🚀 Starting Portfolio Update..."

# Navigate to portfolio directory
cd /var/www/portfolio || { echo "❌ Portfolio directory not found"; exit 1; }

# Pull latest changes from GitHub
echo "� Pulling latest changes from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed"
    exit 1
fi

# Install/update dependencies
echo "⚙️ Installing dependencies..."
npm install

# Build project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Copy built files to nginx directory
echo "📋 Copying files to web directory..."
cp -r dist/* /var/www/html/

# Set proper permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Reload nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo "✅ Portfolio updated successfully!"
echo "🌐 Access your portfolio at: http://31.57.241.234"

# Optional: Show recent git log
echo ""
echo "📝 Latest changes:"
git log --oneline -5
