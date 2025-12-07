# Email Configuration Helper Script
# This script helps you configure email settings in your .env file

Write-Host "`n=== Email Configuration Setup ===" -ForegroundColor Cyan
Write-Host "This script will help you configure Gmail SMTP settings`n" -ForegroundColor Yellow

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found in the backend directory!" -ForegroundColor Red
    Write-Host "Please make sure you're running this script from the backend/ directory.`n" -ForegroundColor Yellow
    exit 1
}

# Read current .env content
$envContent = Get-Content .env -Raw

# Get email configuration from user
Write-Host "Enter your email configuration:" -ForegroundColor Green
$emailUser = Read-Host "Your Gmail address (e.g., yourname@gmail.com)"
$appPassword = Read-Host "Gmail App Password (16 characters)" -AsSecureString
$appPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($appPassword))

Write-Host "`nUpdating .env file..." -ForegroundColor Yellow

# Replace email configuration
$envContent = $envContent -replace "EMAIL_SMTP_USER=.*", "EMAIL_SMTP_USER=$emailUser"
$envContent = $envContent -replace "EMAIL_SMTP_PASS=.*", "EMAIL_SMTP_PASS=$appPasswordPlain"
$envContent = $envContent -replace "FROM_EMAIL=.*", "FROM_EMAIL=$emailUser"

# Write back to file
$envContent | Out-File -FilePath .env -Encoding utf8 -NoNewline

Write-Host "`n✅ Email configuration updated successfully!" -ForegroundColor Green
Write-Host "`nCurrent email settings:" -ForegroundColor Cyan
Get-Content .env | Select-String -Pattern "EMAIL" | ForEach-Object {
    if ($_ -match "EMAIL_SMTP_PASS") {
        Write-Host "$($_.Line -replace '=.*', '=***')" -ForegroundColor Gray
    } else {
        Write-Host $_.Line -ForegroundColor Gray
    }
}

Write-Host "`nNote: EMAIL_SMTP_HOST and EMAIL_SMTP_PORT are already set for Gmail.`n" -ForegroundColor Yellow

