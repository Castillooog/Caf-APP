import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useauthstore'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
})

export function usePushNotifications() {
  const { session } = useAuthStore()
  const notificationListener = useRef<Notifications.Subscription>()
  const responseListener     = useRef<Notifications.Subscription>()

  useEffect(() => {
    if (!session?.user) return

    registerForPushNotifications(session.user.id)

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification)
      })

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          screen?: string
          orderId?: string
        }
        handleNotificationTap(data)
      })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [session?.user?.id])
}

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied')
    return
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name:             'Pedidos',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#3C3489',
      sound:            'default',
    })
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })

    const token    = tokenData.data
    const platform = Platform.OS as 'ios' | 'android' | 'web'

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform },
        { onConflict: 'user_id,token' }
      )

    if (error) console.error('Error saving push token:', error)
    else console.log('Push token registered:', token)
  } catch (err) {
    console.error('Error getting push token:', err)
  }
}

function handleNotificationTap(data: { screen?: string; orderId?: string }) {
  if (!data.screen) return
  switch (data.screen) {
    case 'kitchen': return router.push('/(tabs)/orders')
    case 'orders':  return router.push('/(tabs)/orders')
    case 'cashier': return router.push('/(tabs)/notifications')
    default:        return router.push('/(tabs)')
  }
}