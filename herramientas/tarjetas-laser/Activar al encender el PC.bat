@echo off
rem Pone en marcha el vigilante de tarjetas laser y hace que arranque solo al encender Windows.
set "AQUI=%~dp0"
for /f "delims=" %%p in ('where pythonw 2^>nul') do if not defined PYW set "PYW=%%p"
if not defined PYW (echo No encuentro Python. Instala Python desde python.org & pause & exit /b 1)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Tarjetas laser Bambu.lnk'); $s.TargetPath='%PYW%'; $s.Arguments='\"%AQUI%vigilante.py\"'; $s.WorkingDirectory='%AQUI%'; $s.Save()"
start "" "%PYW%" "%AQUI%vigilante.py"
echo Listo. El vigilante ya esta en marcha y arrancara solo cada vez que enciendas el PC.
pause
