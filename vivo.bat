@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  NORMA en vivo
echo  Esta ventana = escritorio en http://localhost:8080
echo  Se abre otra = espejo de GitHub cada 5 segundos
echo  No las cierres mientras ensayas.
echo.

start "NORMA espejo GitHub" cmd /k "%~dp0scripts\seguir-github.bat"
npm.cmd run dev
echo.
echo  El escritorio se detuvo. La ventana del espejo sigue abierta;
echo  ciérrala si ya no vas a ensayar.
pause
