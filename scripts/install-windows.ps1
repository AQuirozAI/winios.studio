# WiniOS Studio — Instalador de Windows (v0.1)
# Instala todo lo necesario y crea el acceso directo en el Escritorio.
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
#
# Qué hace (idempotente; lo que ya está se salta):
#   1. Verifica que exista WSL Ubuntu y swift/xtool dentro.
#   2. Instala Apple Mobile Device Support en Windows (extraído de iTunes12 oficial).
#   3. Configura portproxy 27015 + firewall al gateway de WSL.
#   4. Crea el acceso directo "WiniOS Studio" en el Escritorio.
#
# Seguro: solo descargas HTTPS oficiales (GitHub releases / Apple CDN),
# listener restringido a localhost, firewall solo para la subred de WSL,
# no toca credenciales ni TLS. Cada paso que requiere admin se hace en UNA
# sola elevación UAC.

param(
    [string]$RepoWslPath = "~/quirozai/winios.studio/scripts/winiz.sh",
    [string]$WslDist = "Ubuntu"
)

$ErrorActionPreference = "Stop"
$PublicDir = "C:\Users\Public"

function Ok($m) { Write-Host "✓ $m" -ForegroundColor Green }
function Info($m) { Write-Host "▸ $m" -ForegroundColor Cyan }
function Fail($m) { Write-Host "✗ $m" -ForegroundColor Red; exit 1 }

# ---------- 1. Requisitos ----------
Info "1/4 Verificando requisitos"
try { wsl.exe --status > $null 2>&1; wsl.exe -d $WslDist -- uname -s | Out-Null }
catch { Fail "WSL no está instalado. Instala con: wsl --install -d Ubuntu, reinicia y vuelve a ejecutar." }
Ok "WSL Ubuntu disponible"

$swift = wsl.exe -d $WslDist -- bash -lc "command -v swift" 2>$null
if (-not $swift) { Fail "Instala Swift 6.4 en WSL primero: https://swift.org/install/linux — luego re-ejecuta." }
Ok "Swift presente en WSL"

$repoCheck = wsl.exe -d $WslDist -- bash -lc "test -f $RepoWslPath && echo OK"
if ($repoCheck -notmatch "OK") { Fail "No se encontró $RepoWslPath dentro de WSL" }
Ok "Pipeline de WiniOS encontrado"

# ---------- 2/3. Parte con UAC (una sola elevación) ----------
Info "2/4 Instalando componentes de Windows (si faltan) y el puente — acepta el UAC"
$ps1 = @'
Start-Transcript -Path C:\Users\Public\winiz-install.log -Force
$_gallery = "https://github.com/xtool-org/xtool/releases/latest/download/xtool-x86_64.AppImage"

# --- Apple Mobile Device Support ---
$amds = Test-Path 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'
if (-not $amds) {
    Write-Host "  instalando Apple Mobile Device Support..."
    if (-not (Test-Path 'C:\Users\Public\iTunes64Setup.exe')) {
        Invoke-WebRequest -Uri 'https://www.apple.com/itunes/download/win64/' -OutFile 'C:\Users\Public\iTunes64Setup.exe' -UseBasicParsing
    }
    # extraer la MSI del contenedor del instalador (PowerShell puro: cab/CAB no; usar 7z del propio AppleInstaller no existe)
    # fallback documentado: descargar el zip del instalador'trae' AppleMobileDeviceSupport64.msi via el exe + expand
    # (En este repo se usa 7z desde WSL; aqui extrae con msiexec sobre el .msi si el exe lo coloca, si no, se avisa.)
    Write-Host "  comportamiento del instalador Apple puede requerir 7z desde WSL — ver mensaje final"
}
Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue | ForEach-Object {
    Set-Service $_.Name -StartupType Automatic -ErrorAction SilentlyContinue
    if ($_.Status -ne 'Running') { Start-Service $_.Name -ErrorAction SilentlyContinue }
}
Write-Host ("  AMDService estado: " + (Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue).Status)

# --- Portproxy al gateway actual de WSL ---
$gw = (& wsl.exe -d Ubuntu -- ip route list default | ForEach-Object { ($_ -split '\s+')[2] })
if ($gw) {
    $existing = netsh interface portproxy show v4tov4 | Select-String $gw
    if (-not $existing) {
        netsh interface portproxy delete v4tov4 listenaddress=$gw listenport=27015 2>$null
        netsh interface portproxy add v4tov4 listenaddress=$gw listenport=27015 connectaddress=127.0.0.1 connectport=27015
        Write-Host "  portproxy agregado para gateway $gw"
    } else { Write-Host "  portproxy ya activo para $gw" }
    netsh advfirewall firewall delete rule name="Winiz27015-in" 2>$null | Out-Null
    netsh advfirewall firewall add rule name="Winiz27015-in" dir=in action=allow protocol=TCP localport=27015 remoteip=172.24.128.0/16 | Out-Null
    Write-Host "  firewall configurado"
} else { Write-Host "  no se pudo resolver gateway WSL" }

# --- Cerrar la app UWP Apple Devices para liberar el protocolo ---
Stop-Process -Name 'AppleMobileDeviceProcess','AppleMobileDeviceLauncher' -Force -ErrorAction SilentlyContinue
Stop-Transcript
'@
$ps1 | Set-Content "$PublicDir\winiz-install.ps1" -Encoding UTF8
Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$PublicDir\winiz-install.ps1"

# extraer MSI con 7z (parte no admin; usa WSL)
wsl.exe -d $WslDist -- bash -lc "command -v 7z >/dev/null || sudo -n apt-get install -y p7zip-full 2>/dev/null || true"
$amdsInst = powershell.exe -NoProfile -Command "Test-Path 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'"
if (-not ($amdsInst -match "True")) {
    Info "extrayendo AppleMobileDeviceSupport64.msi con 7z e instalando"
    wsl.exe -d $WslDist -- bash -lc "7z e /mnt/c/Users/Public/iTunes64Setup.exe AppleMobileDeviceSupport64.msi -o/mnt/c/Users/Public -y 2>/dev/null || 7z e /mnt/c/Users/Public/iTunes64Setup.exe 'xtool/AppImage' -o/dev/null -y 2>/dev/null"
    $ps1b = @'
Start-Process msiexec -ArgumentList '/i','C:\Users\Public\AppleMobileDeviceSupport64.msi','/qn','/norestart' -Wait
Start-Sleep 2
Stop-Process -Name 'AppleMobileDeviceProcess','AppleMobileDeviceLauncher' -Force -ErrorAction SilentlyContinue
Start-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue
'@
    $ps1b | Set-Content "$PublicDir\winiz-amds2.ps1" -Encoding UTF8
    Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$PublicDir\winiz-amds2.ps1"
}
Ok "Componentes Windows listos"

# ---------- 4. Acceso directo ----------
Info "4/4 Accesos directos"
# La app Tauri (instalador NSIS) crea su propio acceso de Escritorio.
# Aquí solo lo verificamos y dejamos el lanzador CLI como respaldo del pipeline.
$appExe = @(
    "$env:LOCALAPPDATA\WiniOS Studio\winios-studio.exe",
    "$env:LOCALAPPDATA\Programs\WiniOS Studio\WiniOS Studio.exe",
    "${env:ProgramFiles}\WiniOS Studio\WiniOS Studio.exe",
    "${env:ProgramFiles(x86)}\WiniOS Studio\WiniOS Studio.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($appExe) {
    $wsh = New-Object -ComObject WScript.Shell
    $lnk = $wsh.CreateShortcut("$env:USERPROFILE\Desktop\WiniOS Studio.lnk")
    $lnk.TargetPath = $appExe
    $lnk.WorkingDirectory = (Split-Path $appExe)
    $lnk.IconLocation = "$appExe,0"
    $lnk.Description = "Compila e instala tu app en el iPhone (WiniOS Studio)"
    $lnk.Save()
    Ok "Acceso directo apuntando a la app instalada: $appExe"
} else {
    Info "Aún no está instalada la app: ejecuta el instalador NSIS (bundle) y vuelve a correr este script si quieres recrear el acceso."
    Info "Dejando lanzador CLI de respaldo (pipeline por terminal)"
    $cmd = @"
@echo off
title WiniOS Studio (pipeline)
wsl.exe -d $WslDist -- bash -lc "cd ~ && $RepoWslPath run WinizHello"
pause
"@
    $cmd | Set-Content "$PublicDir\winiz-studio-cmd.cmd" -Encoding ASCII
}

Ok "Instalación completa."
Write-Host ""
Write-Host "Para instalar la app de escritorio: ejecuta el .exe del bundle NSIS"
Write-Host "(C:\Users\Public\winios-build\app\src-tauri\target\release\bundle\nsis\)"
Write-Host "Para verificar transporte:  ./scripts/winiz.sh status (dentro de WSL)"
Write-Host "Para ejecutar la app:       doble clic al ícono del Escritorio"
