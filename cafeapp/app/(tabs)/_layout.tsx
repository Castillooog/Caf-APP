import { Tabs } from 'expo-router'
import { IconSymbol } from '@/components/ui/icon-symbol'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4B3621',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Menú',
          tabBarIcon: ({ color }) => <IconSymbol size={24} color={color} name="house.fill" />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Carrito',
          tabBarIcon: ({ color }) => <IconSymbol size={24} color={color} name="shopping.cart" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <IconSymbol size={24} color={color} name="person.circle" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={24} color={color} name="chevron.left.forwardslash.chevron.right" />,
        }}
      />
    </Tabs>
  )
}