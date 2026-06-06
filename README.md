<div align="center">
  <img src="public/app-icon.png" alt="Obsidian Mail Logo" width="120" height="120" style="border-radius: 24px; filter: drop-shadow(0px 4px 20px rgba(168, 85, 247, 0.25));" />

  # Obsidian Mail
  <img width="1527" height="918" alt="Screenshot 2026-06-03 190525" src="https://github.com/user-attachments/assets/782f6c80-bd9a-432b-9945-a452d3c221f6" />


  ### *A Sleek, Multi-Session Desktop Email Launcher with True Session Isolation*

  [![Tauri](https://img.shields.io/badge/Tauri-v2.x-3F8CEE?logo=tauri&logoColor=white&style=flat-square)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
  [![Tailwind](https://img.shields.io/badge/Tailwind--v4.x-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

  ---
</div>

**Obsidian Mail** is a premium desktop client designed for professionals managing multiple email accounts across Gmail, Outlook, iCloud, and custom services. Powered by **Tauri v2** and **React 19**, it attaches native webview containers directly inside a single-window layout to achieve absolute, hardware-level session and cookie isolation.

---

## ✨ Key Features

* 🔒 **True Cookie & Cache Isolation**  
  Each mailbox operates inside its own programmatically isolated system partition (`app_data_dir/sessions/account_[id]`). Log in to multiple work and personal accounts simultaneously without session pollution.
* 👤 **Workspace Profiles**  
  Organize accounts under distinct workspace profiles (e.g., Work, Personal, Clients). Switch between profiles instantly with a single click.
* ⚡ **Launch Workspace**  
  Pre-load and warm up all mailbox sessions within a profile simultaneously from the profile right-click menu, making transitions instant.
* 🔍 **Quick Command Palette (Ctrl+K)**  
  Search and navigate your entire catalog of mailboxes instantly by name or URL. Access it via `Ctrl+K` or the Search icon in the header. Shows service brand icons (Gmail, Outlook, iCloud) dynamically.
* 🧠 **Background Memory & Cache Controls**  
  - View running background mailboxes marked by a **glowing green status dot**.
  - Terminate individual background instances or clear their cache folder via the right-click menu.
  - Global dashboard settings to "Close All Instances" or clear all cache folders.
* 🖥️ **Desktop Close Integration (Minimize to Tray)**  
  Toggle "Minimize to System Tray" in Settings to run the app silently in the background on close, maintaining connection sessions.
* 🖱️ **Borderless & Ultra-Minimalist Grid**  
  Flat cards with high-contrast active states. Deleted borders entirely to keep the dashboard flat, clean, and modern.
* ⌨️ **Shortcut-Driven Interface**  
  - Press `1` through `8` on the launcher to open the corresponding mailbox instantly.
  - Press `Escape` or `Ctrl + H` inside any active mailbox session to slide back home to the launcher dashboard.
  - Press `Ctrl + K` to open the search command palette.

---

## 🛠️ Architecture Overview

```mermaid
graph TD
  A[React Frontend: Main Window] -->|IPC Invocation| B[Tauri Core: Rust Backend]
  B -->|WebviewBuilder data_dir| C[Isolated Webview: Gmail]
  B -->|WebviewBuilder data_dir| D[Isolated Webview: Outlook]
  B -->|WebviewBuilder data_dir| E[Isolated Webview: Custom URL]
  C -.->|Escape / Ctrl+H Key Listeners| B
  D -.->|Escape / Ctrl+H Key Listeners| B
```

* **Frontend (React 19, Tailwind v4, Bun)**: Manages local profiles/accounts storage, launcher search palettes, Base64 icon uploads, coordinates dock events, and listens to keyboard shortcuts.
* **Backend (Tauri v2, Rust)**: Exposes Tauri IPC commands to programmatically spawn, hide, resize, focus, or close isolated borderless webview windows as child webviews. Injects keyboard listeners into third-party domains to bubble key commands out to the main container.

---

## 🚀 Getting Started

### Prerequisites
* [NodeJS](https://nodejs.org/) or [Bun](https://bun.sh/) (Recommended)
* [Rust Compiler & Cargo Toolchain](https://www.rust-lang.org/tools/install)
* Build tools for your OS (e.g., C++ Build Tools on Windows, Xcode Command Line Tools on macOS)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/obsidian-mail.git
   cd obsidian-mail
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Run the application in Development Mode:**
   ```bash
   bun tauri dev
   ```

4. **Package the Production Installer:**
   This generates ready-to-use `.msi` and `.exe` installer packages under `src-tauri/target/release/bundle/`:
   ```bash
   bun tauri build
   ```

---

## ⌨️ Shortcut Keys Cheatsheet

| Shortcut Key | Action | Location |
|---|---|---|
| `1` - `8` | Open mailbox profile at index | Launcher Dashboard |
| `Ctrl + K` | Open Quick Search / Command Palette | Launcher Dashboard |
| Right-click Card | Open context menu (Edit settings, Close instance, Clear Cache, Delete) | Launcher Dashboard |
| Right-click Profile Tab | Open profile menu (Rename profile, Launch Workspace, Delete) | Launcher Dashboard |
| `Escape` | Return to Launcher | Active Webview Session |
| `Ctrl + H` | Return to Launcher | Active Webview Session |

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
