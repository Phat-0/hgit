@echo off
chcp 65001 >nul
cd /d "%~dp0may-chu"
if exist "certificates\supabase-ca.crt" set "NODE_EXTRA_CA_CERTS=%CD%\certificates\supabase-ca.crt"
echo Khoi dong Backend NestJS...
call npm.cmd run start:dev
if errorlevel 1 pause
