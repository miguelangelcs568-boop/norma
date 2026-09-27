@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0\.."

echo.
echo  NORMA — espejo de GitHub.
echo  Cada 5 segundos esta carpeta queda igual que origin/main.
echo  Tu .env y lo que dibujes en el navegador no se tocan.
echo  Si editas un archivo del repo a mano, el espejo lo pisa.
echo  Escritorio:  npm run dev     Navegador:  http://localhost:8080
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo  Esta carpeta no es un repo git. Clona norma y vuelve a abrir esto.
  pause
  exit /b 1
)

:loop
for /f "delims=" %%i in ('git rev-parse --short HEAD 2^>nul') do set OLD=%%i
for /f "delims=" %%i in ('git hash-object package.json 2^>nul') do set PKGOLD=%%i

git fetch origin main >nul 2>scripts\_fetch.err
if errorlevel 1 (
  echo [!TIME!] No pude hablar con GitHub.
  if exist scripts\_fetch.err type scripts\_fetch.err
) else (
  for /f "delims=" %%i in ('git rev-parse --short origin/main 2^>nul') do set REMOTE=%%i
  if "!REMOTE!"=="" (
    echo [!TIME!] GitHub no trajo origin/main.
  ) else if "!REMOTE!"=="!OLD!" (
    echo [!TIME!] Al día  !OLD!
  ) else (
    echo [!TIME!] Llegó !REMOTE! — actualizando archivos...
    git reset --hard origin/main
    if errorlevel 1 (
      echo  No pude igualar. Corre:  git status
    ) else (
      for /f "delims=" %%i in ('git hash-object package.json 2^>nul') do set PKGNEW=%%i
      echo  Listo. Vite debería recargar solo. Si no, F5.
      if not "!PKGNEW!"=="!PKGOLD!" (
        echo.
        echo  CAMBIARON LIBRERIAS. En la ventana del escritorio:
        echo    Ctrl+C
        echo    npm install
        echo    npm run dev
        echo.
      )
    )
  )
)

timeout /t 5 /nobreak >nul
goto loop
