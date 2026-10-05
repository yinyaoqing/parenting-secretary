import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTitleStyle: { fontSize: 18 } }}>
        <Stack.Screen name="index" options={{ title: '育兒秘書' }} />
        <Stack.Screen name="onboarding/child" options={{ title: '建立孩子檔案' }} />
        <Stack.Screen name="onboarding/style" options={{ title: '照顧風格' }} />
        <Stack.Screen name="onboarding/result" options={{ title: '你的偏好' }} />
      </Stack>
    </>
  );
}
