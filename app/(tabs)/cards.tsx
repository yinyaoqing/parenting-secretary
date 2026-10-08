import { useCallback, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { ChildTitle } from '../../src/ui/ChildTitle';
import { cardsForAge, safetyCards, GROUP_LABEL } from '../../src/content/loader';
import type { ContentCard, TopicGroup } from '../../src/content/types';
import { ageLabel, daysSince, correctedDays } from '../../src/util/age';
import { getSetting, setSetting } from '../../src/db/repo';
import { firstLine } from '../../src/content/summary';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Badge, Section, ListCard, ListRow, Icon, PickRow } from '../../src/ui/components';
import { Hero, artForCard } from '../../src/ui/art';

// 來源機關短名：「國民健康署孕產兒關懷網站：寶寶篇…」→「國民健康署孕產兒關懷網站」
export function sourceShort(c: ContentCard): string {
  const names = c.sources.map((s) => s.name.split(/[：:（(]/)[0].trim());
  return Array.from(new Set(names)).join('、');
}

// 只能用問問看找到、不在主題清單出現的卡（媽媽視角自檢：參考範圍本身就會引起比較）。
const SEARCH_ONLY = new Set(['sleep.how-much']);
const TOPICS: TopicGroup[] = ['milestones', 'feeding', 'sleep', 'health', 'home_safety', 'caregiver'];

// 內容（媽媽視角自檢 2026-10-08）：預設只放問問看、本週一張與安全內容；其餘收進她自己點開的主題。
// 內容安靜開啟時連本週一張也不出現。安全內容永遠顯示（R7）。
export default function Cards() {
  const { styles, palette } = useTheme();
  const { active, reload } = useChildren();
  const [quiet, setQuiet] = useState(false);
  const [open, setOpen] = useState<TopicGroup | null>(null);
  const [allSafety, setAllSafety] = useState(false);
  useFocusEffect(useCallback(() => {
    reload();
    getSetting('contentQuiet').then((v) => setQuiet(v === '1'));
  }, [reload]));

  const actualDays = active ? daysSince(active.birthDate) : null;
  const correctedD = active ? correctedDays(active.birthDate, active.dueDate) : null;
  const age = active ? (correctedD ?? actualDays) : null;
  const forAge = age === null ? [] : cardsForAge(age).filter((c) => c.topicGroup !== 'safety' && !SEARCH_ONLY.has(c.id));
  const featured = forAge.find((c) => c.topicGroup === 'milestones');
  const safety = safetyCards();
  const subtitle = age === null ? '先建立孩子的檔案' : correctedD !== null ? `矯正 ${ageLabel(age)} · 實際 ${ageLabel(actualDays ?? 0)}` : `實際 ${ageLabel(age)}`;

  const toggleQuiet = async (v: boolean) => { setQuiet(v); await setSetting('contentQuiet', v ? '1' : '0'); };

  return (
    <View style={styles.page}>
      <TopBar title={active ? <ChildTitle subtitle={subtitle} /> : '內容'} subtitle={active ? undefined : subtitle} />
      <Screen>
        <PickRow icon="search" placeholder="問問看：吐奶、睡過夜、補助…" onPress={() => router.push('/search')} accessibilityLabel="問問看，搜尋官方內容" />

        <Card style={quiet ? { borderColor: palette.warm, backgroundColor: palette.warmSoft } : undefined}>
          <View style={styles.row}>
            <View style={styles.sp}>
              <Text style={[styles.p, { fontWeight: '700' }]}>{quiet ? '內容安靜中' : '內容安靜'}</Text>
              <Text style={[styles.muted, { color: palette.ink2 }]}>{quiet ? '不主動出現任何卡片。想查什麼用上面的「問問看」或下面的主題，安全內容照常。' : '累的時候打開，這裡就不再主動放卡片，需要時再查。'}</Text>
            </View>
            <Switch value={quiet} onValueChange={toggleQuiet} trackColor={{ true: palette.warm, false: palette.line }} thumbColor="#fff" accessibilityLabel="內容安靜" />
          </View>
        </Card>

        {!quiet && featured ? (
          <Card accent onPress={() => router.push({ pathname: '/cards/[id]', params: { id: featured.id } })} style={{ gap: 8, paddingTop: 0, overflow: 'hidden' }}>
            <Hero art={artForCard(featured.id, featured.topicGroup) ?? 'rattle'} height={120} radius={0} style={{ marginHorizontal: -16, marginBottom: 6, borderWidth: 0 }} />
            <Badge label="本週一張" />
            <Text style={[styles.h2, { fontSize: 19, lineHeight: 25, marginTop: 0 }]}>{featured.title}</Text>
            <Text style={styles.muted}>{firstLine(featured)}</Text>
            <View style={[styles.row, { gap: 4 }]}><Text style={styles.link}>閱讀</Text><Icon name="chevron-right" size={16} color={palette.accent} /></View>
          </Card>
        ) : null}

        <Section icon="shield" title="安全內容 · 永遠顯示" action={allSafety ? undefined : `全部 ${safety.length} 條`} onAction={() => setAllSafety(true)} />
        <ListCard>
          {(allSafety ? safety : safety.slice(0, 4)).map((c, i) => (
            <ListRow key={c.id} first={i === 0} main={c.title} sub={sourceShort(c)} chevron onPress={() => router.push({ pathname: '/cards/[id]', params: { id: c.id } })} />
          ))}
        </ListCard>

        <Section title="想查什麼" />
        <ListCard>
          {age === null ? <ListRow first main="建立孩子的檔案後，這裡會依月齡整理。" mainColor={palette.ink3} /> : null}
          {age !== null ? TOPICS.map((g, gi) => {
            const list = forAge.filter((c) => c.topicGroup === g);
            if (!list.length) return null;
            const isOpen = open === g;
            return (
              <ListRow key={g} first={gi === 0} main={GROUP_LABEL[g]} sub={`${list.length} 張，依目前月齡`} right={<Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.ink3} />} onPress={() => setOpen(isOpen ? null : g)}>
                {isOpen ? (
                  <View style={{ marginLeft: 4 }}>
                    {list.map((c) => (
                      <ListRow key={c.id} main={c.title} sub={sourceShort(c)} chevron onPress={() => router.push({ pathname: '/cards/[id]', params: { id: c.id } })} />
                    ))}
                  </View>
                ) : null}
              </ListRow>
            );
          }) : null}
        </ListCard>
        <Text style={styles.muted}>只列孩子目前月齡的內容。其他月齡請用「問問看」搜尋。</Text>
      </Screen>
    </View>
  );
}
