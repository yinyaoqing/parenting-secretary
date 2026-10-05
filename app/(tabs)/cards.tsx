import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { listChildren } from '../../src/db/repo';
import { cardsForAge, safetyCards } from '../../src/content/loader';
import type { ContentCard } from '../../src/content/types';
import { ageLabel, daysSince, correctedDays } from '../../src/util/age';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Chip, Card, Badge, Section, ListCard, ListRow, Icon } from '../../src/ui/components';
import { Hero, artForCard } from '../../src/ui/art';

type Filter = 'all' | 'safety' | 'dev';

// 來源機關短名：「國民健康署孕產兒關懷網站：寶寶篇…」→「國民健康署孕產兒關懷網站」
export function sourceShort(c: ContentCard): string {
  const names = c.sources.map((s) => s.name.split(/[：:（(]/)[0].trim());
  return Array.from(new Set(names)).join('、');
}

export default function Cards() {
  const { styles, palette } = useTheme();
  const [age, setAge] = useState<number | null>(null);
  const [corrected, setCorrected] = useState(false);
  const [actualDays, setActualDays] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [allSafety, setAllSafety] = useState(false);

  useFocusEffect(useCallback(() => {
    listChildren().then((cs) => {
      const c = cs[0];
      if (!c) { setAge(null); return; }
      const d = daysSince(c.birthDate);
      const cd = correctedDays(c.birthDate, c.dueDate);
      setActualDays(d);
      setCorrected(cd !== null);
      setAge(cd ?? d); // 2 歲前的發展內容以矯正月齡呈現
    });
  }, []));

  const dev = age === null ? [] : cardsForAge(age, 'milestones');
  const featured = dev[0];
  const restDev = dev.slice(1);
  const others = age === null ? [] : cardsForAge(age).filter((c) => c.topicGroup !== 'safety' && c.topicGroup !== 'milestones');
  const safety = safetyCards();
  const safetyShown = allSafety || filter === 'safety' ? safety : safety.slice(0, 6);

  const subtitle = age === null ? '先建立孩子的檔案' : corrected ? `矯正 ${ageLabel(age)} · 實際 ${ageLabel(actualDays ?? 0)}` : `實際 ${ageLabel(age)}`;
  const basis = corrected ? '依矯正月齡' : '依實際月齡';
  const describe = (c: ContentCard) => (c.translated ? `${basis}。翻譯改寫自 ${sourceShort(c)}，台灣篩檢時點以國健署為準。` : `${basis}。改寫自 ${sourceShort(c)}。`);

  return (
    <View style={styles.page}>
      <TopBar title="內容" subtitle={subtitle} />
      <Screen>
        <View style={[styles.chips, { flexWrap: 'nowrap' }]}>
          <Chip label="全部" sm on={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="安全" sm on={filter === 'safety'} onPress={() => setFilter('safety')} />
          <Chip label="發展" sm on={filter === 'dev'} onPress={() => setFilter('dev')} />
          <Chip label="飲食" sm off />
          <Chip label="睡眠" sm off />
          <Chip label="權益" sm off />
        </View>

        {filter !== 'safety' && featured ? (
          <Card accent onPress={() => router.push({ pathname: '/cards/[id]', params: { id: featured.id } })} style={{ gap: 8, paddingTop: 0, overflow: 'hidden' }}>
            <Hero art={artForCard(featured.id, featured.topicGroup) ?? 'rattle'} height={140} radius={0} style={{ marginHorizontal: -16, marginBottom: 6, borderWidth: 0 }} />
            <Badge label="這個時期的孩子" />
            <Text style={[styles.h2, { fontSize: 20, lineHeight: 26, marginTop: 0 }]}>{featured.title}</Text>
            <Text style={styles.muted}>{describe(featured)}</Text>
            <View style={[styles.row, { gap: 4 }]}><Text style={styles.link}>閱讀</Text><Icon name="chevron-right" size={16} color={palette.accent} /></View>
          </Card>
        ) : null}
        {filter !== 'safety' && !featured ? (
          <Card><Text style={styles.muted}>{age === null ? '建立孩子的檔案後，這裡會顯示這個時期的內容。' : '這個月齡的發展內容還在撰寫中。'}</Text></Card>
        ) : null}

        {filter !== 'dev' ? (
          <>
            <Section icon="shield" title="安全內容 · 永遠顯示" action={allSafety || filter === 'safety' ? undefined : `全部 ${safety.length} 條`} onAction={() => setAllSafety(true)} />
            <ListCard>
              {safetyShown.map((c, i) => (
                <ListRow key={c.id} first={i === 0} main={c.title} sub={sourceShort(c)} chevron onPress={() => router.push({ pathname: '/cards/[id]', params: { id: c.id } })} />
              ))}
            </ListCard>
          </>
        ) : null}

        {filter !== 'safety' ? (
          <>
            <Section title="適合現在" />
            <ListCard>
              {[...restDev, ...others].length === 0 ? <ListRow first main={age === null ? '尚無孩子檔案。' : '這個月齡的其他內容還在撰寫中。'} mainColor={palette.ink3} /> : null}
              {[...restDev, ...others].map((c, i) => (
                <ListRow key={c.id} first={i === 0} main={c.title} sub={sourceShort(c)} chevron onPress={() => router.push({ pathname: '/cards/[id]', params: { id: c.id } })} />
              ))}
            </ListCard>
          </>
        ) : null}
      </Screen>
    </View>
  );
}
