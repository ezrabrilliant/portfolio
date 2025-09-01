#!/bin/bash

# Deployment script for portfolio
echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Check if environment variables exist
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found! Please create it manually on server."
    echo "Required variables:"
    echo "VITE_EMAILJS_SERVICE_ID=your_service_id"
    echo "VITE_EMAILJS_TEMPLATE_ID=your_template_id" 
    echo "VITE_EMAILJS_PUBLIC_KEY=your_public_key"
    exit 1
fi

# Install dependencies
npm install

# Build project
npm run build

# Deploy (customize based on your server setup)
# For example: copy dist/ to nginx directory
# cp -r dist/* /var/www/html/

echo "✅ Deployment complete!"
