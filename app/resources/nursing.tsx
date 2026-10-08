import data from '../../content/resources/nursing-rooms.json';
import { PlaceList, type Place, type PlaceSource } from '../../src/ui/PlaceList';

interface Room { name: string; county: string; district: string; address: string; phone: string; hours: string; note: string }
const D = data as unknown as { items: Room[]; counties: string[]; source: PlaceSource; checkedAt: string };
const PLACES: Place[] = D.items.map((r) => ({ ...r, detail: [r.hours, r.note].filter(Boolean).join('\n') }));

// 外出找哺集乳室（規劃 v0.8 D6-6：不做內嵌地圖，改為清單加導航）。官方名單沒有經緯度，依縣市與鄉鎮篩選。
export default function NursingRooms() {
  return (
    <PlaceList title="哺集乳室" subtitle={`國健署名單 ${PLACES.length} 處`} places={PLACES} counties={D.counties} source={D.source} asOf={`整理 ${D.checkedAt}`} settingKey="nursingCounty"
      searchHint="場所名稱或路名，例如：百貨、捷運" emptyHint="先選縣市，或直接搜尋場所名稱。點一筆會用手機的地圖 APP 開地址導航。"
      footnote="這是場所自願登記的名單，開放時間與是否開放以現場為準。依法應設置的場所（如大型公共場所）不一定都在名單內。" />
  );
}
