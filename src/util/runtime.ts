// 執行環境：Expo Go 只帶內建原生模組，行事曆、檔案類型宣告、精確鬧鐘這些要正式安裝版才有。
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// 交接檔的 UTI：正式安裝版用 app.json 宣告的自訂類型，對方點檔案就開 APP；Expo Go 沒有宣告，退回通用類型。
export const PSYNC_UTI = isExpoGo ? 'public.data' : 'com.yinyaoqing.parentingsecretary.psync';
