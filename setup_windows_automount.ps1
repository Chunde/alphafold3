# AlphaFold 3 - Windows-side VHDX auto-mount setup
# Run once as Administrator in PowerShell
param(
    [string]$VhdPath = "E:\AlphaFold\wsl_data.vhdx",
    [string]$MountName = "ext4data",
    [int]$Partition = 1
)

$ErrorActionPreference = "Stop"
$TaskName = "AlphaFold3_VHDX_Mount"

Write-Host ""
Write-Host "=== AlphaFold 3 - Windows Auto-mount Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check VHDX file exists
if (-not (Test-Path $VhdPath)) {
    Write-Host "[ERROR] VHDX file not found: $VhdPath" -ForegroundColor Red
    Write-Host "Please check the path and run this script again."
    exit 1
}
Write-Host "[OK] VHDX found: $VhdPath" -ForegroundColor Green

# Check WSL is available
$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
if (-not $wsl) {
    Write-Host "[ERROR] wsl.exe not found - is WSL installed?" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] WSL available" -ForegroundColor Green

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[ ] Removing existing scheduled task: $TaskName"
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Build the argument string for wsl.exe
$wslArgs = "--mount --vhd `"$VhdPath`" --name $MountName --partition $Partition"

# Create scheduled task
$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument $wslArgs
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Mount AlphaFold 3 ext4 VHDX into WSL2 at system startup" `
    -Force | Out-Null

Write-Host "[OK] Scheduled task created: $TaskName" -ForegroundColor Green

# Run the task immediately
Write-Host "[ ] Running mount now..."
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 5

# Verify
$checkCmd = "test -f /mnt/wsl/$MountName/af3.bin.zst && echo OK || echo FAIL"
$result = wsl -d Ubuntu -- bash -c $checkCmd 2>&1
if ($result -match "OK") {
    Write-Host "[OK] VHDX mounted and verified at /mnt/wsl/$MountName" -ForegroundColor Green
} else {
    Write-Host "[WARN] VHDX might not be mounted yet" -ForegroundColor Yellow
    Write-Host "  Check: wsl -d Ubuntu -- ls /mnt/wsl/$MountName/"
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Cyan
Write-Host "The VHDX will auto-attach to WSL2 on every Windows boot."
Write-Host "Run the server with:  bash start_server.sh"
Write-Host ""
