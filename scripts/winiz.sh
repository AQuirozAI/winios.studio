#!/usr/bin/env bash
# WiniOS Studio — pipeline de un solo comando (probado en este equipo el 2026-10-19).
#
#   ./scripts/winiz.sh status          · estado completo (entorno + iPhone)
#   ./scripts/winiz.sh install         · asegura xtool, AMDService y el puente TCP
#   ./scripts/winiz.sh run [proyecto]  · compilar + firmar + instalar en el iPhone
#   ./scripts/winiz.sh new <Nombre>    · crea un proyecto SwiftUI nuevo
#
# Transporte: Apple Mobile Device Service (iTunes) escucha usbmux en 127.0.0.1:27015
# en Windows; un portproxy lo expone a la puerta de enlace NAT de WSL y libusbmuxd
# accede vía USBMUXD_SOCKET_ADDRESS=<gateway>:27015 (calculada dinámicamente).
# El iPhone debe quedarse en Windows (NO usar usbipd attach) y el teléfono
# desbloqueado durante la instalación.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
XTOOL="$HOME/.local/bin/xtool"
TOOLS_DIR="$REPO/tools/xtool"
APPIMAGE="$TOOLS_DIR/xtool.AppImage"
GATEWAY="$(ip route list default | awk '{print $3}')"
export USBMUXD_SOCKET_ADDRESS="${GATEWAY}:27015"

desc() { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

grep -qi microsoft /proc/version || fail "Esto corre dentro de WSL (Ubuntu)."

amds_service_running() { # Windows: servicio Apple escuchando + puerto accesible
  powershell.exe -NoProfile -Command "(Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue).Status -eq 'Running' -and ((Get-NetTCPConnection -LocalPort 27015 -State Listen -ErrorAction SilentlyContinue) -ne \$null)" 2>/dev/null | grep -qi true
}
bridge_ok() { timeout 3 bash -c "echo > /dev/tcp/$GATEWAY/27015" 2>/dev/null; }
device_visible() { timeout 20 xtool devices --usb --no-wait 2>/dev/null | grep -q "00008140\|\[usb\]" || idevice_id -l 2>/dev/null | head -1; }

cmd_status() {
  desc "Entorno"
  command -v swift >/dev/null && ok "Swift $(swift --version 2>&1 | head -1 | grep -o '[0-9]*\.[0-9]*\.[0-9]*' | head -1)" || warn "Swift no instalado"
  [ -x "$APPIMAGE" ] && ok "xtool $("$APPIMAGE" --version 2>/dev/null)" || warn "xtool no instalado ($(basename $XTOOL) apuntará a él)"
  "$APPIMAGE" auth status 2>/dev/null | head -1 | grep -q 'Logged in' && ok "Sesión Apple activa" || warn "Sesión Apple requerida: '$APPIMAGE' setup"
  "$APPIMAGE" sdk status 2>/dev/null | grep -qi 'installed' && ok "SDK Darwin instalado" || warn "SDK ausente"
  pgrep -x usbmuxd >/dev/null && warn "usbmuxd local corre (no debe pelear con el bridge; no ocurre a menos que use usbip)" || true
  desc "Transporte iPhone"
  if amds_service_running; then ok "Apple Mobile Device Service (Windows): corre y escucha 27015"
  else warn "AMDService ausente o sin listener — corre $0 install"; fi
  if bridge_ok; then ok "Puerto $GATEWAY:27015 alcanzable desde WSL"
  else warn "Puente no accesible — portproxy apagado o firewall; corre $0 install"; fi
  if DEV=$(device_visible); then ok "iPhone visible via bridge: $DEV"
  else warn "iPhone no visible (debe estar en Windows, sin usbip attach, y el AppleDevices app cerrado)"; fi
}

cmd_install() {
  [ -x "$APPIMAGE" ] || {
    desc "Descargando xtool (AppImage oficial)"
    mkdir -p "$TOOLS_DIR"
    curl -fL "https://github.com/xtool-org/xtool/releases/latest/download/xtool-$(uname -m).AppImage" -o "$APPIMAGE"
    chmod +x "$APPIMAGE"; }
  ok "$("$APPIMAGE" --version)"
  [ -e "$XTOOL" ] || { desc "creando wrapper ~/.local/bin/xtool"; printf '#!/usr/bin/env bash\nexport USBMUXD_SOCKET_ADDRESS="$(ip route list default | awk '\''{print $3}'\''):27015"\nexec %s "$@"\n' "$APPIMAGE" > "$XTOOL"; chmod +x "$XTOOL"; }
  if ! amds_service_running; then
    desc "Necesita instalar Apple Mobile Device Support (via iTunes installer) — UAC aparecerá"
    powershell.exe -NoProfile -Command "Test-Path 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'" 2>/dev/null | grep -qi true || {
      [ -f "/mnt/c/Users/Public/iTunes64Setup.exe" ] || powershell.exe -NoProfile -Command "Invoke-WebRequest -Uri 'https://www.apple.com/itunes/download/win64/' -OutFile 'C:\Users\Public\iTunes64Setup.exe' -UseBasicParsing"
      7z e /mnt/c/Users/Public/iTunes64Setup.exe AppleMobileDeviceSupport64.msi -o/mnt/c/Users/Public -y >/dev/null 2>&1
      cat > /mnt/c/Users/Public/winiz-amds.ps1 <<'PS1'
Stop-Process -Name 'AppleMobileDeviceProcess','AppleMobileDeviceLauncher' -Force -ErrorAction SilentlyContinue
Start-Process msiexec -ArgumentList '/i','C:\Users\Public\AppleMobileDeviceSupport64.msi','/qn','/norestart' -Wait
Start-Sleep 2
Start-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue
start_itunes
PS1
      powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','C:\Users\Public\winiz-amds.ps1'"
    }
  fi
  if ! bridge_ok; then
    desc "Portproxy/firewall: UAC aparecerá"
    cat > /mnt/c/Users/Public/winiz-bridge.ps1 <<'PS1'
netsh interface portproxy add v4tov4 listenaddress=$args[0] listenport=27015 connectaddress=127.0.0.1 connectport=27015 2>$null
netsh advfirewall firewall add rule name="Winiz27015-in" dir=in action=allow protocol=TCP localport=27015 remoteip=172.24.128.0/16 2>$null
PS1
    # el listenaddress se fija al gateway actual:
    sed -i "s/\$args\[0\]/$GATEWAY/" /mnt/c/Users/Public/winiz-bridge.ps1
    powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','C:\Users\Public\winiz-bridge.ps1'"
  fi
  ok "instalación de transporte completa"; cmd_status
}

cmd_run() {
  local proj="${1:-WinizHello}" dir="$REPO/projects/$proj"
  [ -d "$dir" ] || fail "Proyecto no existe: $dir (crea con $0 new $proj)"
  amds_service_running && bridge_ok || { cmd_install; }
  powershell.exe -NoProfile -Command "Stop-Process -Name 'AppleMobileDeviceProcess','AppleMobileDeviceLauncher' -Force -ErrorAction SilentlyContinue" 2>/dev/null || true
  desc "Instalando $proj en tu iPhone"
  (cd "$dir" && "$APPIMAGE" dev run --configuration debug --usb) 2>&1 | sed 's/\r/\n/g' | grep -vE "^\s*$" || true
  # bundle id efectivo (Apple antepone el Team ID con cuentas gratuitas)
  BUNDLE=$(ideviceinstaller list --user 2>/dev/null | awk -F, 'NR>1 && $1 ~ /'"$proj"'$/ {print $1}' | head -1)
  if [ -n "$BUNDLE" ]; then
    ok "Instalada: $BUNDLE"
    warn "El lanzamiento automático puede fallar en iOS 27 (debugserver sin DDI en Windows); abre la app manualmente o reintentar con:"
    echo "    xtool launch --udid \$(idevice_id -l | xargs) --usb $BUNDLE"
  else
    fail "No se detectó la instalación — revisar '$0 status' y el log completo."
  fi
}

cmd_new() {
  [ "${1:-}" ] || fail "Uso: $0 new <Nombre>"
  desc "Creando proyecto $1"
  (cd "$REPO/projects" && "$APPIMAGE" new "$1" --skip-setup)
  ok "Proyecto en $REPO/projects/$1"
}

case "${1:-status}" in
  status)  cmd_status ;;
  install) cmd_install ;;
  run)     shift; cmd_run "$@" ;;
  new)     shift; cmd_new "$@" ;;
  *)       fail "Comando desconocido: $1" ;;
esac
