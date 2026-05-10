import { Stack } from 'expo-router'

export default function WaiterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="table-map" />
      <Stack.Screen name="order-success" />
    </Stack>
  )
}