// 目前孩子（active child）：全域狀態，首頁、內容、時程、設定都讀這裡。切換後所有分頁立即跟著換。
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSetting, listChildren, setSetting } from '../db/repo';
import type { Child } from '../db/types';

export const ACTIVE_CHILD_KEY = 'activeChildId';

type ChildValue = {
  children: Child[];
  active: Child | null;
  loaded: boolean;
  setActive: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

const ChildCtx = createContext<ChildValue | null>(null);

export function ChildProvider({ children: node }: { children: ReactNode }) {
  const [list, setList] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [cs, id] = await Promise.all([listChildren(), getSetting(ACTIVE_CHILD_KEY)]);
      setList(cs);
      setActiveId(id || null);
    } catch {
      setList([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);

  // 沒有設定、或設定指到已封存的孩子時，退回第一個孩子。
  const active = useMemo(() => list.find((c) => c.id === activeId) ?? list[0] ?? null, [list, activeId]);

  const value = useMemo<ChildValue>(() => ({
    children: list,
    active,
    loaded,
    reload,
    setActive: async (id) => { setActiveId(id); await setSetting(ACTIVE_CHILD_KEY, id); },
  }), [list, active, loaded, reload]);

  return <ChildCtx.Provider value={value}>{node}</ChildCtx.Provider>;
}

export function useChildren(): ChildValue {
  const v = useContext(ChildCtx);
  if (!v) throw new Error('useChildren 需要在 ChildProvider 內使用');
  return v;
}
