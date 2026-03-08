

# Preferences de notifications par device

## Reponse a ta question : faisabilite

Oui, c'est faisable. L'application React Native connait son propre `device_token` FCM lorsqu'elle s'enregistre dans `push_notification_token`. Elle peut donc :
- Lire les preferences associees a ce token precis
- Modifier les preferences pour ce token precis

L'Edge Function `send-push-notification` boucle deja token par token, donc le filtrage par device est naturel.

## Architecture base de donnees

### Nouvelle table `notification_preferences`

```text
notification_preferences
  id              uuid        PK, default gen_random_uuid()
  user_id         uuid        NOT NULL, FK -> auth.users
  token_id        uuid        NULL, FK -> push_notification_token(id) ON DELETE CASCADE
  post_like       boolean     DEFAULT true
  post_comment    boolean     DEFAULT true
  mention         boolean     DEFAULT true
  follow_request  boolean     DEFAULT true
  new_follower    boolean     DEFAULT true
  follow_accepted boolean     DEFAULT true
  event_join      boolean     DEFAULT true
  event_access_request boolean DEFAULT true
  event_invitation boolean    DEFAULT true
  cellar_invitation boolean   DEFAULT true
  refund_request  boolean     DEFAULT true
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

  UNIQUE (user_id, token_id)   -- un seul jeu de prefs par couple user/device
```

### Logique de `token_id`

- `token_id = NULL` : preferences globales de l'utilisateur (utilisees depuis le site web, ou comme fallback si un device n'a pas de prefs specifiques)
- `token_id = uuid` : preferences specifiques a ce device

Quand un token est supprime (device desinstalle, token invalide), le `ON DELETE CASCADE` supprime automatiquement ses preferences.

### Types NON configurables

Les types suivants ne sont PAS dans la table car l'utilisateur doit toujours les recevoir :
- `event_access_approved` / `event_access_rejected` (reponses a ses propres actions)
- `refund_processed` (reponse a sa demande)
- `level_up` (visible directement dans l'app)
- `badge_unlocked` (idem)

## Modifications SQL

### 1. Creer la table `notification_preferences`

Migration avec la structure ci-dessus, index sur `user_id`, et politique RLS : chaque utilisateur ne peut lire/modifier que ses propres preferences.

### 2. Modifier `create_notification()` pour les notifications web

Ajouter un check : si l'utilisateur a une ligne avec `token_id = NULL` et que le type correspondant est `false`, on ne cree pas la notification.

Cependant, pour les push, le filtrage se fait dans l'Edge Function (car il faut filtrer par device). Donc `create_notification()` ne bloque l'insertion que si **toutes** les preferences (globale + tous les devices) sont desactivees pour ce type. En pratique, pour simplifier :

- `create_notification()` verifie uniquement la preference globale (`token_id IS NULL`)
- Si la preference globale est `false`, pas d'insertion (donc pas de push non plus)
- Si la preference globale est `true` (ou absente = `true` par defaut), l'insertion se fait, et le filtrage par device se fait dans l'Edge Function

### 3. Modifier l'Edge Function `send-push-notification`

Avant d'envoyer a chaque token, lire les preferences specifiques a ce `token_id`. Si le type de notification est desactive pour ce device, on saute l'envoi.

```text
Pour chaque token de l'utilisateur :
  1. Chercher notification_preferences WHERE token_id = token.id
  2. Si pas de ligne -> utiliser les prefs globales (token_id IS NULL)
  3. Si pas de prefs du tout -> tout est actif (defaut)
  4. Verifier si le type est desactive -> si oui, skip
  5. Sinon, envoyer via FCM
```

### 4. Modifier `notify_mentioned_user()`

Remplacer l'INSERT direct par un appel a `create_notification()` pour que les preferences soient respectees aussi pour les mentions.

## Frontend

### Nouveau composant `NotificationPreferences.tsx`

Affiche les preferences groupees par categorie avec des Switch :

**Social**
- Likes sur mes posts (`post_like`)
- Commentaires sur mes posts (`post_comment`)
- Mentions (`mention`)
- Demandes d'abonnement (`follow_request`)
- Nouveaux abonnes (`new_follower`)
- Abonnement accepte (`follow_accepted`)

**Evenements**
- Nouveau participant (`event_join`)
- Demandes d'acces (`event_access_request`)
- Invitations (`event_invitation`)
- Demandes de remboursement (`refund_request`)

**Caves**
- Invitations a une cave (`cellar_invitation`)

### Comportement depuis le site web

Comme il n'y a pas de push web pour l'instant :
- Le site modifie la ligne avec `token_id = NULL` (preferences globales)
- Cela affecte tous les devices de l'utilisateur (sauf ceux qui ont des prefs specifiques)

### Comportement futur depuis l'app React Native

L'app enverra son `device_token` ou `token_id` pour modifier uniquement la ligne correspondante. Si aucune ligne specifique n'existe, elle en cree une en copiant les prefs globales comme point de depart.

### Integration dans UserProfile.tsx

Ajout d'un 5e onglet "Notifications" (icone Bell) dans le dialog des parametres, a cote de l'onglet "Confidentialite".

## Etapes d'implementation

1. **Migration SQL** : creer la table `notification_preferences` avec RLS
2. **Migration SQL** : modifier `create_notification()` pour checker les prefs globales
3. **Migration SQL** : modifier `notify_mentioned_user()` pour utiliser `create_notification()`
4. **Edge Function** : modifier `send-push-notification` pour filtrer par device
5. **Composant** : creer `NotificationPreferences.tsx`
6. **UserProfile.tsx** : ajouter l'onglet Notifications

## Avantages de cette approche

- **Extensible** : ajouter un nouveau type = ajouter une colonne boolean
- **Performante** : un seul SELECT sur une petite table indexee
- **Granulaire** : preferences par device possibles
- **Retrocompatible** : pas de prefs = tout actif, rien ne casse pour les utilisateurs existants
- **Nettoyage automatique** : CASCADE sur la suppression de token

