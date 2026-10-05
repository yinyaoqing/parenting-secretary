import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { correctEvent, listEvents } from '../../src/db/events';
import { deviceId } from '../../src/db/device';
import type { Event } from '../../src/db/types';
import { typeLabel } from '../../src/util/format';
import { useTheme } from '../../src/ui/useTheme';

// 補登修正：改時間（與結束時間）。以新事件取代舊事件，歷史保留。
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocalInput(s: string): string | null {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function EditEvent() {
  const { childId, eventId } = useLocalSearchParams<{ childId: string; eventId: string }>();
  const { styles } = useTheme();
  const [ev, setEv] = useState<Event | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;
    listEvents(childId, { limit: 500 }).then((list) => {
      const e = list.find((x) => x.id === eventId) ?? null;
      setEv(e);
      if (e) { setStart(toLocalInput(e.startAt)); setEnd(e.endAt ? toLocalInput(e.endAt) : ''); }
    });
  }, [childId, eventId]);

  const save = async () => {
    if (!ev) return;
    const s = fromLocalInput(start);
    if (!s) return setErr('開始時間請用 YYYY-MM-DD HH:mm');
    let e: string | undefined;
    if (end.trim()) { const parsed = fromLocalInput(end); if (!parsed) return setErr('結束時間請用 YYYY-MM-DD HH:mm'); e = parsed; }
    if (new Date(s).getTime() > Date.now() + 60000) return setErr('開始時間不能在未來');
    await correctEvent(ev.id, { startAt: s, endAt: e }, await deviceId());
    router.back();
  };

  if (!ev) return <View style={[styles.page, styles.pad]}><Text style={styles.muted}>載入中…</Text></View>;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.h2}>{typeLabel(ev.type)}</Text>
      <Text style={styles.muted}>修正後會以新紀錄取代，原紀錄保留在資料庫但不再顯示。</Text>
      <Text style={styles.p}>開始時間</Text>
      <TextInput style={styles.input} value={start} onChangeText={setStart} placeholder="YYYY-MM-DD HH:mm" accessibilityLabel="開始時間" />
      {(ev.type === 'sleep' || ev.endAt) && (
        <>
          <Text style={styles.p}>結束時間（可留空）</Text>
          <TextInput style={styles.input} value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD HH:mm" accessibilityLabel="結束時間" />
        </>
      )}
      {err && <Text style={[styles.p, styles.danger]}>{err}</Text>}
      <Pressable style={styles.primary} onPress={save} accessibilityRole="button"><Text style={styles.primaryText}>儲存修正</Text></Pressable>
    </ScrollView>
  );
}
