#!/bin/bash

# Auto-deploy webhook script
# Place this in /var/www/webhook-deploy.sh on your server

echo "Webhook triggered - Starting auto deployment..."

# Navigate to portfolio directory
cd /var/www/portfolio

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build project
npm run build

# Copy to web directory
cp -r dist/* /var/www/html/

# Set permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Reload nginx
systemctl reload nginx

echo "Auto deployment completed!"
date
