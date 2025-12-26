@echo off
echo Initializing Expo project...
call npx create-expo-app@latest mobile -t blank --yes
echo Installing navigation dependencies...
cd mobile
call npm install @react-navigation/native @react-navigation/stack react-native-safe-area-context react-native-screens
echo Done! Please run 'cd mobile' and 'npx expo start' to begin.
pause
