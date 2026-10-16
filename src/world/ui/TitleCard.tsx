import { useEffect, useState, useSyncExternalStore } from "react";
import { worldProjects } from "@/config/portfolio";
import { islandTitle } from "@/world/scene/islands/shared/project";
import { TITLE_CARD, subscribeTitleCard, titleCardNow } from "./islandAnnounce";

/**
 * The card in the middle of the screen (islandAnnounce.ts): an island's name and its project's year as the camera
 * arrives, or a message of its own (a gold block found).
 */
export function TitleCard() {
  const card = useSyncExternalStore(subscribeTitleCard, titleCardNow, () => null);
  const [shown, setShown] = useState<typeof card>(null);
  useEffect(() => {
    if (!card) return;
    const on = window.setTimeout(() => setShown(card), card.delay * 1000);
    const off = window.setTimeout(() => setShown(null), (card.delay + TITLE_CARD.show) * 1000);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [card]);
  if (!shown) return null;
  const title = shown.title ?? islandTitle(shown.id);
  const sub = shown.sub ?? worldProjects.find((p) => p.id === shown.id)?.year;
  return (
    <div className={shown.gold ? "title-card title-card--gold" : "title-card"} role="status" key={shown.at}>
      <span className="title-card-name">{title}</span>
      {sub ? <span className="title-card-year">{sub}</span> : null}
    </div>
  );
}
