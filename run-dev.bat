@echo off
echo ===================================================
echo Starting Curvada's Kitchen Development Environment
echo ===================================================

REM Check for node_modules folder
if not exist node_modules (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your Node.js installation.
        pause
        exit /b %errorlevel%
    )
)

REM Check for .env.local file
if not exist .env.local (
    echo [WARNING] .env.local not found!
    if exist .env.example (
        echo [INFO] Creating .env.local from .env.example...
        copy .env.example .env.local > nul
        echo [IMPORTANT] Please open .env.local and add your GEMINI_API_KEY!
    ) else (
        echo [ERROR] .env.example not found. Cannot create .env.local template.
    )
)

echo [INFO] Starting Vite development server...
call npm run dev
