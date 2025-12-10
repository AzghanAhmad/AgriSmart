@echo off
echo 🔧 Fixing React Native codegenNativeCommands error...
echo.

echo 📦 Removing node_modules...
if exist node_modules rmdir /s /q node_modules

echo 🗑️ Removing package-lock.json...
if exist package-lock.json del /f /q package-lock.json

echo 🧹 Clearing Metro bundler cache...
npx expo start --clear --no-dev

echo 📥 Reinstalling dependencies...
call npm install

echo ✅ Done! Now run: npm run dev
pause

