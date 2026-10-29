@echo off
chcp 65001 >nul
cd /d "%~dp0trang-web"
echo Khoi dong Frontend Vite...
call npm.cmd run dev
if errorlevel 1 pause
