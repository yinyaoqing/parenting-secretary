import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Linking, Platform, ScrollView, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import data from '../../content/resources/nursing-rooms.json';
import { getSetting, setSetting } from '../../src/db/repo';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Chip, ListCard, ListRow, Icon, Card } from '../../src/ui/components';

interface Room { name: string; county: string; district: string; address: string; phone: string; hours: string; note: string }
const ROOMS = (data as unknown as { items: Room[] }).items;
const COUNTIES = (data as unknown as { counties: string[] }).counties;
const SOURCE = (data as unknown as { source: { name: string; url: string; license: string }; checkedAt: string });

// 外出找哺集乳室（規劃 v0.8 決定 D6-6：不做內嵌地圖，改為清單加導航）。
// 官方名單沒有經緯度，所以依縣市與鄉鎮篩選；點一筆用手機的地圖 APP 開地址。
function openMap(r: Room) {
  const q = encodeURIComponent(`${r.address} ${r.name}`);
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
  void Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
}

export default function NursingRooms() {
  const { styles, palette } = useTheme();
  const [county, setCounty] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useFocusEffect(useCallback(() => { getSetting('nursingCounty').then((v) => { if (v && COUNTIES.includes(v)) setCounty(v); }); }, []));

  const districts = useMemo(() => (county ? [...new Set(ROOMS.filter((r) => r.county === county).map((r) => r.district))].filter(Boolean) : []), [county]);
  const list = useMemo(() => ROOMS.filter((r) => (!county || r.county === county) && (!district || r.district === district) && (!q.trim() || r.name.includes(q.trim()) || r.address.includes(q.trim()))), [county, district, q]);
  const pickCounty = async (c: string) => { setCounty(c); setDistrict(null); await setSetting('nursingCounty', c); };

  return (
    <View style={styles.page}>
      <TopBar back title="哺集乳室" subtitle={`國健署名單 ${ROOMS.length} 處`} />
      <Screen>
        <View style={[styles.pickrow, { gap: 8 }]}>
          <Icon name="search" size={20} color={palette.accent} />
          <TextInput value={q} onChangeText={setQ} placeholder="場所名稱或路名，例如：百貨、捷運" placeholderTextColor={palette.ink3} style={[styles.pickText, { paddingVertical: 10 }]} accessibilityLabel="搜尋哺集乳室" />
        </View>
        <Text style={styles.label}>縣市</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {COUNTIES.map((c) => <Chip key={c} sm label={c} on={county === c} onPress={() => pickCounty(c)} />)}
        </ScrollView>
        {county ? (
          <>
            <Text style={styles.label}>鄉鎮市區</Text>
            <View style={styles.chips}>
              <Chip sm label="全部" on={!district} onPress={() => setDistrict(null)} />
              {districts.map((d) => <Chip key={d} sm label={d} on={district === d} onPress={() => setDistrict(d)} />)}
            </View>
          </>
        ) : null}

        {!county && !q.trim() ? (
          <Card><Text style={styles.muted}>先選縣市，或直接搜尋場所名稱。點一筆會用手機的地圖 APP 開地址導航。</Text></Card>
        ) : (
          <ListCard>
            {list.length === 0 ? <ListRow first main="這裡沒有找到。" mainColor={palette.ink3} /> : null}
            {list.slice(0, 200).map((r, i) => (
              <ListRow key={`${r.name}|${r.address}`} first={i === 0} main={r.name} sub={[r.address, r.hours, r.note].filter(Boolean).join('\n')}
                right={r.phone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${r.phone.replace(/[^\d#]/g, '').replace('#', ',')}`)} accessibilityRole="button" accessibilityLabel={`撥打 ${r.name} ${r.phone}`} hitSlop={8}>
                    <Icon name="phone" size={20} color={palette.accent} />
                  </Pressable>
                ) : undefined}
                onPress={() => openMap(r)} />
            ))}
          </ListCard>
        )}
        {list.length > 200 ? <Text style={styles.muted}>只顯示前 200 筆，請選鄉鎮或搜尋縮小範圍。</Text> : null}

        <Pressable onPress={() => Linking.openURL(SOURCE.source.url)} accessibilityRole="link" style={[styles.row, { gap: 6, alignItems: 'flex-start' }]}>
          <Text style={[styles.link, styles.sp, { fontSize: 13, lineHeight: 19 }]}>{SOURCE.source.name}（{SOURCE.source.license}），整理 {SOURCE.checkedAt}</Text>
          <Icon name="external-link" size={14} color={palette.accent} />
        </Pressable>
        <Text style={styles.muted}>這是場所自願登記的名單，開放時間與是否開放以現場為準。依法應設置的場所（如大型公共場所）不一定都在名單內。</Text>
      </Screen>
    </View>
  );
}
