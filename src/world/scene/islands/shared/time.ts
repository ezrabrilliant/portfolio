const pad2 = (n: number) => String(n).padStart(2, "0");

/** Discord-style timestamp used on chats and receipts: "Today at HH:MM" (24 h, local clock). */
export function todayAt(d: Date): string {
  return `Today at ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
