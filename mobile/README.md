# Mobile App Setup (React Native / Expo)

Since the environment restrictions prevented automatic initialization, please run the following command to set up the mobile app:

```bash
# Initialize Expo project
npx create-expo-app@latest mobile -t blank

# Navigate to mobile directory
cd mobile

# Install dependencies
npm install @react-navigation/native @react-navigation/stack
npm install react-native-safe-area-context react-native-screens
```

## Shared Code Strategy

To share code between `front` (Next.js) and `mobile` (React Native), we recommend:

1. Moving shared logic (types, utilities) to a `packages/shared` folder or using a Monorepo tool like Turborepo.
2. For now, you can manually copy `front/types` and `front/lib` to `mobile/src/shared`.

## Development

```bash
cd mobile
npx expo start
```
