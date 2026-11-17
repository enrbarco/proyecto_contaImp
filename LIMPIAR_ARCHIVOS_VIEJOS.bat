@echo off
chcp 65001 >nul
REM Borra los archivos viejos que ya no se usan despues de la reestructuracion de ContaImp.
REM Se ejecuta una sola vez (doble clic) y luego se borra solo.
cd /d "%~dp0"
echo Borrando archivos que ya no se usan...
if exist ".vscode" rmdir /s /q ".vscode"
if exist "database\migrations" rmdir /s /q "database\migrations"
if exist "frontend\src\landing" rmdir /s /q "frontend\src\landing"
if exist "frontend\src\Landing.jsx" del /q "frontend\src\Landing.jsx"
if exist "frontend\src\styles.css" del /q "frontend\src\styles.css"
if exist "frontend\package-lock.json" del /q "frontend\package-lock.json"
if exist "backend\package-lock.json" del /q "backend\package-lock.json"
if exist "backend\src\db.js" del /q "backend\src\db.js"
if exist "backend\src\seed.js" del /q "backend\src\seed.js"
echo Listo. Ahora abre GitHub Desktop para revisar los cambios.
pause
(goto) 2>/dev/null & del "%~f0"
