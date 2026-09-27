@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo.
echo  NORMA - espejo de GitHub
echo  Cada 5 segundos esta carpeta queda igual a GitHub.
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
git rev-parse --short HEAD > scripts\_head.txt 2>nul
git fetch origin main >nul 2>scripts\_fetch.err
if errorlevel 1 (
  echo No pude hablar con GitHub.
  type scripts\_fetch.err
  goto wait
)

git rev-parse --short origin/main > scripts\_remote.txt 2>nul
fc /b scripts\_head.txt scripts\_remote.txt >nul 2>&1
if errorlevel 1 (
  echo Llego un cambio. Actualizando...
  git hash-object package.json > scripts\_pkg1.txt 2>nul
  git reset --hard origin/main
  git hash-object package.json > scripts\_pkg2.txt 2>nul
  fc /b scripts\_pkg1.txt scripts\_pkg2.txt >nul 2>&1
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
  echo Al dia.
)

:wait
timeout /t 5 /nobreak >nul
goto loop
