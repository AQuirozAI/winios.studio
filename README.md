<div align="center">

<a href="https://aquirozai.github.io/winios.studio/"><img src="site/assets/og-winios-studio.jpg" width="960" alt="WiniOS Studio — Build iOS apps. From Windows. Open source, early preview." /></a>

# WiniOS Studio

**Your SwiftUI apps — built, signed, installed and verified on your iPhone. From Windows. No Mac needed.**

[![CI · Windows build](https://github.com/AQuirozAI/winios.studio/actions/workflows/ci.yml/badge.svg)](https://github.com/AQuirozAI/winios.studio/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/AQuirozAI/winios.studio?include_prereleases)](https://github.com/AQuirozAI/winios.studio/releases)
[![License](https://img.shields.io/badge/licencia-Apache--2.0-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-blue)](#requirements)
[![Engine](https://img.shields.io/badge/engine-xtool-232323)](https://github.com/xtool-org/xtool)
[![GUI](https://img.shields.io/badge/Tauri-2-24C6D5)](https://v2.tauri.app)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

English · [Español](README.es.md)

[Website](https://aquirozai.github.io/winios.studio/) · [Download](https://github.com/AQuirozAI/winios.studio/releases) · [Report an issue](https://github.com/AQuirozAI/winios.studio/issues)

> [!WARNING]
> **Early pre-release.** The full cycle is proven on one machine (Windows 11 + WSL2 + iPhone on iOS 27). See the [FAQ](#faq) before installing.

</div>

<!-- TODO(launch): 2–3 real screenshots (one-click setup · pipeline phases · app on iPhone) -->

WiniOS Studio is a desktop studio for **native iOS development on Windows**. A one-click assistant sets up everything that normally requires a Mac — the Swift toolchain, signing, and the phone — and an integrated pipeline builds, signs, installs and **verifies** your app on your iPhone, with evidence at every phase.

Under the hood it uses [xtool](https://github.com/xtool-org/xtool) (MIT) inside a dedicated, app-owned WSL distribution: your other installs are untouched, there is no backend, and your credentials never leave your machine.

## Features

- 🧙 **One-click setup** — prepares WSL, Swift, xtool, SDK, Apple ID and the iPhone bridge; idempotent and self-repairing
- 🧱 **SwiftUI + SwiftPM projects** — template with `Package.swift`, `xtool.yml` and a `git init` commit, ready to build
- 🚀 **“Run on my iPhone”** — a visible pipeline: *build → sign → package → connect → install → verify*
- 🔎 **States that don't lie** — *installed ≠ opened*; every error explained with its next action (2FA, certificates, cable, SDK)
- 🖥️ **Open in VS Code** — remote server in the distro with the official Swift extension and SourceKit-LSP ready
- 🌐 **EN/ES interface**

## Requirements

| | |
| --- | --- |
| 💻 Windows 10/11 (x64) | administrator rights once (UAC) |
| 🍎 Apple ID | a free account works for building and testing on your own iPhone |
| 📦 Xcode 27 `.xip` | requested once inside the app (Apple requires downloading it with your account) |
| 📱 iPhone + USB cable | unlocked, with *Trust this Computer* and **Developer Mode** enabled |

## Install

Download the installer from the latest [Release](https://github.com/AQuirozAI/winios.studio/releases) and run it:

1. The assistant sets up the whole environment (accept the permissions Windows asks for)
2. Drag in your `Xcode.xip` when prompted and sign in with your Apple ID
3. Connect your iPhone and press **Run on my iPhone**

### From source

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1
```

### CLI-only

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
```

```bash
./scripts/winiz.sh status          # environment + iPhone status
./scripts/winiz.sh new MyApp       # create a SwiftUI project
./scripts/winiz.sh run MyApp       # build + sign + install on the iPhone
```

## FAQ

**Do I need Apple's $99/year developer account?**
No — a **free Apple ID** is enough to build and run on *your own iPhone*. Free accounts have a 7-day provisioning expiry and a 2-certificate limit (both Apple rules; the app answers the certificate-revocation prompt for you). The paid program is required for the App Store, which is out of scope for v1.

**Is it legal without a Mac?**
Apple's Xcode & Apple SDKs agreement forbids installing Apple SDKs on non-Apple-branded hardware. WiniOS does not redistribute anything from Apple: you download your own `Xcode.xip` with your own account and sign with your own Apple ID — the same approach as xtool. Use it at your own risk, especially with corporate Apple IDs. *(“Apple”, “iPhone”, “Xcode” and “SwiftUI” are trademarks of Apple Inc. This project is not affiliated with or endorsed by Apple.)*

**Does it work with existing Xcode projects (`.xcodeproj`)?**
Not yet — projects are created with the engine's SwiftPM/SwiftUI template. Import is on the roadmap.

**Is there an iOS simulator or hot reload?**
No. The simulator and SwiftUI previews run only on macOS. The cycle here is: edit → run → the app installs and verifies on your iPhone (8.3 s first build, 0.8 s incremental). Automatic launch may fail on iOS 27; the app tells you and you open it on the phone.

**Can I edit in VS Code?**
Yes — one click configures the VS Code remote server inside the distro, with the Swift extension and the xtool build server ready.

## Architecture

```
Tauri 2 (Rust engine) ──scripts via stdin──▶ isolated WSL distro "WinIOS"
                                              │  Swift · xtool · projects
                                              ▼
                   Apple Mobile Device Service (Windows, tcp/27015)
                                              │  portproxy → WSL NAT gateway
                                              ▼
                                          📱 iPhone (USB, stays on Windows)
```

Every operation is a dedicated, validated engine command: the UI never emits free-form shell commands, secrets never leave your machine, and the device transport is resolved dynamically (the standard `usbipd` path fails during *Installing* with `AFCClient.Error.muxError` — solved here with Apple's Mobile Device Service plus a TCP bridge; [how it works](docs/research/2026-10-19-transport-iphone.md)).

## Roadmap

1. **v0.3 — built-in AI (Codex)**: ask for changes, review diffs, *Build & Fix*
2. **Real device preview** (capture the connected iPhone's screen)
3. **TestFlight pipeline** / distribution
4. **`.xcodeproj` import**
5. **Windows without WSL**

## Contributing

Concrete, reproducible issues are the best entry point — comment first for anything large. If your improvement touches the *toolchain* (transport, signing, SDK), consider contributing upstream to [xtool](https://github.com/xtool-org/xtool) first. See [CONTRIBUTING.md](CONTRIBUTING.md); security reports go to [SECURITY.md](SECURITY.md).

## Documentation

- [CHANGELOG.md](CHANGELOG.md) — release history
- [Research & specs](docs/) — market research, environment findings and product design docs
- [DESIGN.md](DESIGN.md) — UI design system
- [README.es.md](README.es.md) — Spanish version

## License

[Apache-2.0](LICENSE) · Copyright © 2026 AQuirozAI. This project does not redistribute Apple software; see the [FAQ](#faq) for legal context.
