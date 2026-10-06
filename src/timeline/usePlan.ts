// 讀一個孩子的計畫層：行程、範本顯示設定、起點日期。時間軸、行程清單共用。
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Child, ScheduleItem } from '../db/types';
import { getTemplateMode, listScheduleItems, type TemplateMode } from '../db/schedule';
import { firstEventDate } from '../db/events';
import { anchorDate, type AnchorFacts, type PlanOptions } from './plan';

export interface PlanState {
  items: ScheduleItem[];
  mode: TemplateMode;
  facts: AnchorFacts | null;
  anchorAt: string | null;
  opts: PlanOptions | null;
  loaded: boolean;
  reload: () => Promise<void>;
}

export function usePlan(child: Child | null): PlanState {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [mode, setMode] = useState<TemplateMode>({ enabled: false, anchor: null });
  const [firstSolid, setFirstSolid] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const childId = child?.id;

  const reload = useCallback(async () => {
    if (!childId) return;
    const [its, m, fs] = await Promise.all([listScheduleItems(childId), getTemplateMode(childId), firstEventDate(childId, 'feed.solid')]);
    setItems(its); setMode(m); setFirstSolid(fs); setLoaded(true);
  }, [childId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);

  const facts: AnchorFacts | null = child ? { birthDate: child.birthDate, daycareFrom: child.daycareFrom, schoolFrom: child.schoolFrom, firstSolidDate: firstSolid ?? undefined } : null;
  const anchorAt = facts ? anchorDate(mode.anchor, facts) : null;
  const opts: PlanOptions | null = child ? { templatesOn: mode.enabled && !!anchorAt, anchorDate: anchorAt, birthDate: child.birthDate.slice(0, 10) } : null;
  return { items, mode, facts, anchorAt, opts, loaded, reload };
}
