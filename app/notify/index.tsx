import { useCallback, useState } from 'react';
import { View, Text, Platform, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { isExpoGo } from '../../src/util/runtime';
import { permissionStatus, requestPermission, reschedule, sendTest, getDelays, getNotifySettings } from '../../src/notify/scheduler';
import { medianDelay, type Planned } from '../../src/notify/plan';
import { fmtWhen } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, ListCard, ListRow, PrimaryButton, GhostButton, Badge, Section } from '../../src/ui/components';

const KIND_LABEL: Record<Planned['kind'], string> = { safetyNet: '安全網', medication: '用藥', timer: '倒數', schedule: '行程', public: '公費時程' };

// 通知健康檢查（規劃第 7–8 週）：權限、排了哪些、準時度。
export default function NotifyHealth() {
  const { styles, palette } = useTheme();
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [plan, setPlan] = useState<Planned[]>([]);
  const [delays, setDelays] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, pl, d, s] = await Promise.all([permissionStatus(), reschedule(), getDelays(), getNotifySettings()]);
    setPerm(p); setPlan(pl); setDelays(d); setPaused(s.paused);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const med = medianDelay(delays);

  return (
    <View style={styles.page}>
      <TopBar back title="通知健康檢查" />
      <Screen>
        <Card style={{ gap: 8 }}>
          <View style={[styles.row, { gap: 8 }]}>
            <Text style={[styles.p, { fontWeight: '700' }, styles.sp]}>通知權限</Text>
            {perm ? <Badge label={perm === 'granted' ? '已允許' : perm === 'denied' ? '已拒絕' : '尚未詢問'} tone={perm === 'granted' ? undefined : 'warm'} /> : null}
          </View>
          {perm === 'undetermined' ? <PrimaryButton label="允許通知" icon="bell" onPress={async () => { await requestPermission(); await load(); }} /> : null}
          {perm === 'denied' ? (
            <>
              <Text style={styles.muted}>通知被關掉了，安全網與倒數提醒都收不到。請到手機的設定打開。</Text>
              <GhostButton label="打開手機設定" onPress={() => Linking.openSettings()} />
            </>
          ) : null}
          {paused ? <Text style={[styles.muted, { color: palette.warm }]}>暫停模式中，所有提醒都已停止。</Text> : null}
        </Card>

        <Section title={`接下來的提醒（${plan.length}）`} />
        <ListCard>
          {plan.length === 0 ? <ListRow first main="目前沒有排定的提醒" mainColor={palette.ink3} /> : null}
          {plan.slice(0, 12).map((p, i) => (
            <ListRow key={p.key} first={i === 0} time={fmtWhen(new Date(p.at)).replace(/^今天 /, '')} main={p.title} sub={p.body} right={<Badge label={KIND_LABEL[p.kind]} tone="gray" />} />
          ))}
        </ListCard>
        {plan.length > 12 ? <Text style={styles.muted}>還有 {plan.length - 12} 則。最多同時排 60 則，用完會在打開 APP 時補上。</Text> : null}

        <Section title="準時度" />
        <Card style={{ gap: 8 }}>
          <Text style={styles.p}>{med === null ? '還沒有量測資料。' : `最近 ${delays.length} 則，送達比預定時間晚的中位數：${med} 秒`}</Text>
          <Text style={styles.muted}>只記錄 APP 開著時收到的通知。按下測試後把 APP 留在前景 10 秒。</Text>
          <GhostButton label="送一則測試通知（10 秒後）" icon="clock" onPress={async () => { await sendTest(10); setMsg('已排定，10 秒後送達。'); setTimeout(() => { void load(); }, 12000); }} />
          {msg ? <Text style={[styles.muted, { color: palette.accent }]}>{msg}</Text> : null}
        </Card>

        {Platform.OS === 'android' && isExpoGo ? (
          <Card warm>
            <Text style={[styles.muted, { color: palette.ink2 }]}>Android 的省電模式可能延後通知幾分鐘。測試版跑在 Expo Go 裡，沒辦法申請準時鬧鐘權限；可以到手機設定把 Expo Go 的電池最佳化關閉。</Text>
          </Card>
        ) : null}
        {Platform.OS === 'android' && !isExpoGo ? (
          <Card warm style={{ gap: 8 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>讓提醒準時</Text>
            <Text style={[styles.muted, { color: palette.ink2 }]}>Android 12 以上要打開「鬧鐘與提醒」權限，安全網與倒數提醒才會準時；沒打開時系統可能延後幾分鐘。{med !== null && med > 60 ? '最近的通知平均晚了一分鐘以上，建議打開。' : ''}</Text>
            <GhostButton label="打開「鬧鐘與提醒」設定" icon="settings" onPress={() => {
              const pkg = Constants.expoConfig?.android?.package;
              void IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, pkg ? { data: `package:${pkg}` } : undefined).catch(() => Linking.openSettings());
            }} />
            <Text style={styles.muted}>也可以到手機設定把本 APP 的電池最佳化關閉。</Text>
          </Card>
        ) : null}
      </Screen>
    </View>
  );
}
