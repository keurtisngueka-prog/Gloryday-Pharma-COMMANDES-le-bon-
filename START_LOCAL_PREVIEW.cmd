@echo off
cd /d "%~dp0"
if not exist "%~dp0start-local-preview.ps1" (
    echo Ce lanceur a ete ouvert depuis l'apercu du ZIP.
    echo Ferme cette fenetre, puis fais clic droit sur le ZIP et choisis "Extraire tout...".
    echo Lance ensuite START_LOCAL_PREVIEW.cmd depuis le dossier extrait.
    echo.
    pause
    exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local-preview.ps1"
if errorlevel 1 echo Le lanceur s'est arrete avec une erreur.
echo.
echo Verifie le message ci-dessus, puis appuie sur une touche pour fermer.
pause >nul
