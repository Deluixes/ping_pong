# Configuration des Notifications Push

Ce guide explique comment configurer les notifications push pour l'application Ping Pong Club.

## 1. Configuration OneSignal

### 1.1 Créer un compte OneSignal

1. Aller sur https://onesignal.com
2. Créer un compte gratuit
3. Créer une nouvelle application (Web Push)

### 1.2 Configurer l'application OneSignal

1. Dans le dashboard OneSignal, aller dans **Settings > Platforms**
2. Sélectionner **Web**
3. Configurer :
   - **Site URL** : `https://votre-domaine.vercel.app`
   - **Default Icon URL** : URL de votre icône (optionnel)
4. Copier l'**App ID**

## 2. Configuration Frontend (Vercel)

Dans Vercel > Settings > Environment Variables, ajouter :

| Variable | Valeur |
|----------|--------|
| `VITE_ONESIGNAL_APP_ID` | Votre App ID OneSignal |

## 3. Configuration Supabase

### 3.1 Exécuter le script SQL

1. Aller dans le Dashboard Supabase
2. SQL Editor > New Query
3. Copier/coller le contenu de `supabase/migrations/push_notifications.sql`
4. Exécuter

Ce script crée les tables :
- `push_subscriptions` - Stockage des abonnements
- `notification_preferences` - Préférences utilisateur

### 3.2 Configurer les Webhooks (optionnel)

Si vous voulez envoyer des notifications automatiques depuis Supabase :

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

**Webhook 3 : Réponse aux invitations (acceptation/refus)**
- Name: `on-invitation-response`
- Table: `slot_invitations`
- Events: `UPDATE`, `DELETE`
- Type: `Supabase Edge Function`
- Edge Function: `on-invitation-response`

**Webhook 4 : Inscription sur un créneau**
- Name: `on-slot-registration`
- Table: `reservations`
- Events: `INSERT`
- Type: `Supabase Edge Function`
- Edge Function: `on-slot-registration`

### 3.3 Migration pour les notifications d'inscription

Exécuter dans le SQL Editor :

```sql
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS registrations_enabled BOOLEAN DEFAULT true;
```

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
3. Vérifier la console du navigateur pour les erreurs OneSignal

### Erreur "Configuration manquante"

Vérifier que `VITE_ONESIGNAL_APP_ID` est bien configuré dans Vercel

### Les notifications fonctionnent en dev mais pas en prod

Vérifier que l'URL du site est correctement configurée dans OneSignal (doit correspondre à votre domaine Vercel)
