@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

set "CACHE=%TEMP%\norma-espejo"
if not exist "%CACHE%" mkdir "%CACHE%"

echo.
echo  NORMA - espejo de GitHub
echo  Pregunta a GitHub cada 8 segundos.
echo  Solo si hay codigo nuevo actualiza la carpeta.
echo  No cierres esta ventana.
echo  Navegador: http://localhost:8080
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo Esta carpeta no es un repo git.
  pause
  exit /b 1
)

:loop
git rev-parse --short HEAD > "%CACHE%\head.txt" 2>nul
git fetch origin main >nul 2>"%CACHE%\fetch.err"
if errorlevel 1 (
  echo No pude hablar con GitHub.
  type "%CACHE%\fetch.err"
  goto wait
)

git rev-parse --short origin/main > "%CACHE%\remote.txt" 2>nul
fc /b "%CACHE%\head.txt" "%CACHE%\remote.txt" >nul 2>&1
if errorlevel 1 (
  echo Llego un cambio mio. Actualizando el codigo...
  git hash-object package.json > "%CACHE%\pkg1.txt" 2>nul
  git reset --hard origin/main
  git hash-object package.json > "%CACHE%\pkg2.txt" 2>nul
  fc /b "%CACHE%\pkg1.txt" "%CACHE%\pkg2.txt" >nul 2>&1
  if errorlevel 1 (
    echo.
    echo  CAMBIARON LIBRERIAS.
    echo  En la ventana del 8080: Ctrl+C
    echo  Luego: npm install
    echo  Luego: npm run dev
    echo.
  ) else (
    echo  Listo. Si la pagina no cambia, pulsa F5.
  )
) else (
  echo Al dia. Sin cambios nuevos.
)

:wait
timeout /t 8 /nobreak >nul
goto loop
