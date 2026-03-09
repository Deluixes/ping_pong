import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function formatDateFr(dateStr) {
  const d = new Date(dateStr)
  const jour = JOURS[d.getDay()]
  const num = d.getDate()
  const mois = MOIS[d.getMonth()]
  return `${jour} ${num} ${mois}`
}

function formatSlotTime(slotId, duration = 1) {
  const [h, m] = slotId.split(':').map(Number)
  const startH = m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`

  const endMinutes = h * 60 + m + (duration * 30)
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  const endStr = endM === 0 ? `${endH}h` : `${endH}h${endM.toString().padStart(2, '0')}`

  return `${startH} à ${endStr}`
}

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook payload:', JSON.stringify(payload))

    const eventType = payload.type
    const record = payload.record
    const oldRecord = payload.old_record

    // UPDATE = acceptation (status passe à 'accepted')
    // DELETE = refus (la row est supprimée)
    let data
    let accepted

    if (eventType === 'UPDATE' && record?.status === 'accepted') {
      data = record
      accepted = true
    } else if (eventType === 'DELETE' && oldRecord) {
      data = oldRecord
      accepted = false
    } else {
      console.log('Event ignored:', eventType, record?.status)
      return new Response('Ignored', { status: 200 })
    }

    const invitedBy = data.invited_by
    const userName = data.user_name
    const slotId = data.slot_id
    const date = data.date
    const duration = data.duration || 1

    if (!invitedBy) {
      console.log('No invited_by, skipping')
      return new Response('No inviter', { status: 200 })
    }

    console.log(`Invitation ${accepted ? 'accepted' : 'declined'}: ${userName} for slot ${slotId} on ${date}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Vérifier les préférences de notification de l'inviteur
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', invitedBy)
      .eq('enabled', true)
      .eq('invitations_enabled', true)
      .single()

    if (!prefs) {
      console.log('Inviter has notifications disabled')
      return new Response('Notifications disabled', { status: 200 })
    }

    const timeRange = formatSlotTime(slotId, duration)
    const dateFr = formatDateFr(date)

    let heading

    if (accepted) {
      heading = `${userName} a accepté de jouer le ${dateFr} de ${timeRange}`
    } else {
      heading = `${userName} a refusé pour le créneau du ${dateFr} de ${timeRange}`
    }

    // Envoyer via OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: Deno.env.get('ONESIGNAL_APP_ID'),
        include_aliases: { external_id: [invitedBy] },
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
