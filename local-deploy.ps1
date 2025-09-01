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

# Step 3: Instructions for server deployment
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. SSH to your Ubuntu server:" -ForegroundColor White
Write-Host "   ssh root@31.57.241.234" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run the deployment script:" -ForegroundColor White
Write-Host "   cd /var/www/portfolio" -ForegroundColor Gray
Write-Host "   chmod +x deploy.sh" -ForegroundColor Gray
Write-Host "   ./deploy.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Or use this one-liner:" -ForegroundColor White
Write-Host "   ssh root@31.57.241.234 'cd /var/www/portfolio && git pull origin main && npm install && npm run build && cp -r dist/* /var/www/html/ && systemctl reload nginx'" -ForegroundColor Gray

Write-Host ""
Write-Host "Local deployment process completed!" -ForegroundColor Green
