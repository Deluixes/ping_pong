# Configuration des Notifications Push

Ce guide explique comment configurer les notifications push pour l'application Ping Pong Club.

## 1. Clés VAPID

Les clés VAPID ont été générées. Voici les valeurs à utiliser :

```
Public Key:  BHF2Nxjs4tUF9SaujwtK69PZgVb65kf3nGtlnRx00Yx9W8tQ-wOYttg54w-tgu86dhQZnk5AMgufLgDrrfcJXPA
Private Key: QVGQIm28QkPEyBO3WOLOvq4e6_o53Fp2H0iiLpEAMb0
```

## 2. Configuration Frontend

Ajouter dans le fichier `.env` :

```
VITE_VAPID_PUBLIC_KEY=BHF2Nxjs4tUF9SaujwtK69PZgVb65kf3nGtlnRx00Yx9W8tQ-wOYttg54w-tgu86dhQZnk5AMgufLgDrrfcJXPA
```

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
| `VAPID_PUBLIC_KEY` | `BHF2Nxjs4tUF9SaujwtK69PZgVb65kf3nGtlnRx00Yx9W8tQ-wOYttg54w-tgu86dhQZnk5AMgufLgDrrfcJXPA` |
| `VAPID_PRIVATE_KEY` | `QVGQIm28QkPEyBO3WOLOvq4e6_o53Fp2H0iiLpEAMb0` |
| `VAPID_SUBJECT` | `mailto:admin@pingpong-club.fr` |

### 3.3 Déployer les Edge Functions

Installer Supabase CLI si pas déjà fait :
```bash
npm install -g supabase
```

Se connecter :
```bash
supabase login
```

Lier au projet :
```bash
supabase link --project-ref <votre-project-ref>
```

Déployer les fonctions :
```bash
supabase functions deploy send-push-notification
supabase functions deploy on-invitation-created
supabase functions deploy on-slot-opened
```

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

Vérifier que `VITE_VAPID_PUBLIC_KEY` est bien dans le fichier `.env`

### Les webhooks ne se déclenchent pas

1. Vérifier que les webhooks sont activés dans Supabase
2. Vérifier les logs dans Database > Webhooks
