import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { ensureFamily, getIdentity, buildPackage, markSent, listPeers } from '../../src/sync/store';
import { encodePairing, splitFrames } from '../../src/sync/codec';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Card, PrimaryButton, GhostButton, Hint } from '../../src/ui/components';

const FRAME_MS = 700;
const QR_SIZE = 300;

// mode=pair：顯示配對 QR code（內含家庭金鑰，只給面對面的家人掃）。
// mode=handoff：把交接包切成多張 QR code 連續切換，對方掃到全部就能合併。
export default function ShowQr() {
  const { mode, peer } = useLocalSearchParams<{ mode: 'pair' | 'handoff'; peer?: string }>();
  const { styles, palette } = useTheme();
  const [frames, setFrames] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [info, setInfo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [peerName, setPeerName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (mode === 'pair') {
          const fam = await ensureFamily();
          const me = await getIdentity();
          setFrames([encodePairing({ familyId: fam.familyId, key: fam.key, deviceId: me.deviceId, deviceName: me.deviceName })]);
          setInfo('讓另一支手機在「同步與交接」按「掃描」。');
        } else {
          const { text, events, delta } = await buildPackage(peer || undefined);
          const f = splitFrames(text);
          setFrames(f);
          setInfo(`${events} 筆事件${delta ? '（只有對方還沒有的）' : '（全部）'}，共 ${f.length} 張，會自動輪流顯示。`);
          if (peer) setPeerName((await listPeers()).find((p) => p.deviceId === peer)?.name ?? '');
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : '無法產生 QR code');
      }
    })();
  }, [mode, peer]);

  useEffect(() => {
    if (!frames || frames.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % frames.length), FRAME_MS);
    return () => clearInterval(id);
  }, [frames]);

  const done = async () => {
    if (mode === 'handoff' && peer) await markSent(peer);
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title={mode === 'pair' ? '配對 QR code' : '交接 QR code'} subtitle={mode === 'handoff' && peerName ? `給 ${peerName}` : undefined} />
      <Screen footer={
        mode === 'handoff' ? (
          <>
            <PrimaryButton label={peer ? '對方已掃描完成' : '關閉'} onPress={done} />
            {peer ? <Hint>按下後，下次給這支手機的交接只會包含新的紀錄。</Hint> : null}
          </>
        ) : <GhostButton label="關閉" onPress={() => router.back()} />
      }>
        {err ? <Card><Text style={[styles.p, styles.danger]}>{err}</Text></Card> : null}
        {frames ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 16 }}>
              <QRCode value={frames[idx]} size={QR_SIZE} ecl={mode === 'pair' ? 'M' : 'L'} color="#000" backgroundColor="#fff" />
            </View>
            {frames.length > 1 ? <Text style={[styles.h2, { marginTop: 0 }]}>第 {idx + 1} / {frames.length} 張</Text> : null}
            <Text style={[styles.muted, { textAlign: 'center' }]}>{info}</Text>
          </View>
        ) : !err ? <Text style={styles.muted}>準備中…</Text> : null}
        {mode === 'pair' ? (
          <Card>
            <Text style={styles.muted}>這個 QR code 含有家庭金鑰。只給一起照顧孩子的人掃，不要截圖傳出去。對方掃描後會用同一把金鑰，之後的交接內容都能互相解開。</Text>
          </Card>
        ) : (
          <Card>
            <Text style={styles.muted}>把螢幕對著對方的相機，保持到對方顯示「已完成」。每張約 {Math.round(FRAME_MS / 100) / 10} 秒切換一次，沒掃到的會在下一輪補上。</Text>
          </Card>
        )}
        <View style={{ height: 1, backgroundColor: palette.line }} />
      </Screen>
    </View>
  );
}
