# WiniOS Studio — build para Windows (ejecuta DESDE Windows o from WSL via powershell interop)
# Requiere: Rust (MSVC) en Windows. Instala tauri-cli prebuilt; empaqueta NSIS.
# Uso powershell: .\build-windows.ps1
$ErrorActionPreference = "Stop"
$BuildDir = "C:\Users\Public\winios-build"
$RepoWsl = "\\wsl.localhost\Ubuntu\home\lex\quirozai\winios.studio"

function Ok($m) { Write-Host "OK  $m" -ForegroundColor Green }
function Info($m) { Write-Host ">>  $m" -ForegroundColor Cyan }
function Fail($m) { Write-Host "FALLO  $m" -ForegroundColor Red; exit 1 }

# 1. Sincronizar fuente desde WSL
Info "Sincronizando fuente"
robocopy "$RepoWsl\app" "$BuildDir\app" /E /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy fallo ($LASTEXITCODE)" }
Ok "fuente sincronizada"

# 2. Toolchain: rustc/cargo
$cargo = (Get-Command cargo -ErrorAction SilentlyContinue)
if (-not $cargo) {
  $rustup = "$env:USERPROFILE\.cargo\bin\cargo.exe"
  if (Test-Path $rustup) { $env:Path += ";$env:USERPROFILE\.cargo\bin"; $cargo = Get-Item $rustup }
}
if (-not ($cargo -and ($cargo.Source -and (Test-Path $cargo.Source)))) {
  Info "Instalando Rust (rustup, usuario)"
  Invoke-WebRequest -UseBasicParsing https://win.rustup.rs/x86_64 -OutFile "C:\Users\Public\rustup-init.exe"
  & "C:\Users\Public\rustup-init.exe" -y --default-toolchain stable-msvc | Out-Null
  $env:Path += ";$env:USERPROFILE\.cargo\bin"
}
& cargo --version; Ok "Rust listo"

# 3. tauri-cli prebuilt
$cli = "C:\Users\Public\cargo-tauri.exe"
if (-not (Test-Path $cli)) {
  Info "descargando tauri-cli prebuilt"
  Invoke-WebRequest -UseBasicParsing "https://github.com/tauri-apps/tauri/releases/download/tauri-cli-v2.12.3/cargo-tauri-x86_64-pc-windows-msvc.zip" -OutFile "C:\Users\Public\cargo-tauri.zip"
  Expand-Archive -Force "C:\Users\Public\cargo-tauri.zip" "$BuildDir\cli"
  $exe = Get-ChildItem "$BuildDir\cli" -Recurse -Filter "cargo-tauri.exe" | Select-Object -First 1
  Copy-Item $exe.FullName $cli
}
& $cli --version; Ok "tauri-cli listo"

# 4. Build release + bundle NSIS (native stderr se escribe a log, no rompe el script)
Push-Location "$BuildDir\app\src-tauri"
$p = Start-Process -FilePath $cli -ArgumentList "build" -NoNewWindow -Wait -PassThru `
  -RedirectStandardOutput "$BuildDir\build-out.log" -RedirectStandardError "$BuildDir\build-err.log"
Pop-Location
Write-Host ("tauri build exit=" + $p.ExitCode)
Get-Content "$BuildDir\build-err.log" -Tail 12 -ErrorAction SilentlyContinue
if ($p.ExitCode -ne 0) { Write-Host ("ULTIMAS LINEAS DE STDOUT:"); Get-Content "$BuildDir\build-out.log" -Tail 20 -ErrorAction SilentlyContinue; exit $p.ExitCode }
Ok "Build completa. Artefactos:"
Get-ChildItem "$BuildDir\app\src-tauri\target\release\bundle\nsis" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("  bundle: " + $_.FullName) }
