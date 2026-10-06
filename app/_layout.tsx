import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useThemeCtx } from '../src/ui/ThemeContext';
import { ChildProvider } from '../src/ui/ChildContext';

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
        <Stack.Screen name="sync/index" />
        <Stack.Screen name="sync/qr" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sync/scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="child/switch" options={{ presentation: 'modal' }} />
        <Stack.Screen name="child/[id]" />
        <Stack.Screen name="plan/index" />
        <Stack.Screen name="plan/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plan/derive" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/toilet" />
        <Stack.Screen name="data/index" />
        <Stack.Screen name="caregiver/index" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ChildProvider>
        <Root />
      </ChildProvider>
    </ThemeProvider>
  );
}
