import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { listChildren } from '../../src/db/repo';
import { cardsForAge, safetyCards, GROUP_LABEL } from '../../src/content/loader';
import type { ContentCard } from '../../src/content/types';
import { daysSince, correctedDays } from '../../src/util/age';
import { useTheme } from '../../src/ui/useTheme';

export default function Cards() {
  const { styles, palette } = useTheme();
  const [age, setAge] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    listChildren().then((cs) => {
      const c = cs[0];
      if (!c) return setAge(null);
      // 2 歲前的發展內容以矯正月齡呈現
      const cd = correctedDays(c.birthDate, c.dueDate);
      setAge(cd ?? daysSince(c.birthDate));
    });
  }, []));

  const forAge = age === null ? [] : cardsForAge(age).filter((c) => c.topicGroup !== 'safety');
  const safety = safetyCards();

  const Item = ({ c }: { c: ContentCard }) => (
    <Pressable style={styles.timelineItem} onPress={() => router.push({ pathname: '/cards/[id]', params: { id: c.id } })} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={styles.p}>{c.title}</Text>
        <Text style={styles.muted}>{GROUP_LABEL[c.topicGroup]}{c.status !== 'published' ? ' · 草稿' : ''}{c.translated && !c.translationReviewed ? ' · 待譯審' : ''}</Text>
      </View>
      <Text style={[styles.muted, { color: palette.accent }]}>看</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.h2}>安全內容（永遠顯示）</Text>
      <View style={styles.card}>{safety.map((c) => <Item key={c.id} c={c} />)}</View>

      <Text style={styles.h2}>適合現在月齡</Text>
      <View style={styles.card}>
        {forAge.length === 0 && <Text style={styles.muted}>這個月齡的內容還在撰寫中。</Text>}
        {forAge.map((c) => <Item key={c.id} c={c} />)}
      </View>
    </ScrollView>
  );
}
