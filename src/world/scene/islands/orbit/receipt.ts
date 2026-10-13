import { CANVAS_FONTS } from "../shared/canvasFonts";
import { todayAt } from "../shared/time";

/** Fictional products (never the live inventory). */
export const RECEIPT_ITEMS = ["Starter script pack (.txt)", "Proxy pass · 7 days", "VIP role · 30 days", "Dirt farm guide (.txt)"] as const;
export const FIRST_ORDER_NO = 2201;

export interface ReceiptOrder { no: number; item: string; at: Date }
export type ReceiptStyle = "brand" | "meta" | "rule" | "item" | "status" | "thanks";
export interface ReceiptLine { text: string; style: ReceiptStyle }

export function nextOrder(prevNo: number | null, at: Date): ReceiptOrder {
  const no = prevNo === null ? FIRST_ORDER_NO : prevNo + 1;
  const i = (((no - FIRST_ORDER_NO) % RECEIPT_ITEMS.length) + RECEIPT_ITEMS.length) % RECEIPT_ITEMS.length;
  return { no, item: RECEIPT_ITEMS[i], at };
}

/** Orbit's flow on paper: the order, paid with QRIS, delivered automatically by DM. No amounts. */
export function receiptLines(o: ReceiptOrder): ReceiptLine[] {
  return [
    { text: "ORBIT STORE", style: "brand" },
    { text: `Order #${o.no}`, style: "meta" },
    { text: todayAt(o.at), style: "meta" },
    { text: "", style: "rule" },
    { text: `1× ${o.item}`, style: "item" },
    { text: "", style: "rule" },
    { text: "QRIS · paid", style: "status" },
    { text: "delivered via DM", style: "status" },
    { text: "", style: "rule" },
    { text: "thank you for shopping", style: "thanks" },
  ];
}

export function drawReceipt(ctx: CanvasRenderingContext2D, lines: readonly ReceiptLine[], w: number, h: number): void {
  ctx.fillStyle = "#f7f4ec";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#3D62F8";
  ctx.fillRect(0, 0, w, 10);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let y = 78;
  for (const l of lines) {
    switch (l.style) {
      case "brand":
        ctx.fillStyle = "#16181d";
        ctx.font = `700 38px ${CANVAS_FONTS.ui}`;
        ctx.fillText(l.text, w / 2, y);
        y += 50;
        break;
      case "meta":
        ctx.fillStyle = "#4a4f57";
        ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
        ctx.fillText(l.text, w / 2, y);
        y += 34;
        break;
      case "rule":
        ctx.strokeStyle = "#b9b4a8";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(24, y - 12);
        ctx.lineTo(w - 24, y - 12);
        ctx.stroke();
        ctx.setLineDash([]);
        y += 26;
        break;
      case "item":
        ctx.fillStyle = "#16181d";
        ctx.font = `500 18px ${CANVAS_FONTS.mono}`; // the longest item keeps a margin on a 360 px roll
        ctx.fillText(l.text, w / 2, y);
        y += 36;
        break;
      case "status":
        ctx.fillStyle = "#16181d";
        ctx.font = `700 26px ${CANVAS_FONTS.ui}`;
        ctx.fillText(l.text, w / 2, y);
        y += 38;
        break;
      case "thanks":
        ctx.fillStyle = "#6b6f76";
        ctx.font = `500 18px ${CANVAS_FONTS.mono}`;
        ctx.fillText(l.text, w / 2, y);
        y += 30;
        break;
    }
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#16181d"; // barcode
  for (let x = 40, k = 0; x < w - 40; k++) {
    const bw = (k * 7) % 5 < 2 ? 4 : 2;
    ctx.fillRect(x, h - 130, bw, 70);
    x += bw + 3;
  }
}
