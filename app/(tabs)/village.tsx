import { useCallback, useState } from 'react';
import { View, Text, Linking, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Section, ListCard, ListRow, Badge, Icon, Hint } from '../../src/ui/components';
import { listMembers, listGroups, listGroupItems } from '../../src/village/store';
import { ROLE_LABEL, upcomingItems, type GroupItem, type VillageGroup, type VillageMember } from '../../src/village/model';
import { listPeers, type Peer } from '../../src/sync/store';
import { activeNotices, type Notice } from '../../src/notices/loader';
import { daysSince } from '../../src/util/age';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// 育村（規劃 v1.0 第 4 章）：養一個孩子需要一個村子。
// 第一層「我的村」：孩子身邊的照顧者；第二層「鄰里小組」：幾個家庭共用的行程；第三層「村長公告」：公部門的在地公告。
export default function Village() {
  const { styles, palette } = useTheme();
  const { active: child, reload } = useChildren();
  const [members, setMembers] = useState<VillageMember[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [groups, setGroups] = useState<{ g: VillageGroup; next?: GroupItem }[]>([]);

  useFocusEffect(useCallback(() => {
    reload();
    listMembers().then(setMembers);
    listPeers().then(setPeers);
    listGroups().then(async (gs) => setGroups(await Promise.all(gs.map(async (g) => ({ g, next: upcomingItems(await listGroupItems(g.id), today())[0] })))));
  }, [reload]));

  const notices: Notice[] = activeNotices(child?.county, child ? daysSince(child.birthDate) : null);

  return (
    <View style={styles.page}>
      <TopBar title="育村" subtitle="養一個孩子，需要一整個村子" />
      <Screen>
        <Section title="我的村" action="新增村民" onAction={() => router.push('/village/member')} />
        <ListCard>
          {members.length === 0 && peers.length === 0 ? (
            <ListRow first main="還沒有村民" sub="把一起照顧孩子的人加進來：另一半、阿公阿嬤、保母、老師。只存在你們家的手機。" mainColor={palette.ink3} />
          ) : null}
          {members.map((m, i) => (
            <ListRow key={m.id} first={i === 0} icon="user" main={m.name} sub={[ROLE_LABEL[m.role], m.phone].filter(Boolean).join(' · ')} chevron
              onPress={() => router.push({ pathname: '/village/member', params: { id: m.id } })} />
          ))}
          {peers.map((p, i) => (
            <ListRow key={p.deviceId} first={members.length === 0 && i === 0} icon="smartphone" main={p.name} sub="已配對的手機，可以互相交接紀錄" right={<Badge label="已配對" tone="gray" />}
              onPress={() => router.push('/sync')} />
          ))}
        </ListCard>
        <ListCard>
          <ListRow first icon="link" main="邀請村民的手機" sub="面對面掃一次 QR code，之後就能互相交接紀錄" chevron onPress={() => router.push('/sync')} />
          {child ? <ListRow icon="clipboard" main="交班卡" sub={`把 ${child.nickname} 的注意事項、聯絡人和近況，傳給下一位照顧者`} chevron onPress={() => router.push('/village/handover')} /> : null}
        </ListCard>

        <Section title="鄰里小組" action="建立小組" onAction={() => router.push('/village/group-new')} />
        <ListCard>
          {groups.length === 0 ? (
            <ListRow first main="還沒有小組" sub="共學團排班、接送輪值、班級家長：幾個家庭共用一張行程表。只交換行程，不交換孩子的紀錄。" mainColor={palette.ink3} />
          ) : null}
          {groups.map(({ g, next }, i) => (
            <ListRow key={g.id} first={i === 0} icon="users" main={g.name} sub={next ? `下一個：${next.date.slice(5).replace('-', '/')} ${next.time ?? ''} ${next.title}${next.assignee ? `（${next.assignee}）` : ''}` : '目前沒有接下來的行程'} chevron
              onPress={() => router.push({ pathname: '/village/group/[id]', params: { id: g.id } })} />
          ))}
          <ListRow first={groups.length === 0 ? false : undefined} icon="camera" main="加入別人的小組" sub="掃對方給你的小組加入碼" chevron onPress={() => router.push('/sync/scan')} />
        </ListCard>

        <Section title="村長公告" />
        {notices.length === 0 ? (
          <Card><Text style={styles.muted}>{child?.county ? `${child.county}目前沒有新的公告。` : '目前沒有新的全國公告。在孩子的檔案填上戶籍縣市，就會看到縣市政府的在地公告。'}</Text></Card>
        ) : notices.map((n) => (
          <Card key={n.id} style={{ gap: 6 }}>
            <View style={[styles.row, { gap: 8 }]}>
              <Badge label={n.county ?? '全國'} tone={n.county ? undefined : 'gray'} />
              <Text style={[styles.muted, styles.sp]}>{n.publisher}</Text>
            </View>
            <Text style={[styles.p, { fontWeight: '700' }]}>{n.title}</Text>
            <Text style={styles.muted}>{n.body}</Text>
            <Pressable onPress={() => Linking.openURL(n.url)} accessibilityRole="link" style={[styles.row, { gap: 6 }]}>
              <Text style={[styles.link, styles.sp]}>看原文{n.endsOn ? `（到 ${n.endsOn.slice(5).replace('-', '/')}）` : ''}</Text>
              <Icon name="external-link" size={14} color={palette.accent} />
            </Pressable>
          </Card>
        ))}
        <Hint>村長公告只轉發政府機關、公立學校與親子館的公告，每則都附原文連結。沒有廣告，也沒有人可以在這裡發文。</Hint>
      </Screen>
    </View>
  );
}
