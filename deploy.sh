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

# Create Discord verification file
echo "🔗 Creating Discord verification file..."
mkdir -p /var/www/html/.well-known
echo "dh=6974e98c8b840c8d17b60275a98a7cbd33a0d457" > /var/www/html/.well-known/discord

# Set proper permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
chmod 644 /var/www/html/.well-known/discord

# Reload nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo "✅ Portfolio updated successfully!"
echo "🌐 Access your portfolio at: https://ezrabrilliant.tech"
echo "🔗 Discord verification: https://ezrabrilliant.tech/.well-known/discord"

# Optional: Show recent git log
echo ""
echo "📝 Latest changes:"
git log --oneline -5

# Test Discord verification
echo ""
echo "🧪 Testing Discord verification..."
curl -s https://ezrabrilliant.tech/.well-known/discord || echo "⚠️  Verification file test failed"