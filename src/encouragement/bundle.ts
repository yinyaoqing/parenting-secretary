// 內容檔由 Metro 載入（node 測試直接讀檔，不經此模組）。
import bundled from '../../content/encouragement/cards.json';
import type { Bundle } from './pick';
export const ENCOURAGE: Bundle = bundled as unknown as Bundle;
