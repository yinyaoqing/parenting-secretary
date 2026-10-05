import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { deleteEvent, listEvents } from '../../src/db/events';
import type { Event } from '../../src/db/types';
import { eventSummary, hhmm, typeLabel } from '../../src/util/format';
import { useTheme } from '../../src/ui/useTheme';

export default function Timeline() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles, palette } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(() => { if (childId) listEvents(childId, { limit: 200 }).then(setEvents); }, [childId]);
  useFocusEffect(load);

  const remove = async (id: string) => { await deleteEvent(id); setConfirmId(null); load(); };

  let lastDay = '';
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.muted}>最近 200 筆。刪除會保留在資料庫中但不再顯示；補登修正在第 5 週加入。</Text>
      <View style={styles.card}>
        {events.length === 0 && <Text style={styles.muted}>還沒有紀錄。</Text>}
        {events.map((e) => {
          const day = e.startAt.slice(0, 10);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <View key={e.id}>
              {showDay && <Text style={[styles.muted, { marginTop: 8 }]}>{day}</Text>}
              <View style={styles.timelineItem}>
                <Text style={styles.time}>{hhmm(e.startAt)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.p}>{typeLabel(e.type)} {eventSummary(e.type, e.payload, e.startAt, e.endAt)}</Text>
                  {confirmId === e.id ? (
                    <View style={[styles.row, { justifyContent: 'flex-start' }]}>
                      <Pressable onPress={() => remove(e.id)} accessibilityRole="button"><Text style={[styles.p, styles.danger]}>確定刪除</Text></Pressable>
                      <Pressable onPress={() => setConfirmId(null)} accessibilityRole="button"><Text style={styles.muted}>取消</Text></Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => setConfirmId(e.id)} accessibilityRole="button"><Text style={[styles.muted, { color: palette.accent }]}>刪除</Text></Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
