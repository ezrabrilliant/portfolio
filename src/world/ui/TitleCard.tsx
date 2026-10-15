import { useEffect, useState, useSyncExternalStore } from "react";
import { worldProjects } from "@/config/portfolio";
import { islandTitle } from "@/world/scene/islands/shared/project";
import { TITLE_CARD, subscribeTitleCard, titleCardNow } from "./islandAnnounce";

/** The island's name, and its project's year when it has one, as the camera arrives (islandAnnounce.ts). */
export function TitleCard() {
  const card = useSyncExternalStore(subscribeTitleCard, titleCardNow, () => null);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!card) return;
    const on = window.setTimeout(() => setShown(card.id), card.delay * 1000);
    const off = window.setTimeout(() => setShown(null), (card.delay + TITLE_CARD.show) * 1000);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [card]);
  if (!shown) return null;
  const year = worldProjects.find((p) => p.id === shown)?.year;
  return (
    <div className="title-card" role="status" key={card?.at}>
      <span className="title-card-name">{islandTitle(shown)}</span>
      {year ? <span className="title-card-year">{year}</span> : null}
    </div>
  );
}
