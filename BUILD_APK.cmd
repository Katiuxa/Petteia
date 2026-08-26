@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
call npm install
node scripts\prepare-www.js
node scripts\generate-icons.js
if not exist android\app (
  npx cap add android
)
node scripts\patch-android.js
npx cap sync android
node scripts\build-android.js --aab
echo.
echo APK y AAB en dist-android\
pause
