@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0compile-ea.ps1" %*
endlocal
