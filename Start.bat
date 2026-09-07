@echo off
start "" "%~dp0runtime\node.exe" "%~dp0backend\server.js"
ping 127.0.0.1 -n 3 > nul
start http://localhost:5000
