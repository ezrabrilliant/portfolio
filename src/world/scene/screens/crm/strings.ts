/**
 * Every visible string of the Bee Furniture CRM dashboard (the real app's DashboardHome), in English as in the app
 * (spec §5.3). Sub-project 2E reuses this glossary for the demo build.
 */
export const CRM_STRINGS = {
  brand: ["Bee Furniture", "Admin"],
  logoEmoji: "🐝",
  nav: ["Dashboard", "Customers", "Products", "Transactions", "Promo", "Analytics", "Task To Do", "Tickets", "About"],
  header: "Dashboard",
  addNew: "+ Add New",
  logout: "Logout",
  avatar: "JD",
  title: "Main Dashboard",
  subtitle: "Monitor your business performance in real-time.",
  kpis: ["Total Revenue", "Total Customers", "Total Transactions", "Active Promotions"],
  chartTitle: "Sales Trend (Last 7 Days)",
  legend: "Daily Revenue (Rp)",
  tasksTitle: "Upcoming Tasks",
  viewAll: "View All",
  /** Task texts in task order (crm.ts SEED_TASKS holds due offsets and status). */
  tasks: ["Prepare the monthly report", "Check ergonomic chair stock", "Follow up with customer Budi"],
  due: (date: string) => `Due: ${date}`,
  pending: "Pending",
  completed: "Completed",
};
