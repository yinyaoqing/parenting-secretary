import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { File } from 'expo-file-system';
import { applyPackageText, getIdentity, type ApplyReport } from '../../src/sync/store';
import { looksLikePackage } from '../../src/sync/codec';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, PrimaryButton, GhostButton, Hint } from '../../src/ui/components';

type State = { kind: 'loading' } | { kind: 'ready'; text: string; name: string } | { kind: 'unpaired' } | { kind: 'error'; msg: string } | { kind: 'done'; report: ApplyReport };

// 從 LINE、AirDrop、檔案 APP 點開 .psync 時進到這裡（app/+native-intent.tsx 轉址）。先確認再合併，不自動匯入。
export default function ImportFile() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const { styles, palette } = useTheme();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!uri) return setState({ kind: 'error', msg: '沒有收到檔案。' });
      try {
        const me = await getIdentity();
        if (!me.key) return setState({ kind: 'unpaired' });
        const text = await new File(uri).text();
        if (!looksLikePackage(text)) return setState({ kind: 'error', msg: '這不是育兒秘書的交接檔。' });
        setState({ kind: 'ready', text, name: decodeURIComponent(uri.split('/').pop() ?? '交接檔') });
      } catch (e) {
        setState({ kind: 'error', msg: `讀不到檔案。可以改到「同步與交接」用「匯入交接檔」選檔案。${e instanceof Error ? `（${e.message}）` : ''}` });
      }
    })();
  }, [uri]);

  const merge = async () => {
    if (state.kind !== 'ready') return;
    setBusy(true);
    try { setState({ kind: 'done', report: await applyPackageText(state.text) }); }
    catch (e) { setState({ kind: 'error', msg: e instanceof Error ? e.message : '匯入失敗' }); }
    finally { setBusy(false); }
  };

  const toHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.page}>
      <TopBar back title="匯入交接檔" />
      <Screen>
        {state.kind === 'loading' ? <Text style={styles.muted}>讀取中⋯</Text> : null}
        {state.kind === 'unpaired' ? (
          <Card style={{ gap: 10 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>這支手機還沒配對</Text>
            <Text style={styles.muted}>交接檔用家庭金鑰加密，要先和傳檔的那支手機面對面掃一次配對 QR code，才打得開。</Text>
            <PrimaryButton label="去配對" icon="link" onPress={() => router.replace('/sync')} />
          </Card>
        ) : null}
        {state.kind === 'ready' ? (
          <Card style={{ gap: 10 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>{state.name}</Text>
            <Text style={styles.muted}>合併後，對方記的紀錄會加進這支手機；同一筆不會重複，已有的紀錄不會被刪掉。</Text>
            <PrimaryButton label={busy ? '合併中⋯' : '合併紀錄'} icon="download" disabled={busy} onPress={merge} />
            <GhostButton label="不要匯入" onPress={toHome} />
          </Card>
        ) : null}
        {state.kind === 'done' ? (
          <Card style={{ gap: 8 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>已合併來自「{state.report.fromName}」的紀錄</Text>
            <Text style={styles.muted}>新增 {state.report.inserted} 筆、更新 {state.report.updated} 筆{state.report.childrenInserted ? `、新增孩子 ${state.report.childrenInserted} 位` : ''}{state.report.schedule ? `、更新行程 ${state.report.schedule} 筆` : ''}。</Text>
            {state.report.duplicates ? <Text style={[styles.muted, { color: palette.warm }]}>有 {state.report.duplicates} 組一分鐘內的同類紀錄可能重複，請到紀錄列表確認。</Text> : null}
            <PrimaryButton label="回到今天" onPress={() => router.replace('/')} />
          </Card>
        ) : null}
        {state.kind === 'error' ? (
          <Card style={{ gap: 10 }}>
            <Text style={[styles.p, styles.danger]}>{state.msg}</Text>
            <GhostButton label="到同步與交接" onPress={() => router.replace('/sync')} />
          </Card>
        ) : null}
        <Hint>交接檔不經任何伺服器。合併完可以把聊天室裡的檔案刪掉。</Hint>
      </Screen>
    </View>
  );
}
