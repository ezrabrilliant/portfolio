/**
 * Every visible string of the POS Monosuko cashier screen (the real app's "Input Order" page), in English
 * (spec §5.2). Sub-project 2E translates the real POS build with this same glossary, so the island screen and the
 * demo read the same. Proper names stay as they are: Ayam Bakar Banjar Monosuko, PB1 (the restaurant tax).
 */
export const POS_STRINGS = {
  brand: ["Ayam Bakar Banjar", "Monosuko"],
  product: "Point of Sale",
  nav: ["Home", "Transactions", "Tables", "History", "Close Register", "Stock"],
  /** Index of the active nav item (Transactions). */
  navActive: 1,
  title: "Input Order",
  shift: "Morning shift",
  search: "Search menu…",
  pills: ["All", "Grilled Chicken", "Value Meals", "Soups & Veg", "Drinks"],
  /** Menu cards in menu order (pos.ts MENU holds the prices and stock). */
  menu: [
    { name: "Grilled Chicken Piece", badge: "Variant" },
    { name: "Combo A (1 pax)", badge: "Combo" },
    { name: "Chicken Tauco Soup" },
    { name: "Smashed Beef Empal" },
    { name: "Steamed Rice" },
    { name: "Iced Tea", badge: "Variant" },
  ] as readonly { name: string; badge?: string }[],
  order: "Order",
  items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
  dineIn: "Dine-in",
  takeaway: "Takeaway",
  chooseTable: "Choose a table",
  emptyTitle: "No items yet",
  emptyLine: "Pick a menu item to start the order.",
  subtotal: "Subtotal",
  taxNote: "10% restaurant tax (PB1) is added at payment.",
  save: "Save",
  pay: "Pay",
  payment: "Payment",
  table: (n: number) => `Table ${n}`,
  left: (n: number) => `${n} left`,
  soldOut: "Sold out",
};
