# WiniOS Studio - Uninstaller for Windows (v0.2)
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-windows.ps1
#   ... -RemoveAppleDriver     also removes Apple's iPhone driver (msiexec)
#   ... -RemoveAppleID         also removes the backed-up Apple ID session (re-login needed)
#   ... -IncludeCache          also deletes download caches (rootfs, MSI, iTunes installer, build dir)
#
# Steps (never touches the user's other WSL distros):
#   1. close app + terminate the isolated "WinIOS" distro (not a global WSL shutdown)
#   2. wsl --unregister WinIOS (removes its virtual disk)
#   3. remove TCP bridge (portproxy 27015) + firewall rule; single UAC (also driver with -RemoveAppleDriver)
#   4. delete %LOCALAPPDATA%\WiniOS data (imported distro, users, caches of the app)
#   5. run the installed app's own NSIS uninstaller if present
#   6. delete the Desktop shortcut and Public helper scripts
#
# Kept by default so a reinstall starts already signed-in and fast:
#   - Apple ID session backup: %LOCALAPPDATA%\WiniOS\auth (until -RemoveAppleID)
#   - Apple's iPhone driver (iTunes/iMazing share it) (until -RemoveAppleDriver)
#   - Build dir C:\Users\Public\winios-build (until -IncludeCache)

param(
    [switch]$RemoveAppleDriver,
    [switch]$RemoveAppleID,
    [switch]$IncludeCache,
    [string]$WslDist = "WinIOS"
)
$ErrorActionPreference = "Continue"

function Ok($m)  { Write-Host "OK   $m" -ForegroundColor Green }
function Info($m){ Write-Host ">>   $m" -ForegroundColor Cyan }
function Skip($m){ Write-Host "..   $m" }

$BaseDir = Join-Path $env:LOCALAPPDATA "WiniOS"
$AuthBak = Join-Path $BaseDir "auth"
$Public  = "C:\Users\Public"

# ---------- 1. close app and terminate only the WinIOS distro ----------
Info "stopping WiniOS Studio..."
Get-Process -Name "winios-studio" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Info "terminating distro $WslDist (other distros keep running)..."
& wsl.exe --terminate $WslDist 2>$null | Out-Null

# ---------- 2. unregister ONLY WinIOS ----------
# el backup de la sesion Apple ID SIEMPRE antes, leyendo directo de la
# distro (el espejo en temp\xtool-config puede no existir aun). Pipe de
# binarios por cmd: el pipeline de powershell corrompe bytes.
if (-not $RemoveAppleID -and ((wsl.exe -l -q 2>$null) -split "`n") -contains $WslDist) {
    $tmpx = "$env:TEMP\winios-xtool-bak"
    Remove-Item $tmpx -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $tmpx | Out-Null
    cmd /c "wsl.exe -d $WslDist -u winios -- tar -C /home/winios -cf - .config/xtool 2>nul | tar.exe -xf - -C `"$tmpx`""
    if (Test-Path "$tmpx\.config\xtool") {
        New-Item -ItemType Directory -Force -Path $AuthBak | Out-Null
        Remove-Item "$AuthBak\xtool-config" -Recurse -Force -ErrorAction SilentlyContinue
        Move-Item "$tmpx\.config\xtool" "$AuthBak\xtool-config" -Force
        Ok "Apple ID session backed up at $AuthBak\xtool-config (reinstall reuses it)"
    }
    Remove-Item $tmpx -Recurse -Force -ErrorAction SilentlyContinue
}
Info "unregistering distro $WslDist..."
& wsl.exe -d $WslDist -- whoami 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    & wsl.exe --unregister $WslDist | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok "distro $WslDist removed" } else { Write-Host "FALLO unregister $WslDist" -ForegroundColor Red }
} else {
    Skip "$WslDist not present (already uninstalled)"
}
& wsl.exe -l -v 2>$null | Out-Host

# ---------- 3. TCP bridge + firewall (+ Apple driver with flag): single UAC ----------
$ps1Body = @'
$ErrorActionPreference = 'SilentlyContinue'
$proxies = netsh interface portproxy show all | Select-String '27015'
foreach ($p in $proxies) {
  $host_ip = (("$p") -split '\s+') | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1
  if ($host_ip) { netsh interface portproxy delete v4tov4 listenaddress=$host_ip listenport=27015 | Out-Null }
}
netsh advfirewall firewall delete rule name="Winios27015-in" | Out-Null
'@
if ($RemoveAppleDriver) {
    $ps1Body += @'

$srv = 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'
if (Test-Path $srv) {
  Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue | Stop-Service -Force
  Start-Sleep -Seconds 2
  $u = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like '*Apple Mobile Device Support*' -or $_.DisplayName -like '*AppleMobileDeviceSupport*' } |
    Select-Object -First 1
  if ($u -and $u.PSChildName -match '^\{') { msiexec /x $u.PSChildName /qn /norestart | Out-Null; Start-Sleep -Seconds 4 }
  if (Test-Path $srv) { Remove-Item 'C:\Program Files\Common Files\Apple\Mobile Device Support' -Recurse -Force }
}
'@
}
$ps1 = Join-Path $env:TEMP "winios-uninst.ps1"
Set-Content -Path $ps1 -Value $ps1Body -Encoding ASCII

$proxyLeft  = (& netsh interface portproxy show all 2>$null | Select-String "27015") -ne $null
$fwLeft     = (Get-NetFirewallRule -DisplayName "Winios27015-in" -ErrorAction SilentlyContinue) -ne $null
$driverLeft = (Test-Path 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe')
$needUac = $proxyLeft -or $fwLeft -or ($RemoveAppleDriver -and $driverLeft)
if ($needUac) {
    Info "cleaning bridge, firewall and Apple driver - accept the UAC prompt..."
    Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',$ps1
} else {
    Skip "no admin cleanup left (bridge/firewall already clean)"
}
Remove-Item $ps1 -ErrorAction SilentlyContinue

$proxyAfter = & netsh interface portproxy show all 2>$null | Select-String "27015"
if ($proxyAfter) {
    Write-Host "AVISO: una regla 27015 quedo - revisa 'netsh interface portproxy show all'" -ForegroundColor Yellow
} else { Ok "TCP bridge and firewall rule removed" }

if ($RemoveAppleDriver) {
    if (Test-Path 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe') {
        Write-Host "AVISO: el driver de Apple sigue presente - desinstalalo manualmente si lo deseas" -ForegroundColor Yellow
    } else { Ok "Apple iPhone driver removed" }
} else {
    Skip "Apple iPhone driver kept (shared with iTunes/iMazing)"
}

# ---------- 4. app data + Apple ID session ----------
if (Test-Path $BaseDir) {
    if (-not $RemoveAppleID) {
        New-Item -ItemType Directory -Force -Path $AuthBak | Out-Null
        $src = Join-Path $BaseDir "temp\xtool-config"
        $dst = Join-Path $AuthBak  "xtool-config"
        if ((Test-Path $src) -and -not (Test-Path $dst)) {
            Move-Item $src $dst -Force
            Ok "Apple ID session backed up at $dst (reinstall reuses it)"
        } elseif (Test-Path $dst) {
            Skip "Apple ID session already backed up in $dst"
        }
    }
    foreach ($sub in @("distro","wsl","temp")) {
        $p = Join-Path $BaseDir $sub
        if (Test-Path $p) { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue; Skip "deleted: $p" }
    }
    if ($RemoveAppleID -and (Test-Path $AuthBak)) {
        Remove-Item $AuthBak -Recurse -Force -ErrorAction SilentlyContinue
        Skip "Apple ID session backup deleted (you will log in again)"
    }
    $left = @(Get-ChildItem $BaseDir -ErrorAction SilentlyContinue)
    if ($left.Count -eq 0) { Remove-Item $BaseDir -Recurse -Force -ErrorAction SilentlyContinue }
    Ok "app data folder cleaned"
} else {
    Skip "%LOCALAPPDATA%\WiniOS not present"
}

# ---------- 4b. webview/config data of the app (tauri identifier) ----------
foreach ($d in @("$env:LOCALAPPDATA\studio.winios.app", "$env:APPDATA\studio.winios.app")) {
    if (Test-Path $d) { Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue; Skip "app data deleted: $d" }
}

# ---------- 5. installed app (NSIS) / dev build ----------
$instDirs = @(
    "$env:LOCALAPPDATA\WiniOS Studio",
    "$env:LOCALAPPDATA\Programs\WiniOS Studio",
    "${env:ProgramFiles}\WiniOS Studio"
) | Where-Object { Test-Path $_ }
foreach ($d in $instDirs) {
    $unins = Get-ChildItem $d -Filter "unins*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($unins) {
        Info "running the installed app uninstaller ($d)..."
        Start-Process $unins.FullName -ArgumentList '/S' -Wait
        Ok "app uninstalled from $d"
    } else {
        Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue
        Skip "deleted directly: $d"
    }
}
if ($IncludeCache -and (Test-Path "$Public\winios-build")) {
    Info "deleting dev build folder (C:\Users\Public\winios-build)..."
    Get-Process -Name "winios-studio" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Remove-Item "$Public\winios-build" -Recurse -Force -ErrorAction SilentlyContinue
    Ok "dev build deleted"
} else {
    Skip "dev build C:\Users\Public\winios-build kept (-IncludeCache deletes it)"
}

# ---------- 6. shortcut + helper scripts ----------
$lnk = "$env:USERPROFILE\Desktop\WiniOS Studio.lnk"
if (Test-Path $lnk) { Remove-Item $lnk -Force; Ok "Desktop shortcut deleted" }
foreach ($f in @("winios-init.sh","winios-deps.sh","winios-windows-setup.ps1","winios-setup.ps1")) {
    if (Test-Path "$Public\$f") { Remove-Item "$Public\$f" -Force; Skip "helper deleted: $Public\$f" }
}
if ($IncludeCache) {
    foreach ($f in @("ubuntu.rootfs.tar.gz","iTunes64Setup.exe","AppleMobileDeviceSupport64.msi")) {
        if (Test-Path "$Public\$f") { Remove-Item "$Public\$f" -Force; Skip "cache deleted: $Public\$f" }
    }
}

Write-Host ""
Ok "Uninstall complete."
Write-Host ""
Write-Host "Kept:" -ForegroundColor Cyan
if (-not $RemoveAppleID)     { Write-Host "  - Apple ID session backup (reinstall signs you in): $AuthBak\xtool-config" }
if (-not $IncludeCache)      { Write-Host "  - Download caches: -IncludeCache deletes them" }
if (-not $RemoveAppleDriver) { Write-Host "  - Apple iPhone driver (shared with iTunes/iMazing): -RemoveAppleDriver deletes it" }
Write-Host "  - Your Ubuntu and docker-desktop WSL distros: untouched"
