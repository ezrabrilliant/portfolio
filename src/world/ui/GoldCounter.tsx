import { useSyncExternalStore } from "react";
import { goldSnapshot, subscribeGold } from "@/world/scene/gold/progress";
import { GOLD_TOTAL } from "@/world/scene/gold/spots";

/** The gold blocks found so far ("3 / 9"), shown once the first is found (Gold.tsx). */
export function GoldCounter() {
  const gold = useSyncExternalStore(subscribeGold, goldSnapshot, goldSnapshot);
  if (gold.count === 0) return null;
  return (
    <div className="hud-gold" role="status" aria-label={`${gold.count} of ${GOLD_TOTAL} gold blocks found`} title="Gold blocks found">
      <span className="hud-gold-icon" aria-hidden="true" />
      {gold.count} / {GOLD_TOTAL}
    </div>
  );
}
