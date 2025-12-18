# Configuration des Notifications Push

Ce guide explique comment configurer les notifications push pour l'application Ping Pong Club.

## 1. Clés VAPID

Générer des clés VAPID avec la commande :
```bash
npx web-push generate-vapid-keys
```

Conserver les clés générées pour les étapes suivantes.

## 2. Configuration Frontend (Vercel)

Dans Vercel > Settings > Environment Variables, ajouter :

| Variable | Valeur |
|----------|--------|
| `VITE_VAPID_PUBLIC_KEY` | Votre clé publique VAPID |

## 3. Configuration Supabase

### 3.1 Exécuter le script SQL

1. Aller dans le Dashboard Supabase
2. SQL Editor > New Query
3. Copier/coller le contenu de `supabase/migrations/push_notifications.sql`
4. Exécuter

### 3.2 Configurer les Secrets

Dans le Dashboard Supabase : Settings > Edge Functions > Secrets

Ajouter ces secrets :

| Nom | Valeur |
|-----|--------|
| `VAPID_PUBLIC_KEY` | Votre clé publique VAPID |
| `VAPID_PRIVATE_KEY` | Votre clé privée VAPID |
| `VAPID_SUBJECT` | `mailto:votre-email@example.com` |

### 3.3 Créer les Edge Functions

Dans le Dashboard Supabase : Edge Functions > Create function

Créer 3 fonctions :
- `send-push-notification`
- `on-invitation-created`
- `on-slot-opened`

### 3.4 Configurer les Webhooks

Dans le Dashboard Supabase : Database > Webhooks > Create webhook

**Webhook 1 : Invitations**
- Name: `on-invitation-created`
- Table: `slot_invitations`
- Events: `INSERT`
- Type: `Supabase Edge Function`
- Edge Function: `on-invitation-created`

**Webhook 2 : Ouverture de créneaux**
- Name: `on-slot-opened`
- Table: `opened_slots`
- Events: `INSERT`
- Type: `Supabase Edge Function`
- Edge Function: `on-slot-opened`

## 4. Tester

1. Ouvrir l'application sur un appareil mobile
2. Aller dans Paramètres > Notifications
3. Activer les notifications
4. Cliquer sur "Tester les notifications"
5. Une notification devrait apparaître

## 5. Dépannage

### Les notifications ne s'affichent pas

1. Vérifier que le navigateur supporte les notifications (Chrome, Firefox, Safari 16.4+)
2. Vérifier que les permissions sont accordées
3. Vérifier les logs des Edge Functions dans Supabase

### Erreur "Configuration manquante"

Vérifier que `VITE_VAPID_PUBLIC_KEY` est bien configuré dans Vercel

### Les webhooks ne se déclenchent pas

1. Vérifier que les webhooks sont activés dans Supabase
2. Vérifier les logs dans Database > Webhooks
