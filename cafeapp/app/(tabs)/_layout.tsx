import { Colors, Font } from "@/constants/theme";
import { useAuthStore } from "@/stores/useauthstore";
import { Tabs } from "expo-router";
import {
  Bell,
  ClipboardList,
  CreditCard,
  Flame,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ShoppingCart,
  User,
  UtensilsCrossed,
} from "lucide-react-native";

// Tabs por rol — solo ve lo que necesita
const ROLE_TABS: Record<string, string[]> = {
  customer: ["index", "cart", "waiter-orders", "profile"],
  waiter: ["index", "cart", "waiter-orders", "profile"],
  kitchen: ["orders", "profile"],
  cashier: ["cashier", "profile"],
  admin: [
    "admin-dashboard",
    "admin-products",
    "index",
    "orders",
    "cashier",
    "waiter-orders",
    "profile",
  ],
};

type TabName =
  | "index"
  | "cart"
  | "waiter-orders"
  | "orders"
  | "cashier"
  | "notifications"
  | "profile"
  | "admin-dashboard"
  | "admin-products";

const TAB_CONFIG: Record<TabName, { title: string; Icon: LucideIcon }> = {
  "admin-dashboard": { title: "Dashboard", Icon: LayoutDashboard },
  "admin-products": { title: "Productos", Icon: Package },
  index: { title: "Menú", Icon: UtensilsCrossed },
  cart: { title: "Carrito", Icon: ShoppingCart },
  "waiter-orders": { title: "Pedidos", Icon: ClipboardList },
  orders: { title: "Cocina", Icon: Flame },
  cashier: { title: "Caja", Icon: CreditCard },
  notifications: { title: "Alertas", Icon: Bell },
  profile: { title: "Perfil", Icon: User },
};

const ALL_TABS: TabName[] = [
  "admin-dashboard",
  'admin-products',
  "index",
  "cart",
  "waiter-orders",
  "orders",
  "cashier",
  "notifications",
  "profile",
];

export default function TabsLayout() {
  const { profile } = useAuthStore();
  const role = profile?.role ?? "customer";
  const visibleTabs = ROLE_TABS[role] ?? ROLE_TABS.customer;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.espresso,
        tabBarInactiveTintColor: Colors.latte,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.creamDeep,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: Font.sans,
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      {ALL_TABS.map((name) => {
        const cfg = TAB_CONFIG[name];
        const visible = visibleTabs.includes(name);

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: cfg.title,
              href: visible ? undefined : null,
              tabBarIcon: ({ color, size }) => (
                <cfg.Icon size={size} color={color} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
