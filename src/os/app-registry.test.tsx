import { describe, expect, it } from 'vitest';
import { getAppDef } from './app-registry';

describe('app registry', () => {
  it('resolves case:<slug> ids to a case window titled <slug>.case', () => {
    expect(getAppDef('case:gtid')?.title).toBe('gtid.case');
    // unknown slugs still resolve; the window body shows file-not-found instead of crashing
    expect(getAppDef('case:does-not-exist')?.title).toBe('does-not-exist.case');
  });

  it('registers market and keeps prototype keys unresolvable', () => {
    expect(getAppDef('market')?.title).toBe('Market');
    expect(getAppDef('constructor')).toBeNull();
    expect(getAppDef('nope')).toBeNull();
  });

  it('registers the terminal', () => {
    expect(getAppDef('terminal')?.title).toBe('Terminal');
  });
});
