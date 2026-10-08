import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { buildBackup, restoreBackup, deleteAllData, type RestoreReport } from '../../src/sync/backupStore';
import { BACKUP_EXTENSION, MIN_PASSWORD } from '../../src/sync/backup';
import { listArchivedChildren, unarchiveChild, listChildren } from '../../src/db/repo';
import { getDb } from '../../src/db/index';
import { rowToEvent, type EventRow } from '../../src/db/events';
import { eventsToCsv } from '../../src/records/csv';
import { typeLabel, eventSummary } from '../../src/util/format';
import type { Child } from '../../src/db/types';
import { useChildren } from '../../src/ui/ChildContext';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Field, Input, ListCard, ListRow, PrimaryButton, GhostButton, Section, Hint } from '../../src/ui/components';

// 資料：匯出備份、匯入備份、已封存的孩子、刪除全部資料。沒有伺服器，備份檔由使用者自己保存。
export default function DataScreen() {
  const { styles, palette } = useTheme();
  const { reload } = useChildren();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [inPw, setInPw] = useState('');
  const [picked, setPicked] = useState<{ name: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [archived, setArchived] = useState<Child[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadArchived = useCallback(() => { listArchivedChildren().then(setArchived); }, []);
  useFocusEffect(loadArchived);

  const exportBackup = async () => {
    if (pw.length < MIN_PASSWORD) return setMsg({ text: `備份密碼至少 ${MIN_PASSWORD} 個字`, error: true });
    if (pw !== pw2) return setMsg({ text: '兩次輸入的密碼不同', error: true });
    setBusy('export'); setMsg(null);
    try {
      const { text, children, events } = await buildBackup(pw);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const file = new File(Paths.cache, `parenting-backup-${stamp}.${BACKUP_EXTENSION}`);
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', UTI: 'public.data', dialogTitle: '儲存備份檔' });
      setMsg({ text: `已產生備份：${children} 位孩子、${events} 筆紀錄。請存到雲端硬碟或電腦，並記住密碼。` });
      setPw(''); setPw2('');
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : '備份失敗', error: true });
    } finally { setBusy(null); }
  };

  const pick = async () => {
    setMsg(null); setReport(null);
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    const text = await new File(res.assets[0].uri).text();
    setPicked({ name: res.assets[0].name, text });
  };

  const restore = async () => {
    if (!picked) return;
    setBusy('import'); setMsg(null);
    try {
      const r = await restoreBackup(picked.text, inPw);
      setReport(r); setPicked(null); setInPw('');
      await reload();
      loadArchived();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : '還原失敗', error: true });
    } finally { setBusy(null); }
  };

  // CSV 匯出：未加密，給自己保存或給醫師看。只含未刪除、未被取代的紀錄。
  const exportCsv = async () => {
    setBusy('csv'); setMsg(null);
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<EventRow>(`SELECT e.* FROM events e WHERE e.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM events s WHERE s.supersedes = e.id AND s.deleted_at IS NULL)`);
      const kids = await listChildren();
      const names = Object.fromEntries(kids.map((c) => [c.id, c.nickname]));
      const csv = eventsToCsv(rows.map(rowToEvent), names, typeLabel, (e) => eventSummary(e.type, e.payload, e.startAt, e.endAt));
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const file = new File(Paths.cache, `parenting-records-${stamp}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: '匯出紀錄' });
      setMsg({ text: `已匯出 ${rows.length} 筆紀錄。CSV 沒有加密，請存在自己信任的地方。` });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : '匯出失敗', error: true });
    } finally { setBusy(null); }
  };

  const wipe = async () => {
    setDeleting(true);
    try {
      await deleteAllData();
      await reload();
      router.replace('/');
    } finally { setDeleting(false); }
  };

  return (
    <View style={styles.page}>
      <TopBar back title="資料與備份" />
      <Screen>
        <Hint>沒有帳號、沒有伺服器：備份檔由你自己保存。檔案用你設定的密碼加密，忘記密碼就無法還原，APP 也救不回來。</Hint>

        <Section title="匯出備份" />
        <Card style={{ gap: 10 }}>
          <Text style={styles.muted}>一個檔案，包含所有孩子、紀錄、行程與偏好設定。不含配對金鑰，換手機後要重新配對交接。</Text>
          <Field label="備份密碼"><Input value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" placeholder={`至少 ${MIN_PASSWORD} 個字`} accessibilityLabel="備份密碼" /></Field>
          <Field label="再輸入一次"><Input value={pw2} onChangeText={setPw2} secureTextEntry autoCapitalize="none" accessibilityLabel="再輸入一次備份密碼" /></Field>
          <PrimaryButton label={busy === 'export' ? '加密中…' : '產生備份檔'} icon="upload" onPress={exportBackup} disabled={!!busy} />
        </Card>

        <Section title="匯出紀錄（CSV）" />
        <Card style={{ gap: 10 }}>
          <Text style={styles.muted}>所有孩子的紀錄存成一個 CSV，可以用 Excel 或 Numbers 開，也可以給醫師看。CSV 沒有加密，也不能拿來還原。</Text>
          <GhostButton label={busy === 'csv' ? '產生中…' : '匯出 CSV'} icon="file-text" onPress={exportCsv} />
        </Card>

        <Section title="匯入備份" />
        <Card style={{ gap: 10 }}>
          <Text style={styles.muted}>和本機的紀錄合併，不會刪掉本機已有的資料；同一份備份匯入兩次也不會重複。</Text>
          <GhostButton label={picked ? `已選：${picked.name}` : '選擇備份檔'} icon="file" onPress={pick} />
          {picked ? (
            <>
              <Field label="備份密碼"><Input value={inPw} onChangeText={setInPw} secureTextEntry autoCapitalize="none" accessibilityLabel="備份檔的密碼" /></Field>
              <PrimaryButton label={busy === 'import' ? '解密中…' : '還原'} icon="download" onPress={restore} disabled={!!busy || !inPw} />
            </>
          ) : null}
          {report ? (
            <Text style={[styles.p, { color: palette.accent }]}>
              已還原 {new Date(report.backupDate).toLocaleDateString('zh-TW')} 的備份：新增 {report.inserted} 筆紀錄{report.childrenInserted ? `、${report.childrenInserted} 位孩子` : ''}{report.schedule ? `、${report.schedule} 筆行程` : ''}{report.childrenRemapped ? '，同一個孩子的檔案已合併' : ''}。
            </Text>
          ) : null}
        </Card>

        {msg ? <Text style={[styles.p, { color: msg.error ? palette.danger : palette.accent }]}>{msg.text}</Text> : null}

        <Section title="已封存的孩子" />
        <ListCard>
          {archived.length === 0 ? <ListRow first main="沒有封存的孩子" mainColor={palette.ink3} /> : null}
          {archived.map((c, i) => (
            <ListRow key={c.id} first={i === 0} main={c.nickname} sub={c.birthDate}
              right={<GhostButton small label="取消封存" tone="accent" onPress={async () => { await unarchiveChild(c.id); await reload(); loadArchived(); }} />} />
          ))}
        </ListCard>

        <Section title="刪除全部資料" />
        <Card style={{ gap: 10, borderColor: palette.danger }}>
          <Text style={styles.muted}>清空這支手機上所有孩子、紀錄、行程、配對與設定，無法復原。建議先匯出備份。另一支已配對的手機不受影響。</Text>
          <Field label="輸入「刪除」確認"><Input value={confirmText} onChangeText={setConfirmText} accessibilityLabel="輸入刪除兩個字確認" /></Field>
          <GhostButton label={deleting ? '刪除中…' : '刪除全部資料'} tone="danger" icon="trash-2" onPress={() => { if (confirmText.trim() === '刪除' && !deleting) void wipe(); }} />
        </Card>
      </Screen>
    </View>
  );
}
