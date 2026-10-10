import { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FrameCollector, parsePairing } from '../../src/sync/codec';
import { GROUP_JOIN_PREFIX } from '../../src/village/model';
import { adoptPairing, applyPackageText, getIdentity, type ApplyReport } from '../../src/sync/store';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Card, PrimaryButton, GhostButton, Progress } from '../../src/ui/components';

// 掃描：同一個畫面同時接受配對 QR code 與交接 QR code（多張自動拼接）。
export default function Scan() {
  const { styles, palette } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const [status, setStatus] = useState<'scanning' | 'applying' | 'done' | 'error'>('scanning');
  const [report, setReport] = useState<ApplyReport | null>(null);
  const [pairedWith, setPairedWith] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const collector = useRef(new FrameCollector());
  const lock = useRef(false);

  const onScanned = async ({ data }: { data: string }) => {
    if (lock.current || status !== 'scanning') return;
    // 育村鄰里小組的加入碼：轉到加入確認頁，由使用者填稱呼後才加入。
    if (data.startsWith(GROUP_JOIN_PREFIX)) {
      lock.current = true;
      router.replace({ pathname: '/village/join', params: { code: data } });
      return;
    }
    const pairing = parsePairing(data);
    if (pairing) {
      lock.current = true;
      try {
        const me = await getIdentity();
        if (pairing.deviceId === me.deviceId) throw new Error('這是你自己的配對 QR code');
        await adoptPairing(pairing);
        setPairedWith(pairing.deviceName);
        setStatus('done');
      } catch (e) {
        setErr(e instanceof Error ? e.message : '配對失敗'); setStatus('error');
      }
      return;
    }
    const p = collector.current.add(data);
    if (!p) return;
    setProgress({ received: p.received, total: p.total });
    if (!p.done) return;
    lock.current = true;
    setStatus('applying');
    try {
      const r = await applyPackageText(collector.current.result());
      setReport(r);
      setStatus('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '合併失敗'); setStatus('error');
    }
  };

  const again = () => { collector.current = new FrameCollector(); lock.current = false; setProgress(null); setErr(null); setReport(null); setPairedWith(null); setStatus('scanning'); };

  if (!permission) return <View style={styles.page} />;
  if (!permission.granted) {
    return (
      <View style={styles.page}>
        <SheetHeader title="掃描" />
        <Screen footer={<PrimaryButton label="允許使用相機" onPress={requestPermission} />}>
          <Card><Text style={styles.p}>需要相機來掃描另一支手機上的 QR code。影像只用於辨識 QR code，不會儲存。</Text></Card>
        </Screen>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <SheetHeader title="掃描" subtitle="對準另一支手機螢幕上的 QR code" />
      <Screen footer={status === 'done' || status === 'error' ? (
        <>
          <PrimaryButton label="完成" onPress={() => router.back()} />
          <GhostButton label="再掃一次" onPress={again} />
        </>
      ) : <GhostButton label="取消" onPress={() => router.back()} />}>
        {status === 'scanning' || status === 'applying' ? (
          <View style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#000' }}>
            <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={status === 'scanning' ? onScanned : undefined} />
          </View>
        ) : null}
        {progress ? (
          <Card>
            <Text style={[styles.p, { fontWeight: '700' }]}>已掃到 {progress.received} / {progress.total} 張</Text>
            <Progress pct={(progress.received / progress.total) * 100} />
            <Text style={styles.muted}>保持對準，沒掃到的張數會在下一輪補上。</Text>
          </Card>
        ) : status === 'scanning' ? <Text style={styles.muted}>可以掃配對 QR code，或交接 QR code。</Text> : null}
        {status === 'applying' ? <Text style={styles.muted}>合併中…</Text> : null}
        {status === 'done' && pairedWith ? (
          <Card accent>
            <Text style={[styles.p, { fontWeight: '700' }]}>已與「{pairedWith}」配對</Text>
            <Text style={styles.muted}>現在兩支手機用同一把金鑰。回到「同步與交接」就能互相交接紀錄。</Text>
          </Card>
        ) : null}
        {status === 'done' && report ? (
          <Card accent>
            <Text style={[styles.p, { fontWeight: '700' }]}>已合併來自「{report.fromName}」的紀錄</Text>
            <Text style={styles.muted}>新增 {report.inserted} 筆、補上結束或刪除 {report.updated} 筆{report.tombstones ? `、合併重複的睡眠計時 ${report.tombstones} 筆` : ''}{report.childrenInserted ? `、新增孩子 ${report.childrenInserted} 位` : ''}{report.childrenRemapped ? '、合併同一個孩子的檔案' : ''}{report.schedule ? `、更新行程 ${report.schedule} 筆` : ''}。</Text>
            {report.duplicates ? <Text style={[styles.muted, { color: palette.warm }]}>有 {report.duplicates} 組一分鐘內的同類紀錄可能重複，請到紀錄列表確認。</Text> : null}
            <Text style={styles.muted}>請對方按「對方已掃描完成」，下次就只會傳新的紀錄。</Text>
          </Card>
        ) : null}
        {status === 'error' ? <Card><Text style={[styles.p, styles.danger]}>{err}</Text></Card> : null}
      </Screen>
    </View>
  );
}
