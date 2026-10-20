# WiniOS Studio — Instalador de Windows (v0.2 · distro aislada)
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
#
# Qué hace (idempotente; lo que ya está se salta):
#   0. Activa la plataforma WSL SOLO si no existe. Con --no-distribution: nunca
#      crea ni registra la distro "Ubuntu" del usuario.
#   1. Crea la distro aislada "WinIOS" con `wsl --import` desde el rootfs
#      oficial de Ubuntu 24.04 (cloud-images.ubuntu.com). Vive en
#      %LOCALAPPDATA%\WiniOS, con usuario dedicado "winios" y sudo sin
#      contraseña. NO toca ninguna otra distribución WSL del equipo.
#   2. Instala dependencias + Swift 6.4.1 + xtool dentro de WinIOS (100% automático).
#   3. Instala Apple Mobile Device Support y configura portproxy + firewall
#      con UNA sola elevación UAC.
#   4. Crea el acceso directo en el Escritorio.
#
# La app de escritorio (bundle NSIS) repite el mismo pipeline al primer
# arranque, de modo que instalar solo el .exe del bundle también termina
# configurando todo.
#
# Seguro: solo descargas HTTPS oficiales (Canonical / Apple / GitHub).

param(
    [string]$WslDist = "WinIOS",
    [string]$WslUser = "winios",
    [string]$SwiftVersion = "6.4.1"
)
$ErrorActionPreference = "Continue"
$Public = "C:\Users\Public"
$BaseDir   = Join-Path $env:LOCALAPPDATA "WiniOS"
$WslDir    = Join-Path $BaseDir "wsl"
$DistroDir = Join-Path $BaseDir "distro"
$RootFs    = Join-Path $WslDir "ubuntu.rootfs.tar.gz"
$RootFsUrl = "https://cloud-images.ubuntu.com/wsl/releases/24.04/current/ubuntu-noble-wsl-amd64-24.04lts.rootfs.tar.gz"

function Ok($m)  { Write-Host "OK  $m" -ForegroundColor Green }
function Info($m){ Write-Host ">>  $m" -ForegroundColor Cyan }
function Fail($m){ Write-Host "FALLO $m" -ForegroundColor Red; exit 1 }

# escribe un script bash en Public con finales LF (bash no tolera CRLF)
function Write-BashSh($path, $text) {
    $text -replace "`r`n", "`n" | Set-Content -Path $path -Encoding ASCII
    Info "script listo: $path"
}

# ---------- 0/4 Plataforma WSL ----------
Info "0/4 Plataforma WSL"
$global:LASTEXITCODE = 1
& wsl.exe --status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Info "WSL no esta activo: activandolo (Windows puede pedir permisos y reinicio)"
    & wsl.exe --install --no-distribution --web-download
    $global:LASTEXITCODE = 1
    & wsl.exe --status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Fail "Reinicia Windows para terminar de activar WSL y vuelve a ejecutar este instalador."
    }
}
Ok "Plataforma WSL activa"

# ---------- 1/4 Distro aislada ----------
Info "1/4 Distro aislada $WslDist (no toca tus otras distros)"
$me = (& wsl.exe -d $WslDist -u $WslUser -- whoami 2>$null)
if ("$me".Trim() -eq $WslUser) {
    Ok "$WslDist ya esta lista"
}
else {
    & wsl.exe -d $WslDist -- whoami 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Info "$WslDist existia incompleta — recreandola (solo ese nombre; es una distro de la app)"
        & wsl.exe --unregister $WslDist | Out-Null
    }
    New-Item -ItemType Directory -Force -Path $WslDir    | Out-Null
    New-Item -ItemType Directory -Force -Path $DistroDir | Out-Null
    if (-not (Test-Path $RootFs)) {
        Info "descargando Ubuntu 24.04 aislado (~370 MB, oficial de Canonical)…"
        $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -UseBasicParsing -Uri $RootFsUrl -OutFile $RootFs
    }
    Info "importando la distro $WslDist…"
    & wsl.exe --import $WslDist $DistroDir $RootFs --version 2
    if ($LASTEXITCODE -ne 0) {
        & wsl.exe --import $WslDist $DistroDir $RootFs
        if ($LASTEXITCODE -ne 0) { Fail "no se pudo importar la distro $WslDist" }
    }
    Info "configurando usuario dedicado ($WslUser) sin contraseñas…"
    Write-BashSh "$Public\winios-init.sh" @'
useradd -m -s /bin/bash winios 2>/dev/null || true
mkdir -p /etc/sudoers.d /home/winios/studio/tools/xtool /home/winios/studio/projects
printf 'winios ALL=(ALL) NOPASSWD:ALL\n' > /etc/sudoers.d/winios
chmod 440 /etc/sudoers.d/winios
printf '[user]\ndefault=winios\n' > /etc/wsl.conf
chown -R winios:winios /home/winios
echo "USUARIO-LISTO"
'@
    & wsl.exe -d $WslDist -u root -- bash /mnt/c/Users/Public/winios-init.sh
    if ($LASTEXITCODE -ne 0) { Fail "no se pudo configurar el usuario de $WslDist" }
    & wsl.exe --terminate $WslDist | Out-Null
    Start-Sleep -Seconds 2
    $me = (& wsl.exe -d $WslDist -u $WslUser -- whoami 2>$null)
    if ("$me".Trim() -ne $WslUser) { Fail "$WslDist no respondio tras su configuracion" }
    Ok "Distro aislada $WslDist lista (en $DistroDir)"
}

# ---------- 2/4 Dependencias + Swift + xtool (automático, sin preguntas) ----------
Info "2/4 Dependencias, Swift $SwiftVersion y xtool dentro de $WslDist"
Write-BashSh "$Public\winios-deps.sh" @'
set -e
export DEBIAN_FRONTEND=noninteractive
echo ">> dependencias de compilacion"
sudo apt-get update -qq 2>/dev/null
DEPS='binutils gcc git gnupg2 libc6-dev libcurl4-openssl-dev libedit2 libgcc-13-dev \
libncurses-dev libpython3-dev libsqlite3-0 libstdc++-13-dev libxml2-dev libz3-dev \
pkg-config tzdata unzip zlib1g-dev p7zip-full curl ca-certificates xz-utils'
dep_install() { sudo apt-get install -y "$@" >/dev/null 2>&1; }
dep_install $DEPS libfuse2t64 || dep_install $DEPS libfuse2 || dep_install $DEPS || true
echo ">> Swift __SWIFT__"
if ! command -v swift >/dev/null 2>&1; then
  curl -fL "https://download.swift.org/swift-__SWIFT__-release/ubuntu2404/swift-__SWIFT__-RELEASE/swift-__SWIFT__-RELEASE-ubuntu24.04.tar.gz" -o /tmp/swift.tgz
  sudo rm -rf /opt/swift
  sudo mkdir -p /opt/swift
  sudo tar -xzf /tmp/swift.tgz -C /opt/swift --strip-components=1
  sudo rm -f /tmp/swift.tgz
  printf 'export PATH="/opt/swift/usr/bin:$PATH"\n' | sudo tee /etc/profile.d/swift.sh >/dev/null
fi
export PATH="/opt/swift/usr/bin:$HOME/.local/bin:$PATH"
command -v gcc >/dev/null 2>&1 || { echo "FALLO: dependencias de compilacion"; exit 1; }
command -v swift >/dev/null 2>&1 || { echo "FALLO: Swift no quedo operativo"; exit 1; }
echo ">> xtool"
APP="$HOME/studio/tools/xtool/xtool.AppImage"
mkdir -p "$(dirname "$APP")"
if [ ! -x "$APP" ]; then
  curl -fL "https://github.com/xtool-org/xtool/releases/latest/download/xtool-$(uname -m).AppImage" -o "$APP.tmp"
  mv "$APP.tmp" "$APP" && chmod +x "$APP"
fi
"$APP" --version
mkdir -p "$HOME/.local/bin"
printf '#!/usr/bin/env bash\nexport USBMUXD_SOCKET_ADDRESS="$(ip route list default | awk '\''{print $3}'\''):27015"\nexec %s "$@"\n' "$APP" > "$HOME/.local/bin/xtool"
chmod +x "$HOME/.local/bin/xtool"
echo ">> proyecto de ejemplo"
if [ ! -d "$HOME/studio/projects/WinizHello" ]; then
  (cd "$HOME/studio/projects" && "$APP" new WinizHello --skip-setup) >/dev/null 2>&1 || true
fi
echo "OK-ENTORNO-LISTO"
'@
# sustituye el placeholder de la versión de Swift y deja el archivo final en ASCII/LF
(Get-Content "$Public\winios-deps.sh" -Raw) -replace "__SWIFT__", $SwiftVersion |
    Set-Content "$Public\winios-deps.sh" -Encoding ASCII -NoNewline
& wsl.exe -d $WslDist -u $WslUser -- bash /mnt/c/Users/Public/winios-deps.sh
if ($LASTEXITCODE -ne 0) { Fail "la instalacion de dependencias dentro de $WslDist fallo" }
Ok "Entorno de compilacion listo dentro de $WslDist"

# ---------- 3/4 Apple Mobile Device Support + puente TCP (UNA elevación UAC) ----------
Info "3/4 Componentes de Apple y puente Windows->WSL — acepta el UAC"
$amdsInstalled = Test-Path 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'
if (-not $amdsInstalled) {
    if (-not (Test-Path "$Public\iTunes64Setup.exe")) {
        Info "descargando instalador oficial de Apple (iTunes; porta el driver del iPhone)…"
        $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -Uri 'https://www.apple.com/itunes/download/win64/' -OutFile "$Public\iTunes64Setup.exe" -UseBasicParsing
    }
    Info "extrayendo AppleMobileDeviceSupport64.msi (7z dentro de $WslDist)…"
    & wsl.exe -d $WslDist -u $WslUser -- 7z e /mnt/c/Users/Public/iTunes64Setup.exe AppleMobileDeviceSupport64.msi -o/mnt/c/Users/Public -y
    if (-not (Test-Path "$Public\AppleMobileDeviceSupport64.msi")) {
        Info "no se pudo extraer el MSI — continua la app de escritorio, que reintenta con su asistente"
    }
}

$gw = ""
$gwLine = (& wsl.exe -d $WslDist -u $WslUser -- ip route list default 2>$null) | Where-Object { $_ } | Select-Object -First 1
if ($gwLine) { $gw = ((("$gwLine") -split '\s+') | Where-Object { $_ })[2] }
if (-not $gw) { Info "no se pudo resolver el gateway de WSL — el puente se configura con la app" }

$winps1 = "$Public\winios-windows-setup.ps1"
@"
`$gw = '$gw'
`$msi = 'C:\Users\Public\AppleMobileDeviceSupport64.msi'
`$srv = 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'
if ((Test-Path `$msi) -and -not (Test-Path `$srv)) {
  Start-Process msiexec -ArgumentList '/i',`$msi,'/qn','/norestart' -Wait
  Start-Sleep -Seconds 2
}
Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue | ForEach-Object {
  Set-Service `$_.Name -StartupType Automatic -ErrorAction SilentlyContinue
  if (`$_.Status -ne 'Running') { Start-Service `$_.Name -ErrorAction SilentlyContinue }
}
Stop-Process -Name 'AppleMobileDeviceProcess','AppleMobileDeviceLauncher' -Force -ErrorAction SilentlyContinue
if (`$gw) {
  netsh interface portproxy delete v4tov4 listenaddress=`$gw listenport=27015 2>`$null | Out-Null
  netsh interface portproxy add v4tov4 listenaddress=`$gw listenport=27015 connectaddress=127.0.0.1 connectport=27015 | Out-Null
  netsh advfirewall firewall delete rule name="Winios27015-in" 2>`$null | Out-Null
  netsh advfirewall firewall add rule name="Winios27015-in" dir=in action=allow protocol=TCP localport=27015 remoteip=172.16.0.0/12 | Out-Null
}
"@ | Set-Content $winps1 -Encoding UTF8
Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',$winps1

$srvState = (Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue).Status
Ok "Servicio Apple: $srvState"

# ---------- 4/4 Acceso directo ----------
Info "4/4 Acceso directo"
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
    Ok "Acceso directo -> $appExe"
} else {
    Info "Aun no esta instalada la app: ejecuta el instalador NSIS del bundle (en su primer arranque se configura todo solo)"
    Info "(paquete en C:\Users\Public\winios-build\app\src-tauri\target\release\bundle\nsis\ tras compilar)"
}

Ok "Instalacion completa — tu Ubuntu de siempre no fue tocado."
Write-Host ""
Write-Host "Distro aislada:  wsl -d $WslDist -u $WslUser" -ForegroundColor Cyan
Write-Host "Ver transporte:  wsl -d $WslDist -u $WslUser -- bash -lc 'xtool devices --usb --no-wait'" -ForegroundColor Cyan
