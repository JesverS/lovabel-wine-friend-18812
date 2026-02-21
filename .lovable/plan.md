

# Plan : Notifications Push pour app React Native

## Architecture globale

Le systeme repose sur 3 couches :

```text
App React Native
  |
  | (enregistre le device token via Supabase)
  v
Table push_notification_token (Supabase)
  |
  | (trigger sur INSERT dans table notification)
  v
Edge Function send-push-notification
  |
  | (appel HTTP)
  v
Firebase Cloud Messaging (FCM)
  |
  +---> APNs (iPhone)
  +---> Google Push (Android)
```

---

## Ce que je peux implementer (cote Supabase)

### 1. Table `push_notification_token`

Migration SQL pour creer la table qui stocke les tokens des appareils :

- `id` (uuid, PK)
- `user_id` (uuid, FK vers auth.users)
- `device_token` (text, unique)
- `platform` (text : 'ios', 'android')
- `created_at`, `updated_at`
- Contrainte unique sur `(user_id, device_token)`
- Politiques RLS : chaque utilisateur ne peut gerer que ses propres tokens

### 2. Edge Function `send-push-notification`

Fonction qui recoit un `user_id`, `title`, `body`, `data` et :
- Recupere tous les tokens de l'utilisateur dans `push_notification_token`
- Genere un access token OAuth2 a partir du compte de service Firebase (Google Service Account JSON)
- Envoie via l'API FCM HTTP v1 (`https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`)
- Gere le nettoyage des tokens invalides (suppression si FCM retourne `UNREGISTERED`)

### 3. Trigger automatique sur la table `notification`

Un trigger SQL sur `AFTER INSERT` de la table `notification` qui appelle `send-push-notification` via `pg_net` (requete HTTP asynchrone). Chaque notification in-app declenchera automatiquement une notification push, sans aucune modification des fonctions existantes.

### 4. Endpoint pour enregistrer/supprimer les tokens

L'Edge Function `send-push-notification` gerera aussi un mode `register` et `unregister` pour que l'app native puisse enregistrer ou supprimer un token (ou l'app peut directement inserer/supprimer dans la table via le SDK Supabase).

---

## Ce que vous devez faire (cote config + app native)

### Etape 1 : Configurer Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Creer un projet (ou utiliser un existant)
3. Activer Cloud Messaging
4. **Pour iOS** : Uploader votre cle APNs (.p8) dans Firebase > Project Settings > Cloud Messaging > Apple app configuration
5. **Pour Android** : Telecharger `google-services.json` et l'ajouter au projet Android
6. Telecharger le fichier JSON du compte de service : Firebase > Project Settings > Service Accounts > Generate new private key

### Etape 2 : Me fournir le secret

Me donner le contenu du fichier JSON du compte de service Firebase. Je le stockerai comme secret Supabase (`FIREBASE_SERVICE_ACCOUNT_KEY`) accessible uniquement par les Edge Functions.

### Etape 3 : Code React Native (a implementer dans votre codebase native)

#### Installation des dependances

```bash
# Si vous utilisez react-native-firebase
npm install @react-native-firebase/app @react-native-firebase/messaging
cd ios && pod install
```

#### Enregistrement du token

```typescript
// Dans votre app React Native
import messaging from '@react-native-firebase/messaging';
import { supabase } from './supabaseClient';

// Demander la permission (iOS)
async function requestPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  return enabled;
}

// Enregistrer le token
async function registerPushToken() {
  const permitted = await requestPermission();
  if (!permitted) return;

  const token = await messaging().getToken();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !token) return;

  // Upsert dans push_notification_token
  await supabase
    .from('push_notification_token')
    .upsert({
      user_id: user.id,
      device_token: token,
      platform: Platform.OS, // 'ios' ou 'android'
    }, { onConflict: 'device_token' });
}

// Ecouter le rafraichissement du token
messaging().onTokenRefresh(async (newToken) => {
  // Meme logique d'upsert avec le nouveau token
});
```

#### Gestion des notifications recues

```typescript
// Notification recue en foreground
messaging().onMessage(async (remoteMessage) => {
  // Afficher une alerte ou un toast in-app
});

// Notification cliquee (app en background)
messaging().onNotificationOpenedApp((remoteMessage) => {
  // Naviguer vers le bon ecran selon remoteMessage.data
  // Ex: si data.event_slug -> naviguer vers l'evenement
});

// App ouverte via notification (app fermee)
messaging()
  .getInitialNotification()
  .then((remoteMessage) => {
    if (remoteMessage) {
      // Meme logique de navigation
    }
  });
```

#### Desinscription a la deconnexion

```typescript
async function unregisterPushToken() {
  const token = await messaging().getToken();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !token) return;

  await supabase
    .from('push_notification_token')
    .delete()
    .eq('user_id', user.id)
    .eq('device_token', token);
}
```

---

## Resume de la repartition

| Tache | Qui | Details |
|-------|-----|---------|
| Table `push_notification_token` + RLS | Moi | Migration SQL |
| Edge Function `send-push-notification` | Moi | Code Deno complet |
| Trigger sur table `notification` | Moi | SQL avec pg_net |
| Config `supabase/config.toml` | Moi | Ajout de la fonction |
| Creer projet Firebase + configurer APNs | Vous | Console Firebase |
| Fournir le JSON du compte de service | Vous | Je le stocke en secret |
| Code React Native (token + listeners) | Vous | Copier le code ci-dessus dans l'app |
| Config iOS (capabilities Push) | Vous | Xcode > Signing & Capabilities |
| Config Android (google-services.json) | Vous | Ajouter au projet Android |

---

## Prochaine etape

Des que vous aurez configure Firebase et que vous me fournirez le JSON du compte de service, je pourrai implementer toute la partie Supabase (table, Edge Function, trigger).

