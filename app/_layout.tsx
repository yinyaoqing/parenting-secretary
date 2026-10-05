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
        <Stack.Screen name="record/bottle" options={{ title: '瓶餵', presentation: 'modal' }} />
        <Stack.Screen name="record/temperature" options={{ title: '體溫', presentation: 'modal' }} />
        <Stack.Screen name="record/timeline" options={{ title: '紀錄' }} />
        <Stack.Screen name="record/solid" options={{ title: '副食品', presentation: 'modal' }} />
        <Stack.Screen name="record/edit" options={{ title: '修正紀錄', presentation: 'modal' }} />
        <Stack.Screen name="cards/index" options={{ title: '內容' }} />
        <Stack.Screen name="cards/[id]" options={{ title: '' }} />
      </Stack>
    </>
  );
}
