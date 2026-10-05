import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useThemeCtx } from '../src/ui/ThemeContext';

// 所有畫面自己畫標題列（設計稿 topbar），系統 header 一律關閉。
function Root() {
  const { night, palette } = useThemeCtx();
  return (
    <>
      <StatusBar style={night ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding/child" />
        <Stack.Screen name="onboarding/style" />
        <Stack.Screen name="onboarding/result" />
        <Stack.Screen name="record/bottle" options={{ presentation: 'modal' }} />
        <Stack.Screen name="record/temperature" options={{ presentation: 'modal' }} />
        <Stack.Screen name="record/solid" options={{ presentation: 'modal' }} />
        <Stack.Screen name="record/tummy" options={{ presentation: 'modal' }} />
        <Stack.Screen name="record/medication" options={{ presentation: 'modal' }} />
        <Stack.Screen name="record/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="record/timeline" />
        <Stack.Screen name="cards/[id]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}
