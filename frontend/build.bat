@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
cd /d %~dp0

echo Building...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed
    exit /b %errorlevel%
)

set "DIST_DIR=dist"
set "TEMP_DIR=temp_build"
if exist "%TEMP_DIR%" rmdir /S /Q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
xcopy /E /I /Y "%DIST_DIR%\*" "%TEMP_DIR%\" > nul
cd "%TEMP_DIR%"

powershell -Command ^
    "$htmlFiles = Get-ChildItem -Path . -Recurse -Include *.html; " ^
    "foreach ($file in $htmlFiles) { " ^
    "    $content = Get-Content $file.FullName -Raw; " ^
    "    $newContent = $content -replace '/assets/', 'assets/'; " ^
    "    if ($content -ne $newContent) { Set-Content $file.FullName $newContent -NoNewline } " ^
    "} " ^
    "$cssFiles = Get-ChildItem -Path . -Recurse -Include *.css; " ^
    "foreach ($file in $cssFiles) { " ^
    "    $content = Get-Content $file.FullName -Raw; " ^
    "    $newContent = $content -replace '/assets/', ''; " ^
    "    if ($content -ne $newContent) { Set-Content $file.FullName $newContent -NoNewline } " ^
    "}"

powershell -Command "Compress-Archive -Path * -DestinationPath 'build.zip' -Force"
move /Y "build.zip" "%~dp0%DIST_DIR%\build.zip" > nul
cd /d %~dp0
rmdir /S /Q "%TEMP_DIR%"
echo Done: %DIST_DIR%\build.zip
