import { lazy, Suspense, type ReactNode } from 'react';
import type { WindowId } from './window-manager';

const AboutApp = lazy(() => import('@/apps/AboutApp'));

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
};

export function getAppDef(id: WindowId): AppDef | null {
  // own-key check: a plain object lookup would return Object.prototype members for ids like "constructor"
  return Object.hasOwn(REGISTRY, id) ? REGISTRY[id] : null;
}
