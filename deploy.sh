#!/bin/bash
# Portfolio Quick Update Script for Ubuntu Server
# Usage: Run this script on your Ubuntu server after pushing to GitHub

echo "🚀 Starting Portfolio Update..."

# Navigate to portfolio directory
cd /var/www/portfolio || { echo "❌ Portfolio directory not found"; exit 1; }

# Pull latest changes from GitHub
echo "📦 Pulling latest changes from GitHub..."

# Stash any local changes first (especially package-lock.json)
git stash

git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed, trying to reset..."
    git reset --hard origin/main
fi

# Apply stash if needed (optional, usually not needed for package-lock.json)
# git stash pop 2>/dev/null || echo "No stash to apply"

# Install/update dependencies
echo "⚙️ Installing dependencies..."
npm install

# Check if production environment file exists
if [ ! -f ".env.production" ] && [ ! -f ".env.local" ]; then
    echo "⚠️  No environment file found!"
    echo "Creating .env.production with Google Analytics..."
    
    # Create production environment file
    cat > .env.production << EOF
# Production Environment Variables
VITE_GA_MEASUREMENT_ID=G-XDQEMYBNE4

# EmailJS Configuration (add your production keys here)
# VITE_EMAILJS_SERVICE_ID=your_production_service_id
# VITE_EMAILJS_TEMPLATE_ID=your_production_template_id  
# VITE_EMAILJS_PUBLIC_KEY=your_production_public_key
EOF
    
    echo "✅ Created .env.production file"
else
    echo "✅ Environment file found"
fi

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
