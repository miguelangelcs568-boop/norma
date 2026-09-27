@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo.
echo  NORMA — bajando cambios de GitHub cada 20 segundos.
echo  No cierres esta ventana.
echo  En OTRA ventana negra (cmd) deja corriendo:   npm run dev
echo  Navegador:  http://localhost:8080
echo.

:loop
echo [%TIME%] Buscando cambios...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo  No pude bajar. Si tocaste archivos a mano dentro de la carpeta,
  echo  dímelo. Si es la primera vez, comprueba que git funciona:  git status
  echo.
)
timeout /t 20 /nobreak >nul
goto loop
