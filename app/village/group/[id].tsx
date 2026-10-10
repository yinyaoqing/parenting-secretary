import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../../src/ui/useTheme';
import { Screen, TopBar, Card, Section, ListCard, ListRow, PrimaryButton, GhostButton, Field, Input, Hint } from '../../../src/ui/components';
import { getGroup, listGroupItems, buildGroupFile, leaveGroup, setMyLabel } from '../../../src/village/store';
import { encodeGroupJoin, upcomingItems, type GroupItem, type VillageGroup } from '../../../src/village/model';
import { FILE_EXTENSION } from '../../../src/sync/codec';
import { PSYNC_UTI } from '../../../src/util/runtime';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

// 鄰里小組詳情（育村第二層）：接下來的行程、新增行程、把更新傳給其他家庭、加入碼、離開小組。
export default function GroupDetail() {
  const { id, showJoin } = useLocalSearchParams<{ id: string; showJoin?: string }>();
  const { styles, palette } = useTheme();
  const [group, setGroup] = useState<VillageGroup | null>(null);
  const [items, setItems] = useState<GroupItem[]>([]);
  const [join, setJoin] = useState(showJoin === '1');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getGroup(id).then((g) => { setGroup(g); setLabel(g?.myLabel ?? ''); });
    listGroupItems(id).then(setItems);
  }, [id]);
  useFocusEffect(load);

  if (!group) return <View style={styles.page}><TopBar back title="鄰里小組" /></View>;
  const upcoming = upcomingItems(items, today());

  const share = async () => {
    setMsg(null);
    try {
      const { text, count } = await buildGroupFile(group.id);
      const file = new File(Paths.cache, `yucun-group-${new Date().toISOString().slice(0, 10)}.${FILE_EXTENSION}`);
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', UTI: PSYNC_UTI, dialogTitle: '傳小組行程給其他家庭' });
      setMsg(`已產生小組檔：${count} 筆行程。其他家庭點開檔案就會合併。`);
    } catch (e) { setMsg(e instanceof Error ? e.message : '分享失敗'); }
  };

  return (
    <View style={styles.page}>
      <TopBar back title={group.name} subtitle={`我們家在小組裡叫「${group.myLabel}」`} />
      <Screen>
        <Section title="接下來的行程" action="新增" onAction={() => router.push({ pathname: '/village/group-item', params: { groupId: group.id } })} />
        <ListCard>
          {upcoming.length === 0 ? <ListRow first main="還沒有行程" sub="例如：10/15 週三 09:00 森林共學，小米家負責帶點心" mainColor={palette.ink3} /> : null}
          {upcoming.map((it, i) => (
            <ListRow key={it.id} first={i === 0} time={md(it.date)} main={`${it.time ? it.time + ' ' : ''}${it.title}`} sub={[it.assignee ? `負責：${it.assignee}` : '', it.location, it.note].filter(Boolean).join(' · ')} chevron
              onPress={() => router.push({ pathname: '/village/group-item', params: { groupId: group.id, id: it.id } })} />
          ))}
        </ListCard>

        <PrimaryButton label="把行程傳給其他家庭" icon="share" onPress={share} />
        {msg ? <Text style={[styles.muted, { color: palette.accent }]}>{msg}</Text> : null}
        <Text style={styles.muted}>用 LINE、AirDrop 或 Quick Share 傳出小組檔。每次都送完整的行程表，對方合併後以最後修改的為準。</Text>

        <Section title="邀請其他家庭" action={join ? '收起' : '顯示加入碼'} onAction={() => setJoin((v) => !v)} />
        {join ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 12 }}>
              <QRCode value={encodeGroupJoin(group)} size={220} ecl="M" color="#000" backgroundColor="#fff" />
            </View>
            <Text style={[styles.muted, { textAlign: 'center' }]}>請對方在育村分頁按「加入別人的小組」掃這個 QR code。加入碼就是小組的鑰匙，只給要加入的家庭當面掃，不要截圖傳到群組。</Text>
          </Card>
        ) : null}

        <Section title="小組設定" />
        <Card style={{ gap: 10 }}>
          <Field label="我們家在小組裡的稱呼">
            <Input value={label} onChangeText={setLabel} onEndEditing={() => { if (label.trim()) void setMyLabel(group.id, label); }} accessibilityLabel="我們家的稱呼" />
          </Field>
          {confirmLeave
            ? <GhostButton label="確定離開，刪除這支手機上的小組行程" tone="danger" icon="log-out" onPress={async () => { await leaveGroup(group.id); router.back(); }} />
            : <GhostButton label="離開小組" tone="danger" onPress={() => setConfirmLeave(true)} />}
        </Card>
        <Hint>小組只交換行程，不交換孩子的紀錄。離開小組只會刪掉這支手機上的資料，其他家庭不受影響。</Hint>
      </Screen>
    </View>
  );
}
