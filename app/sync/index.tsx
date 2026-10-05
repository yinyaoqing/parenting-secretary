import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getIdentity, setDeviceName, listPeers, buildPackage, applyPackageText, removePeer, type Identity, type Peer, type ApplyReport } from '../../src/sync/store';
import { FILE_EXTENSION } from '../../src/sync/codec';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Field, Input, ListCard, ListRow, Badge, Chip, PrimaryButton, GhostButton, SafetyBox, Hint, Icon } from '../../src/ui/components';

// 同步與交接：不經任何伺服器。QR code 面對面交接；交接檔走 AirDrop、Quick Share 或 LINE。
export default function SyncHub() {
  const { styles, palette } = useTheme();
  const [me, setMe] = useState<Identity | null>(null);
  const [name, setName] = useState('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [target, setTarget] = useState<string | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [report, setReport] = useState<ApplyReport | null>(null);

  const load = useCallback(() => {
    getIdentity().then((i) => { setMe(i); setName(i.deviceName); });
    listPeers().then(setPeers);
  }, []);
  useFocusEffect(load);

  const paired = !!me?.familyId;

  const shareFile = async () => {
    setBusy(true); setMsg(null);
    try {
      const { text, events, delta } = await buildPackage(target === 'all' ? undefined : target);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const file = new File(Paths.cache, `parenting-handoff-${stamp}.${FILE_EXTENSION}`);
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', UTI: 'public.data', dialogTitle: '分享交接檔' });
      setMsg(`已產生交接檔：${events} 筆事件${delta ? '（差量）' : '（全部）'}。對方匯入後，再按「對方已收到」。`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '分享失敗');
    } finally { setBusy(false); }
  };

  const importFile = async () => {
    setBusy(true); setMsg(null); setReport(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets[0]) return;
      const text = await new File(res.assets[0].uri).text();
      const r = await applyPackageText(text);
      setReport(r);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '匯入失敗');
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.page}>
      <TopBar title="同步與交接" subtitle="不經伺服器，資料只在兩支手機之間" back />
      <Screen>
        {report ? (
          <Card accent>
            <Text style={[styles.p, { fontWeight: '700' }]}>已合併來自「{report.fromName}」的紀錄</Text>
            <Text style={styles.muted}>新增 {report.inserted} 筆、補上結束或刪除 {report.updated} 筆{report.tombstones ? `、為維持單一睡眠計時合併 ${report.tombstones} 筆` : ''}{report.childrenInserted ? `、新增孩子 ${report.childrenInserted} 位` : ''}{report.childrenRemapped ? `、合併同一個孩子的檔案` : ''}。</Text>
            {report.duplicates ? <Text style={[styles.muted, { color: palette.warm }]}>有 {report.duplicates} 組一分鐘內的同類紀錄可能重複，請到紀錄列表確認。</Text> : null}
          </Card>
        ) : null}
        {msg ? <Card><Text style={styles.muted}>{msg}</Text></Card> : null}

        <Field label="這支手機的名稱" hint="對方會看到這個名稱，例如「媽媽的手機」。">
          <View style={[styles.row, { gap: 8 }]}>
            <Input value={name} onChangeText={setName} placeholder="媽媽的手機" accessibilityLabel="裝置名稱" style={{ flex: 1 }} />
            <GhostButton label="儲存" small onPress={async () => { await setDeviceName(name); load(); }} />
          </View>
        </Field>

        <Text style={styles.h2}>配對</Text>
        {paired ? (
          <ListCard>
            {peers.length === 0 ? <ListRow first main="還沒有配對的手機" sub="讓對方掃描你的配對 QR code，或掃描對方的" /> : null}
            {peers.map((p, i) => (
              <ListRow key={p.deviceId} first={i === 0} main={p.name} sub={`${p.lastReceivedAt ? `上次收到 ${p.lastReceivedAt.slice(0, 16).replace('T', ' ')}` : '尚未收到'} · ${p.lastSentAt ? `上次給出 ${p.lastSentAt.slice(0, 16).replace('T', ' ')}` : '尚未給出'}`} right={<GhostButton label="移除" small tone="danger" onPress={async () => { await removePeer(p.deviceId); load(); }} />} />
            ))}
          </ListCard>
        ) : (
          <SafetyBox sub="第一次使用：一支手機按「顯示配對 QR code」，另一支按「掃描」。兩支手機會共用一把只存在手機裡的金鑰，之後的交接內容都用它加密。" />
        )}
        <View style={styles.grid}>
          <View style={{ flex: 1 }}><GhostButton label="顯示配對 QR code" icon="grid" onPress={() => router.push({ pathname: '/sync/qr', params: { mode: 'pair' } })} /></View>
          <View style={{ flex: 1 }}><GhostButton label="掃描" icon="camera" onPress={() => router.push('/sync/scan')} /></View>
        </View>

        <Text style={styles.h2}>交接</Text>
        <Field label="給誰" hint="指定對象時只送對方還沒有的紀錄，QR code 張數最少。">
          <View style={styles.chips}>
            <Chip label="所有裝置（全部紀錄）" sm on={target === 'all'} onPress={() => setTarget('all')} />
            {peers.map((p) => <Chip key={p.deviceId} label={p.name} sm on={target === p.deviceId} onPress={() => setTarget(p.deviceId)} />)}
          </View>
        </Field>
        <Card style={{ gap: 10 }}>
          <View style={[styles.row, { gap: 10 }]}><Icon name="grid" size={20} color={palette.accent} /><Text style={[styles.p, { fontWeight: '700' }]}>面對面：QR code</Text></View>
          <Text style={styles.muted}>不需要任何網路。醫院、旅館、國外都能用。</Text>
          <View style={styles.grid}>
            <View style={{ flex: 1 }}><PrimaryButton label="顯示給對方掃" onPress={() => router.push({ pathname: '/sync/qr', params: { mode: 'handoff', peer: target === 'all' ? '' : target } })} disabled={!paired} /></View>
            <View style={{ flex: 1 }}><GhostButton label="掃描對方的" icon="camera" onPress={() => router.push('/sync/scan')} /></View>
          </View>
        </Card>
        <Card style={{ gap: 10 }}>
          <View style={[styles.row, { gap: 10 }]}><Icon name="share-2" size={20} color={palette.accent} /><Text style={[styles.p, { fontWeight: '700' }]}>傳檔：AirDrop、Quick Share、LINE</Text></View>
          <Text style={styles.muted}>交接檔已加密，只有配對過的手機能打開。對方在這一頁按「匯入交接檔」。</Text>
          <View style={styles.grid}>
            <View style={{ flex: 1 }}><PrimaryButton label="分享交接檔" onPress={shareFile} disabled={!paired || busy} /></View>
            <View style={{ flex: 1 }}><GhostButton label="匯入交接檔" icon="download" onPress={importFile} /></View>
          </View>
        </Card>
        <Hint>合併規則：兩邊的紀錄取聯集，刪除與結束時間互相補上，同一筆被兩邊修正時以較晚的為準，合併後只保留一筆進行中的睡眠。原紀錄都留在資料庫，不會真的消失。</Hint>
        <View style={{ marginTop: 4 }}><Badge label={paired ? `家庭金鑰已建立 · 裝置 ${me?.deviceId.slice(-6)}` : '尚未配對'} tone="gray" /></View>
      </Screen>
    </View>
  );
}
