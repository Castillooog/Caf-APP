// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
type TargetRole  = 'kitchen' | 'waiter' | 'admin' | 'cashier'

type NotificationPayload = {
  title: string
  body:  string
  data?: Record<string, string>
}

function getNotificationConfig(
  status: OrderStatus,
  tableNumber: string,
  orderId: string
): { payload: NotificationPayload; targetRoles: TargetRole[] } | null {

  const shortId = orderId.slice(-4).toUpperCase()

  const configs: Partial<Record<OrderStatus, {
    payload: NotificationPayload
    targetRoles: TargetRole[]
  }>> = {
    pending: {
      targetRoles: ['kitchen'],
      payload: {
        title: '🍽️ Nuevo pedido',
        body:  `Mesa ${tableNumber} acaba de hacer un pedido`,
        data:  { orderId, screen: 'kitchen' },
      },
    },
    confirmed: {
      targetRoles: ['kitchen'],
      payload: {
        title: '✅ Pedido confirmado',
        body:  `Mesa ${tableNumber} — #${shortId} fue confirmado`,
        data:  { orderId, screen: 'kitchen' },
      },
    },
    preparing: {
      targetRoles: ['waiter'],
      payload: {
        title: '👨‍🍳 En preparación',
        body:  `El pedido #${shortId} ya está siendo preparado`,
        data:  { orderId, screen: 'orders' },
      },
    },
    ready: {
      targetRoles: ['waiter'],
      payload: {
        title: '🔔 Pedido listo',
        body:  `Mesa ${tableNumber} — #${shortId} está listo para entregar`,
        data:  { orderId, screen: 'orders' },
      },
    },
    delivered: {
      targetRoles: ['admin', 'cashier'],
      payload: {
        title: '💰 Listo para cobrar',
        body:  `Mesa ${tableNumber} — #${shortId} fue entregado`,
        data:  { orderId, screen: 'cashier' },
      },
    },
    cancelled: {
      targetRoles: ['kitchen', 'waiter'],
      payload: {
        title: '❌ Pedido cancelado',
        body:  `El pedido #${shortId} de mesa ${tableNumber} fue cancelado`,
        data:  { orderId, screen: 'orders' },
      },
    },
  }

  return configs[status] ?? null
}

async function getTokensForRoles(roles: TargetRole[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token, profiles!inner(role)')
    .in('profiles.role', roles)

  if (error) {
    console.error('Error fetching tokens:', error)
    return []
  }

  return (data ?? []).map((row: any) => row.token)
}

async function sendExpoPush(tokens: string[], payload: NotificationPayload): Promise<void> {
  if (tokens.length === 0) {
    console.log('No tokens to send to')
    return
  }

  const messages = tokens.map(token => ({
    to:    token,
    sound: 'default',
    title: payload.title,
    body:  payload.body,
    data:  payload.data ?? {},
  }))

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      'Accept':          'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })

  const result = await res.json()

  // Limpiar tokens inválidos
  if (result.data) {
    const invalidTokens: string[] = []
    result.data.forEach((item: any, idx: number) => {
      if (
        item.status === 'error' &&
        (item.details?.error === 'DeviceNotRegistered' ||
         item.details?.error === 'InvalidCredentials')
      ) {
        invalidTokens.push(tokens[idx])
      }
    })
    if (invalidTokens.length > 0) {
      await supabase.from('push_tokens').delete().in('token', invalidTokens)
      console.log(`Removed ${invalidTokens.length} invalid tokens`)
    }
  }
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${Deno.env.get('WEBHOOK_SECRET')}`) {
      console.error('Unauthorized request')
      return new Response('Unauthorized', { status: 401 })
    }

    const body      = await req.json()
    const newRecord = body.record
    const oldRecord = body.old_record

    if (!newRecord) {
      return new Response('No record', { status: 400 })
    }

    if (oldRecord?.status === newRecord.status) {
      console.log('Status unchanged, skipping')
      return new Response('Status unchanged', { status: 200 })
    }

    console.log(`Order ${newRecord.id} changed: ${oldRecord?.status} → ${newRecord.status}`)

    const tableNumber = newRecord.table_number ?? 'Sin mesa'

    const config = getNotificationConfig(
      newRecord.status as OrderStatus,
      tableNumber,
      newRecord.id
    )

    if (!config) {
      console.log(`No notification configured for status: ${newRecord.status}`)
      return new Response('No notification for this status', { status: 200 })
    }

    const tokens = await getTokensForRoles(config.targetRoles)
    await sendExpoPush(tokens, config.payload)

    console.log(`Push sent → status: ${newRecord.status} → ${tokens.length} devices`)

    return new Response(
      JSON.stringify({ ok: true, status: newRecord.status, sent: tokens.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-push-notification' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
