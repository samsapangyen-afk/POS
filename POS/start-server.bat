@echo off
chcp 65001 > nul
title SmartPOS Local Server
cd /d "%~dp0"
echo กำลังเริ่มต้น SmartPOS Server...
node server.js
pause
