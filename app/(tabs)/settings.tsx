import { useCallback, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getSetting, getStyleProfile, listChildren, setSetting } from '../../src/db/repo';
import type { Child, StyleProfile } from '../../src/db/types';
import { PRESETS } from '../../src/style/questionnaire';
import { SCALE_LABEL, type TextScale } from '../../src/ui/theme';
import { useTheme, type ThemeMode } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Badge, ListCard, ListRow, Seg, Icon } from '../../src/ui/components';
import appConfig from '../../app.json';

const PAUSE_FOREVER = '9999-12-31T00:00:00.000Z';

function Label({ t }: { t: string }) {
  const { styles } = useTheme();
  return <Text style={[styles.label, { marginTop: 4 }]}>{t}</Text>;
}
function Soon() {
  return <Badge label="即將推出" tone="gray" />;
}

export default function Settings() {
  const { styles, palette, mode, setMode, scale, setScale } = useTheme();
  const [children, setChildren] = useState<Child[]>([]);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [paused, setPaused] = useState(false);

  useFocusEffect(useCallback(() => {
    listChildren().then(async (cs) => {
      setChildren(cs);
      if (cs[0]) setProfile(await getStyleProfile(cs[0].id));
    });
    getSetting('pausedUntil').then((v) => setPaused(!!v && new Date(v).getTime() > Date.now()));
  }, []));

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
            <Icon name="pause-circle" size={24} color={palette.warm} />
            <View style={styles.sp}>
              <Text style={[styles.p, { fontWeight: '700' }]}>暫停模式</Text>
              <Text style={[styles.muted, { color: palette.ink2 }]}>一鍵暫停全部提醒與內容推送。不問原因，隨時恢復。</Text>
            </View>
            <Switch value={paused} onValueChange={togglePause} trackColor={{ true: palette.warm, false: palette.line }} thumbColor="#fff" accessibilityLabel="暫停模式" />
          </View>
        </Card>

        <Label t="孩子" />
        <ListCard>
          {children.map((c, i) => (
            <ListRow key={c.id} first={i === 0} main={c.nickname} sub={`${c.birthDate}${c.dueDate ? ` · 早產兒，預產期 ${c.dueDate}` : ''}`} />
          ))}
          <ListRow first={children.length === 0} main="新增孩子" mainColor={palette.accent} onPress={() => router.push('/onboarding/child')} />
        </ListCard>

        <Label t="照顧風格" />
        <ListCard>
          <ListRow
            first
            main={presetName}
            sub="只影響提醒預設與內容排序，安全內容不受影響"
            right={<Badge label="重新作答" tone="gray" />}
            onPress={() => children[0] && router.push({ pathname: '/onboarding/style', params: { childId: children[0].id } })}
          />
        </ListCard>

        <Label t="同步與交接" />
        <ListCard>
          <ListRow first icon="share-2" main="與另一支手機交接紀錄" sub="QR code 面對面交接，或用 AirDrop、Quick Share、LINE 傳加密的交接檔。不經伺服器。" chevron onPress={() => router.push('/sync')} />
        </ListCard>

        <Label t="提醒" />
        <ListCard>
          <ListRow first main="餵食與尿布" sub="安全網提醒，比平常久才提醒一次。目前只在首頁顯示，通知功能製作中" right={<Soon />} />
          <ListRow main="用藥倒數" sub="只倒數你輸入的間隔，不建議劑量" right={<Soon />} />
          <ListRow main="公費健檢與疫苗" sub="依出生日計算的時程" right={<Soon />} />
          <ListRow main="通知健康檢查" sub="確認系統允許準時通知" right={<Soon />} />
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
          <ListRow first icon="download" main="匯出備份" sub="一個檔案，存到你自己的雲端" right={<Soon />} />
          <ListRow main="匯入備份" right={<Soon />} />
          <ListRow main="刪除全部資料" mainColor={palette.danger} right={<Soon />} />
        </ListCard>

        <Label t="關於" />
        <ListCard>
          <ListRow first main="內容來源政策" sub="每條內容都附可公開查核的來源；只用可信度達標且授權允許的來源；不以生成式 AI 產生醫療內容" />
          <ListRow main="隱私權" sub="沒有帳號、沒有伺服器，資料只在這支手機" />
          <ListRow main="版本" right={<Text style={styles.muted}>{appConfig.expo.version}</Text>} />
        </ListCard>
      </Screen>
    </View>
  );
}
