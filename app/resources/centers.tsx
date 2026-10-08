import data from '../../content/resources/parent-child-centers.json';
import { PlaceList, type Place, type PlaceSource } from '../../src/ui/PlaceList';

interface Center { name: string; county: string; district: string; address: string; phone: string; since: string }
const D = data as unknown as { items: Center[]; counties: string[]; source: PlaceSource; dataAsOf: string; checkedAt: string };
const PLACES: Place[] = D.items.map((c) => ({ ...c }));

// 親子館與托育資源中心（規劃 v1.0 第 5.1 節）：家長自帶、共學團找場地與托育諮詢。社家署名冊，資料截至 111 年 12 月。
export default function ParentChildCenters() {
  return (
    <PlaceList title="親子館" subtitle={`親子館與托育資源中心 ${PLACES.length} 處`} places={PLACES} counties={D.counties} source={D.source} asOf={`資料截至 111 年 12 月，整理 ${D.checkedAt}`} settingKey="centersCounty"
      searchHint="名稱或路名" emptyHint="先選縣市。親子館與托育資源中心多半免費，提供遊戲空間、親子活動與托育諮詢；開放時間與是否需要預約，請先打電話或看縣市網站。"
      footnote="這份名冊截至 111 年 12 月，之後新設或搬遷的場館可能不在裡面。以縣市政府公告為準。" />
  );
}
