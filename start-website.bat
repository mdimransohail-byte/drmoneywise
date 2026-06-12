@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%NODE_EXE%" (
  echo Bundled Node runtime was not found.
  echo Please use start.ps1 instead.
  pause
  exit /b 1
)

echo Starting Dr MoneyWise...
echo Open http://localhost:3000 in your browser
"%NODE_EXE%" server.js
