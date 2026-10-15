# Running Curvada's Kitchen Locally

This guide explains how to start the **Curvada's Kitchen** Frontend and Standalone Backend simultaneously using the startup script or direct npm commands.

---

## 🚀 Port Overview (Conflict-Free)

| Service | Port / URL | Description |
|---|---|---|
| **Frontend Web App** | [`http://localhost:3000`](http://localhost:3000) | Vite + React application |
| **Backend API** | [`http://localhost:5050/api/v1`](http://localhost:5050/api/v1) | Express REST API |
| **Backend WebSocket** | `ws://localhost:5050/ws` | Real-time live order sync |
| **PigeonPro Backend** | [`http://localhost:5000`](http://localhost:5000) | Separate app (runs on 5000 with no conflict) |

---

## ⚡ Option 1: Run via PowerShell Script (Recommended for Windows)

From the project root directory (`d:\DEVELOPMENT\curvada's-kitchen`), open a PowerShell terminal and run:

```powershell
.\start-local.ps1
```

> **Note on PowerShell Script Execution Policy:**  
> If PowerShell blocks the script with an execution policy error, you can run it using:
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\start-local.ps1
> ```

### What this script automatically does:
1. Verifies if frontend `node_modules` exists; runs `npm install` if missing.
2. Verifies if backend `node_modules` exists; runs `npm --prefix backend install` if missing.
3. Launches both backend and frontend concurrently in a single terminal with labeled, color-coded logs (`BE` & `FE`).

---

## 💻 Option 2: Run via NPM Command directly

If you prefer using regular npm commands in any terminal (PowerShell, CMD, Git Bash):

```bash
npm run dev:all
```

---

## 🛠️ Option 3: Run Backend and Frontend in Separate Terminals

If you prefer dedicated terminal tabs for each service:

### Terminal 1: Backend (Port 5050)
```bash
npm run dev:be
# or:
cd backend
npm run dev
```

### Terminal 2: Frontend (Port 3000)
```bash
npm run dev:fe
# or:
npm run dev
```

---

## 🛑 How to Stop

Press `Ctrl + C` in the running terminal to terminate both the frontend and backend servers.
