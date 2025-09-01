# Portfolio Local to Server Deployment Script
# Run this script in PowerShell after making changes

param(
    [switch]$SkipBuild
)

Write-Host "Starting Portfolio Deployment Process..." -ForegroundColor Green

# Step 1: Build project locally (skip if called from npm script)
if (-not $SkipBuild) {
    Write-Host "Building project..." -ForegroundColor Yellow
    npm run build

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed. Please fix errors before deploying." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Skipping build (already done by npm script)..." -ForegroundColor Yellow
}

# Step 2: Add, commit, and push to GitHub
Write-Host "Pushing changes to GitHub..." -ForegroundColor Yellow
git add -A
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrEmpty($commitMessage)) {
    $commitMessage = "Update portfolio - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git commit -m $commitMessage
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed. Please check your repository." -ForegroundColor Red
    exit 1
}

Write-Host "Changes pushed to GitHub successfully!" -ForegroundColor Green

# Step 3: Auto deploy to server (if SSH key is configured)
Write-Host ""
Write-Host "Attempting auto deployment to server..." -ForegroundColor Yellow

# Try to deploy to server automatically
$sshCommand = "cd /var/www/portfolio && git pull origin main && npm install && npm run build && cp -r dist/* /var/www/html/ && systemctl reload nginx"

try {
    Write-Host "Connecting to server..." -ForegroundColor Yellow
    $result = ssh -o "StrictHostKeyChecking=no" -o "ConnectTimeout=10" root@31.57.241.234 $sshCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Server deployment successful!" -ForegroundColor Green
        Write-Host "Portfolio is now live at: http://31.57.241.234" -ForegroundColor Green
    } else {
        Write-Host "Auto deployment failed. Please deploy manually." -ForegroundColor Yellow
        Write-Host "Manual command: ssh root@31.57.241.234 '$sshCommand'" -ForegroundColor Gray
    }
} catch {
    Write-Host "Could not connect to server automatically." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual Steps:" -ForegroundColor Cyan
    Write-Host "1. SSH to your Ubuntu server:" -ForegroundColor White
    Write-Host "   ssh root@31.57.241.234" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Run the deployment script:" -ForegroundColor White
    Write-Host "   cd /var/www/portfolio" -ForegroundColor Gray
    Write-Host "   ./deploy.sh" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Local deployment process completed!" -ForegroundColor Green
