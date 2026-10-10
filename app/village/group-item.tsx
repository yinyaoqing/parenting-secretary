import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Input, Chip, PrimaryButton, GhostButton, Hint } from '../../src/ui/components';
import { DatePick } from '../../src/ui/DatePick';
import { getGroup, listGroupItems, saveGroupItem, deleteGroupItem } from '../../src/village/store';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// 新增或編輯小組行程：日期、時間（可留空）、內容、誰負責、地點、備註。
export default function GroupItemEdit() {
  const { groupId, id } = useLocalSearchParams<{ groupId: string; id?: string }>();
  const { styles } = useTheme();
  const [date, setDate] = useState<Date | null>(new Date());
  const [time, setTime] = useState<Date | null>(null);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [myLabel, setMyLabel] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    getGroup(groupId).then((g) => setMyLabel(g?.myLabel ?? ''));
    if (!id) return;
    listGroupItems(groupId).then((list) => {
      const it = list.find((x) => x.id === id);
      if (!it) return;
      const [y, m, d] = it.date.split('-').map(Number);
      setDate(new Date(y, m - 1, d));
      if (it.time) { const t = new Date(); const [h, mi] = it.time.split(':').map(Number); t.setHours(h, mi, 0, 0); setTime(t); }
      setTitle(it.title); setAssignee(it.assignee ?? ''); setLocation(it.location ?? ''); setNote(it.note ?? '');
    });
  }, [groupId, id]);

  const save = async () => {
    if (!groupId || !date) return setErr('請選日期');
    if (!title.trim()) return setErr('請寫要做什麼');
    await saveGroupItem(groupId, { date: ymd(date), time: time ? hm(time) : undefined, title: title.trim(), assignee: assignee.trim() || undefined, location: location.trim() || undefined, note: note.trim() || undefined }, id);
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title={id ? '編輯小組行程' : '新增小組行程'} subtitle="改完記得把行程傳給其他家庭" />
      <Screen footer={
        <>
          <PrimaryButton label="儲存" onPress={save} />
          {id ? (confirmDel
            ? <GhostButton label="確定刪除" tone="danger" icon="trash-2" onPress={async () => { await deleteGroupItem(groupId!, id); router.back(); }} />
            : <GhostButton label="刪除這筆行程" tone="danger" onPress={() => setConfirmDel(true)} />) : null}
        </>
      }>
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <View style={styles.sp}><Field label="日期"><DatePick value={date} onChange={setDate} mode="date" label="日期" /></Field></View>
          <View style={styles.sp}>
            <Field label="時間（可留空）"><DatePick value={time} onChange={setTime} mode="time" label="時間" placeholder="整天" /></Field>
            {time ? <GhostButton small plain label="清除時間" onPress={() => setTime(null)} /> : null}
          </View>
        </View>
        <Field label="要做什麼">
          <Input value={title} onChangeText={setTitle} placeholder="例如：森林共學、放學接送、帶點心" accessibilityLabel="行程內容" />
        </Field>
        <Field label="誰負責（可留空）">
          <Input value={assignee} onChangeText={setAssignee} placeholder="例如：小米家" accessibilityLabel="負責的家庭" />
          {myLabel ? <View style={styles.chips}><Chip sm label={`我們家（${myLabel}）`} on={assignee === myLabel} onPress={() => setAssignee(myLabel)} /></View> : null}
        </Field>
        <Field label="地點（可留空）">
          <Input value={location} onChangeText={setLocation} placeholder="例如：羅東運動公園東門" accessibilityLabel="地點" />
        </Field>
        <Field label="備註（可留空）">
          <Input value={note} onChangeText={setNote} placeholder="例如：雨天改到親子館" multiline accessibilityLabel="備註" />
        </Field>
        <Hint>請不要在小組行程寫孩子的健康狀況或其他個人資料，小組裡的每個家庭都看得到。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
