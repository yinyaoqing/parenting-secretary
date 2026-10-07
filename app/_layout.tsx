import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { startAutoReschedule, reschedule, recordDelay } from '../src/notify/scheduler';
import { loadStoredRemote, syncRemote } from '../src/remote/sync';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useThemeCtx } from '../src/ui/ThemeContext';
import { ChildProvider } from '../src/ui/ChildContext';

// APP 開著時收到通知也顯示橫幅。
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// 所有畫面自己畫標題列（設計稿 topbar），系統 header 一律關閉。
function Root() {
  const { night, palette } = useThemeCtx();

  // 本地通知：資料變動與回到前景時重排；點通知開對應畫面；送達時記錄延遲（通知健康檢查）。
  useEffect(() => {
    // 遠端政策與公費時程：先套用上次存的，再背景檢查更新（12 小時一次）。
    void loadStoredRemote().then(() => syncRemote()).catch(() => undefined);
    const off = startAutoReschedule();
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') void reschedule().catch(() => undefined); });
    const rec = Notifications.addNotificationReceivedListener((n) => {
      const at = Number((n.request.content.data as { at?: number } | undefined)?.at);
      if (at) void recordDelay(at);
    });
    const resp = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = (r.notification.request.content.data as { url?: string } | undefined)?.url;
      if (url) router.push(url as never);
    });
    return () => { off(); app.remove(); rec.remove(); resp.remove(); };
  }, []);
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
        <Stack.Screen name="notify/index" />
        <Stack.Screen name="search/index" />
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
