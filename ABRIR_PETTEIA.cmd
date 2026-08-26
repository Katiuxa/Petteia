@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  start "" "%~dp0index.html"
  exit /b 0
)
node server.js
