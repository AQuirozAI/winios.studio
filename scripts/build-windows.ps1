# WiniOS Studio - build para Windows (desde Windows o WSL via powershell interop)
#   Rapido y con progreso en vivo: todo el output de cargo/tauri se transmite
#   tal cual (nada de logs ocultos), el toolchain se comprueba en 1 s y la
#   compilacion es incremental (target/ persiste entre corridas).
# Uso:  powershell -ExecutionPolicy Bypass -File .\build-windows.ps1 [-Launch]
param([switch]$Launch)
$ErrorActionPreference = "Continue"
$BuildDir = "C:\Users\Public\winios-build"
$RepoWsl = "\\wsl.localhost\Ubuntu\home\lex\quirozai\winios.studio"

function Ok($m)  { Write-Host "OK  $m" -ForegroundColor Green }
function Info($m){ Write-Host ">>  $m" -ForegroundColor Cyan }
function Fail($m){ Write-Host "FALLO  $m" -ForegroundColor Red; exit 1 }

$t0 = Get-Date

# 1. Sincronizar fuente desde WSL (sin target/: el build vive en Windows)
Info "1/4 Sincronizando fuente (~segundos)"
robocopy "$RepoWsl\app" "$BuildDir\app" /E /NFL /NDL /NJH /NJS /MT:8 | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy fallo ($LASTEXITCODE)" }
Ok "fuente sincronizada"

# 2. Toolchain: comprobar; solo instala si falta (sin bloquear en rustup update)
$cargoOk = $false
if (Get-Command cargo -ErrorAction SilentlyContinue) { $cargoOk = $true }
elseif (Test-Path "$env:USERPROFILE\.cargo\bin\cargo.exe") {
  $env:Path += ";$env:USERPROFILE\.cargo\bin"; $cargoOk = $true
}
if (-not $cargoOk) {
  Info "Instalando Rust (rustup, usuario) - una sola vez"
  Invoke-WebRequest -UseBasicParsing https://win.rustup.rs/x86_64 -OutFile "C:\Users\Public\rustup-init.exe"
  & "C:\Users\Public\rustup-init.exe" -y --default-toolchain stable-msvc | Out-Null
  $env:Path += ";$env:USERPROFILE\.cargo\bin"
}
& cargo --version; Ok "Rust listo"

# 3. tauri-cli prebuilt (una sola vez)
$cli = "C:\Users\Public\cargo-tauri.exe"
if (-not (Test-Path $cli)) {
  Info "descargando tauri-cli prebuilt - una sola vez"
  Invoke-WebRequest -UseBasicParsing "https://github.com/tauri-apps/tauri/releases/download/tauri-cli-v2.12.3/cargo-tauri-x86_64-pc-windows-msvc.zip" -OutFile "C:\Users\Public\cargo-tauri.zip"
  Expand-Archive -Force "C:\Users\Public\cargo-tauri.zip" "$BuildDir\cli"
  $exe = Get-ChildItem "$BuildDir\cli" -Recurse -Filter "cargo-tauri.exe" | Select-Object -First 1
  Copy-Item $exe.FullName $cli
}
& $cli --version; Ok "tauri-cli listo"

# 4. Build release + bundle NSIS con progreso EN VIVO (cada linea Compiling…)
Info "4/4 Compilando release + NSIS (progreso en vivo)"
Push-Location "$BuildDir\app\src-tauri"
try {
  & $cli build 2>&1 | ForEach-Object { Write-Host "    $_" }
  if ($LASTEXITCODE -ne 0) { Fail "tauri build exit=$LASTEXITCODE" }
}
finally { Pop-Location }

$nsis = "$BuildDir\app\src-tauri\target\release\bundle\nsis"
if (-not (Test-Path "$nsis")) { Fail "sin bundle NSIS" }
$setup = (Get-ChildItem $nsis -Filter "*-setup.exe" | Select-Object -First 1).FullName
Copy-Item $setup "$RepoWsl\dist\" -Force
Ok "instalador copiado a dist\ del repo"
Ok ("build completa en {0:n0} s" -f ((Get-Date) - $t0).TotalSeconds)

if ($Launch) {
  Info "lanzando WiniOS Studio"
  Start-Process "$BuildDir\app\src-tauri\target\release\winios-studio.exe"
}
