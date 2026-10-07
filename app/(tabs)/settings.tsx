import { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getSetting, getStyleProfile, setSetting } from '../../src/db/repo';
import type { StyleProfile } from '../../src/db/types';
import { useChildren } from '../../src/ui/ChildContext';
import { daysSince } from '../../src/util/age';
import { PRESETS } from '../../src/style/questionnaire';
import { SCALE_LABEL, type TextScale } from '../../src/ui/theme';
import { useTheme, type ThemeMode } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Badge, ListCard, ListRow, Seg } from '../../src/ui/components';
import { SpotMoonCloud, Thumb } from '../../src/ui/art';
import appConfig from '../../app.json';
import { permissionStatus, requestPermission } from '../../src/notify/scheduler';
import { syncRemote, type RemoteStatus } from '../../src/remote/sync';

const PAUSE_FOREVER = '9999-12-31T00:00:00.000Z';
const NOTIFY_KEYS = ['safetyNet', 'medication', 'schedule', 'public'];

function Label({ t }: { t: string }) {
  const { styles } = useTheme();
  return <Text style={[styles.label, { marginTop: 4 }]}>{t}</Text>;
}

export default function Settings() {
  const { styles, palette, mode, setMode, scale, setScale } = useTheme();
  const { children, active, reload } = useChildren();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [paused, setPaused] = useState(false);
  const [remote, setRemote] = useState<RemoteStatus | null>(null);
  const [encourage, setEncourage] = useState(true);
  const [notify, setNotify] = useState<Record<string, boolean>>({ safetyNet: true, medication: true, schedule: true, public: true });

  useFocusEffect(useCallback(() => {
    reload();
    syncRemote().then(setRemote).catch(() => undefined);
    getSetting('encourage').then((v) => setEncourage(v !== '0'));
    getSetting('pausedUntil').then((v) => setPaused(!!v && new Date(v).getTime() > Date.now()));
    Promise.all(NOTIFY_KEYS.map((k) => getSetting(`notify:${k}`))).then((vs) => setNotify(Object.fromEntries(NOTIFY_KEYS.map((k, i) => [k, vs[i] !== '0']))));
  }, [reload]));
  const activeId = active?.id;
  useEffect(() => { Promise.resolve(activeId ? getStyleProfile(activeId) : null).then(setProfile); }, [activeId]);

  const toggleNotify = async (k: string, v: boolean) => {
    setNotify((n) => ({ ...n, [k]: v }));
    await setSetting(`notify:${k}`, v ? '1' : '0');
    if (v && (await permissionStatus()) === 'undetermined') await requestPermission();
  };

  const togglePause = async (v: boolean) => {
    setPaused(v);
    await setSetting('pausedUntil', v ? PAUSE_FOREVER : '');
  };

  const presetName = profile ? (profile.preset === 'custom' ? '自訂' : PRESETS[profile.preset].name) : '尚未設定';

  return (
    <View style={styles.page}>
      <TopBar title="設定" />
      <Screen>
        <Card warm>
          <View style={styles.row}>
            <SpotMoonCloud size={40} />
            <View style={styles.sp}>
              <Text style={[styles.p, { fontWeight: '700' }]}>暫停模式</Text>
              <Text style={[styles.muted, { color: palette.ink2 }]}>一鍵暫停全部提醒與推送內容，首頁不再出現提醒與育兒內容。紀錄照常可用，安全內容仍可查閱。不問原因，隨時恢復。</Text>
            </View>
            <Switch value={paused} onValueChange={togglePause} trackColor={{ true: palette.warm, false: palette.line }} thumbColor="#fff" accessibilityLabel="暫停模式" />
          </View>
        </Card>

        <Label t="孩子" />
        <ListCard>
          {children.map((c, i) => (
            <ListRow key={c.id} first={i === 0} left={<Thumb art={daysSince(c.birthDate) >= 3 * 365 ? 'sprout' : 'rattle'} size={48} radius={12} />} main={c.nickname} sub={`${c.birthDate}${c.dueDate ? ` · 早產兒，預產期 ${c.dueDate}` : ''}`} right={active?.id === c.id ? <Badge label="目前" /> : undefined} chevron onPress={() => router.push({ pathname: '/child/[id]', params: { id: c.id } })} />
          ))}
          <ListRow first={children.length === 0} main="新增孩子" mainColor={palette.accent} onPress={() => router.push('/onboarding/child')} />
        </ListCard>

        <Label t={active ? `照顧風格（${active.nickname}）` : '照顧風格'} />
        <ListCard>
          <ListRow
            first
            main={presetName}
            sub="只影響提醒預設與內容排序，安全內容不受影響"
            right={<Badge label="重新作答" tone="gray" />}
            onPress={() => active && router.push({ pathname: '/onboarding/style', params: { childId: active.id } })}
          />
        </ListCard>

        <Label t={active ? `行程與範本（${active.nickname}）` : '行程與範本'} />
        <ListCard>
          <ListRow first icon="calendar" main="行程與作息範本" sub="托嬰、回診、課表、服藥；作息範本要先選起點（滿 6 個月或一個事件）" chevron onPress={() => active && router.push({ pathname: '/plan', params: { childId: active.id } })} />
        </ListCard>

        <Label t="照顧者" />
        <ListCard>
          <ListRow first icon="heart" main="照顧好自己" sub="10 秒打卡、專線與資源、請別人幫忙。不計分，只存在這支手機" chevron onPress={() => router.push('/caregiver')} />
          <ListRow main="今天一句" sub="每天第一次打開時一句話：國健署原文、陪伴句，或哲學家與文學角色的思想模擬。不評分，夜間不出現" right={<Switch value={encourage} onValueChange={async (v) => { setEncourage(v); await setSetting('encourage', v ? '1' : '0'); }} trackColor={{ true: palette.accent, false: palette.line }} thumbColor="#fff" accessibilityLabel="今天一句" />} />
        </ListCard>

        <Label t="同步與交接" />
        <ListCard>
          <ListRow first icon="share-2" main="與另一支手機交接紀錄" sub="QR code 面對面交接，或用 AirDrop、Quick Share、LINE 傳加密的交接檔。不經伺服器。" chevron onPress={() => router.push('/sync')} />
        </ListCard>

        <Label t="提醒" />
        <ListCard>
          <ListRow first main="餵奶安全網" sub="1 歲前，距上次餵奶比平常久時提醒一次" right={<Switch value={notify.safetyNet} onValueChange={(v) => toggleNotify('safetyNet', v)} trackColor={{ true: palette.accent, false: palette.line }} thumbColor="#fff" accessibilityLabel="餵奶安全網提醒" />} />
          <ListRow main="用藥間隔" sub="只倒數你輸入的間隔，不建議劑量" right={<Switch value={notify.medication} onValueChange={(v) => toggleNotify('medication', v)} trackColor={{ true: palette.accent, false: palette.line }} thumbColor="#fff" accessibilityLabel="用藥間隔提醒" />} />
          <ListRow main="行程提前提醒" sub="依每筆行程設定的提前時間" right={<Switch value={notify.schedule} onValueChange={(v) => toggleNotify('schedule', v)} trackColor={{ true: palette.accent, false: palette.line }} thumbColor="#fff" accessibilityLabel="行程提前提醒" />} />
          <ListRow main="公費健檢與疫苗" sub="時間窗開始那天早上 9 點" right={<Switch value={notify.public} onValueChange={(v) => toggleNotify('public', v)} trackColor={{ true: palette.accent, false: palette.line }} thumbColor="#fff" accessibilityLabel="公費健檢與疫苗提醒" />} />
          <ListRow main="通知健康檢查" sub="權限、接下來的提醒、準時度" chevron onPress={() => router.push('/notify')} />
        </ListCard>

        <Label t="顯示" />
        <Card style={{ gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.lrowMain}>日夜模式</Text>
            <Seg<ThemeMode> label="日夜模式" value={mode} onChange={setMode} options={[{ key: 'auto', label: '自動' }, { key: 'day', label: '日間' }, { key: 'night', label: '夜間' }]} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={styles.lrowMain}>字級</Text>
            <Seg<TextScale> label="字級" value={scale} onChange={setScale} options={(['standard', 'large', 'xlarge'] as TextScale[]).map((k) => ({ key: k, label: SCALE_LABEL[k] }))} />
          </View>
        </Card>

        <Label t="資料" />
        <ListCard>
          <ListRow first icon="download" main="匯出與匯入備份" sub="一個加密檔案，存到你自己的雲端或電腦" chevron onPress={() => router.push('/data')} />
          <ListRow main="已封存的孩子" chevron onPress={() => router.push('/data')} />
          <ListRow main="刪除全部資料" mainColor={palette.danger} chevron onPress={() => router.push('/data')} />
        </ListCard>

        <Label t="關於" />
        <ListCard>
          <ListRow first main="內容來源政策" sub="每條內容都附可公開查核的來源；只用可信度達標且授權允許的來源；不以生成式 AI 產生醫療內容" />
          <ListRow main="隱私權" sub="沒有帳號、沒有伺服器，紀錄只在這支手機。APP 只會從網路下載公開的政策與公費時程資料，不上傳任何紀錄" />
          <ListRow main="版本" right={<Text style={styles.muted}>{appConfig.expo.version}</Text>} />
          <ListRow main="政策與公費時程資料" sub={remote ? `政策 ${remote.policyVersion}、時程 ${remote.scheduleVersion}${remote.checkedAt ? `；上次檢查 ${new Date(remote.checkedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}${remote.error ? '；這次沒連上，沿用手機上的版本' : ''}` : '讀取中'} right={<Badge label="檢查更新" tone="gray" />} onPress={() => { void syncRemote(true).then(setRemote); }} />
        </ListCard>
      </Screen>
    </View>
  );
}
