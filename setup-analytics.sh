#!/bin/bash
# Google Analytics Setup Script for Portfolio
# Author: Ezra Brilliant
# Date: September 4, 2025

set -e  # Exit on any error
set -x  # Show commands being executed

echo "🚀 Starting Google Analytics Setup for Portfolio..."
echo "=================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (or with sudo)"
    exit 1
fi

# Check if required commands exist
echo "🔍 Checking prerequisites..."
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node is required but not installed. Aborting."; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required but not installed. Aborting."; exit 1; }

echo "✅ npm version: $(npm --version)"
echo "✅ node version: $(node --version)"
echo "✅ git version: $(git --version)"

# Navigate to portfolio directory
PORTFOLIO_DIR="/var/www/portfolio"
echo "📁 Navigating to portfolio directory: $PORTFOLIO_DIR"

if [ ! -d "$PORTFOLIO_DIR" ]; then
    echo "❌ Portfolio directory does not exist: $PORTFOLIO_DIR"
    echo "Creating directory and cloning repository..."
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/ezrabrilliant/portfolio.git
fi

cd "$PORTFOLIO_DIR" || {
    echo "❌ Failed to navigate to $PORTFOLIO_DIR"
    exit 1
}

echo "✅ Current directory: $(pwd)"

# Update repository
echo "📦 Updating repository from GitHub..."
git config --global --add safe.directory "$PORTFOLIO_DIR"
git config pull.rebase false

# Stash any local changes and pull
git stash push -m "Stashing before analytics setup $(date)"
git pull origin main || {
    echo "⚠️  Git pull failed, trying to reset..."
    git reset --hard origin/main
}

# Create production environment file
echo "⚙️  Creating production environment file..."
cat > .env.production << 'EOF'
# Production Environment Variables for Google Analytics
VITE_GA_MEASUREMENT_ID=G-XDQEMYBNE4

# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=service_kbtpx1c
VITE_EMAILJS_TEMPLATE_ID=template_vr8qmxa
VITE_EMAILJS_PUBLIC_KEY=kjQayrjghoJf7bIce

# Additional Production Settings
NODE_ENV=production
EOF

echo "✅ Environment file created:"
cat .env.production

# Install dependencies
echo "📦 Installing/updating dependencies..."
npm install --production=false

# Build project
echo "🔨 Building project with Google Analytics..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful, dist directory size:"
du -sh dist/

# Backup current website
BACKUP_DIR="/var/www/html_backup_$(date +%Y%m%d_%H%M%S)"
echo "💾 Creating backup of current website..."
if [ -d "/var/www/html" ]; then
    cp -r /var/www/html "$BACKUP_DIR"
    echo "✅ Backup created: $BACKUP_DIR"
fi

# Deploy to nginx directory
echo "📋 Deploying to web directory..."
mkdir -p /var/www/html
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

# Set proper permissions
echo "🔐 Setting proper permissions..."
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Reload nginx
echo "🔄 Reloading Nginx..."
if command -v nginx >/dev/null 2>&1; then
    nginx -t && systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "⚠️  Nginx not found, skipping reload"
fi

echo "=================================================="
echo "✅ Google Analytics setup completed successfully!"
echo "🌐 Website available at: http://31.57.241.234"
echo "📊 Google Analytics ID: G-XDQEMYBNE4"

# Verify Google Analytics integration
echo "🔍 Verifying Google Analytics integration..."
GA_FOUND=false

for js_file in /var/www/html/assets/*.js; do
    if [ -f "$js_file" ] && grep -q "G-XDQEMYBNE4" "$js_file"; then
        echo "✅ Google Analytics ID found in: $(basename "$js_file")"
        GA_FOUND=true
        break
    fi
done

if [ "$GA_FOUND" = false ]; then
    echo "❌ Google Analytics ID not found in built files"
    echo "🔍 Checking environment file..."
    if [ -f ".env.production" ]; then
        echo "Environment file exists:"
        cat .env.production
    else
        echo "Environment file missing!"
    fi
    echo "🔍 Available JS files:"
    ls -la /var/www/html/assets/*.js 2>/dev/null || echo "No JS files found"
else
    echo "✅ Google Analytics integration verified successfully!"
fi

# Show final status
echo "=================================================="
echo "📋 Setup Summary:"
echo "   - Environment file: ✅ Created"
echo "   - Dependencies: ✅ Installed"
echo "   - Build: ✅ Completed"
echo "   - Deployment: ✅ Deployed"
echo "   - Permissions: ✅ Set"
echo "   - Nginx: ✅ Reloaded"
echo "   - Analytics: $([ "$GA_FOUND" = true ] && echo "✅ Verified" || echo "❌ Not found")"
echo ""
echo "🎯 Next Steps:"
echo "   1. Visit http://31.57.241.234 to test website"
echo "   2. Open Google Analytics dashboard"
echo "   3. Check Realtime reports for tracking"
echo "   4. Test navigation, forms, and downloads"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Backup location: $BACKUP_DIR"
echo "   - Environment file: $PORTFOLIO_DIR/.env.production"
echo "   - Website files: /var/www/html/"
echo "=================================================="