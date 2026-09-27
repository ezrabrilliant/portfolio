import { lazy, Suspense, type ReactNode } from 'react';
import type { WindowId } from './window-manager';

const AboutApp = lazy(() => import('@/apps/AboutApp'));
const MarketApp = lazy(() => import('@/apps/MarketApp'));
const CaseWindow = lazy(() => import('@/apps/CaseWindow'));

export const CYCLE_SHORTCUT_LABEL = 'ctrl+`';

export interface AppDef {
  title: string;
  width: number;
  height?: number;
  render: () => ReactNode;
}

const lazily = (node: ReactNode) => <Suspense fallback={null}>{node}</Suspense>;

const REGISTRY: Record<string, AppDef> = {
  about: { title: 'About EzraOS', width: 480, render: () => lazily(<AboutApp />) },
  market: { title: 'Market', width: 460, height: 480, render: () => lazily(<MarketApp />) },
};

export function getAppDef(id: WindowId): AppDef | null {
  if (id.startsWith('case:')) {
    // every case id resolves; an unknown slug renders CaseWindow's file-not-found body instead of crashing
    const slug = id.slice(5);
    return { title: `${slug}.case`, width: 440, render: () => lazily(<CaseWindow slug={slug} />) };
  }
  // own-key check: a plain object lookup would return Object.prototype members for ids like "constructor"
  return Object.hasOwn(REGISTRY, id) ? REGISTRY[id] : null;
}
