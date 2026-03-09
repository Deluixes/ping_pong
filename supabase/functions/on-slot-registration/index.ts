import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function formatDateFr(dateStr: string) {
  const d = new Date(dateStr)
  const jour = JOURS[d.getDay()]
  const num = d.getDate()
  const mois = MOIS[d.getMonth()]
  return `${jour} ${num} ${mois}`
}

function formatSlotTime(slotId: string, duration = 1) {
  const [h, m] = slotId.split(':').map(Number)
  const startH = m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`

  const endMinutes = h * 60 + m + (duration * 30)
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  const endStr = endM === 0 ? `${endH}h` : `${endH}h${endM.toString().padStart(2, '0')}`

  return `${startH} à ${endStr}`
}

function slotIdToMinutes(slotId: string): number {
  const [h, m] = slotId.split(':').map(Number)
  return h * 60 + m
}

function minutesToSlotId(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook payload:', JSON.stringify(payload))

    // Only process INSERT events
    if (payload.type !== 'INSERT') {
      console.log('Event ignored:', payload.type)
      return new Response('Ignored', { status: 200 })
    }

    const record = payload.record
    const slotId = record.slot_id
    const date = record.date
    const userId = record.user_id
    const userName = record.user_name
    const duration = record.duration || 1

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // De-duplication: for multi-slot registrations, only process the first slot
    if (duration > 1) {
      const currentMinutes = slotIdToMinutes(slotId)
      const prevMinutes = currentMinutes - 30
      if (prevMinutes >= 0) {
        const prevSlotId = minutesToSlotId(prevMinutes)
        const { data: prevRow } = await supabase
          .from('reservations')
          .select('id')
          .eq('slot_id', prevSlotId)
          .eq('date', date)
          .eq('user_id', userId)
          .eq('duration', duration)
          .maybeSingle()

        if (prevRow) {
          console.log(`Skipping duplicate: ${slotId} is not the first slot (prev: ${prevSlotId})`)
          return new Response('Skipped (not first slot)', { status: 200 })
        }
      }
    }

    console.log(`Processing registration: ${userName} on ${date} at ${slotId} (duration: ${duration})`)

    // Compute all covered slot IDs
    const startMinutes = slotIdToMinutes(slotId)
    const coveredSlotIds: string[] = []
    for (let i = 0; i < duration; i++) {
      coveredSlotIds.push(minutesToSlotId(startMinutes + i * 30))
    }

    console.log('Covered slots:', coveredSlotIds)

    // Find other users registered on overlapping slots
    const { data: overlapping } = await supabase
      .from('reservations')
      .select('user_id')
      .eq('date', date)
      .in('slot_id', coveredSlotIds)
      .neq('user_id', userId)

    const uniqueUserIds = [...new Set((overlapping || []).map((r: { user_id: string }) => r.user_id))]

    if (uniqueUserIds.length === 0) {
      console.log('No other users on these slots')
      return new Response('No users to notify', { status: 200 })
    }

    console.log('Users on overlapping slots:', uniqueUserIds)

    // Filter by notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .in('user_id', uniqueUserIds)
      .eq('enabled', true)
      .eq('registrations_enabled', true)

    const eligibleUserIds = (prefs || []).map((p: { user_id: string }) => p.user_id)

    if (eligibleUserIds.length === 0) {
      console.log('No eligible users (notifications disabled)')
      return new Response('No eligible users', { status: 200 })
    }

    console.log('Eligible users:', eligibleUserIds)

    // Build notification message
    const timeRange = formatSlotTime(slotId, duration)
    const dateFr = formatDateFr(date)
    const heading = `${userName} s'est inscrit le ${dateFr} de ${timeRange}`

    console.log('Sending notification:', heading)

    // Send via OneSignal API (single call with all eligible users)
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: Deno.env.get('ONESIGNAL_APP_ID'),
        include_aliases: { external_id: eligibleUserIds },
        target_channel: 'push',
        headings: { en: heading },
        contents: { en: 'message' },
        url: '/',
        chrome_web_badge: '/pwa-192x192.png'
      })
    })

    const result = await response.json()
    console.log('OneSignal response:', JSON.stringify(result))

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
