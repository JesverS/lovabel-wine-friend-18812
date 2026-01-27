

# Analyse Deep Links - Flux Paiement Stripe

## Problemes Identifies

### Probleme 1 : Token Prive Non Transmis dans PaymentGateway.tsx

**Fichier** : `src/pages/PaymentGateway.tsx` (lignes 312-319)

```typescript
// PROBLEME : Deep link sans token pour evenements prives
<Button 
  onClick={() => window.location.href = `winenote://event/${slug}`}
  className="w-full" 
  size="lg"
>
  Ouvrir dans l'app
</Button>
```

**Impact** : Quand un utilisateur deja inscrit arrive sur `/pay/{slug}`, le bouton "Ouvrir dans l'app" genere un deep link SANS le token prive. L'app mobile ne pourra pas ouvrir un evenement prive.

---

### Probleme 2 : PaymentSuccess.tsx ne Recupere Pas le Token Prive

**Fichier** : `src/pages/PaymentSuccess.tsx` (lignes 94-98)

```typescript
const handleOpenInApp = () => {
  const deepLink = getEventDeepLink(slug || "", null); // ← null = pas de token !
  const deepLinkWithPayment = deepLink + (...) + "payment=success";
  window.location.href = deepLinkWithPayment;
  // ...
};
```

**Impact** : Apres un paiement reussi pour un evenement prive, l'utilisateur clique sur "Ouvrir dans l'app Wine Note" et l'app recoit `winenote://event/{slug}?payment=success` SANS le token. L'app ne peut pas acceder a l'evenement prive.

**Cause racine** : Le token prive n'est pas passe du `PaymentGateway` au `PaymentSuccess`, ni recupere depuis l'Edge Function `get-event-by-slug`.

---

### Probleme 3 : PaymentCancelled.tsx Sans Token Prive

**Fichier** : `src/pages/PaymentCancelled.tsx` (lignes 15-17)

```typescript
const handleBackToApp = () => {
  const deepLink = getEventDeepLink(slug || "", null); // ← Meme probleme
  window.location.href = deepLink;
};
```

---

### Probleme 4 : getPaymentSuccessDeepLink Non Utilisee

**Fichier** : `src/lib/mobileAppUtils.ts` (lignes 68-71)

```typescript
export function getPaymentSuccessDeepLink(slug: string): string {
  return `winenote://event/${slug}?payment=success`;
}
```

Cette fonction existe mais ne gere pas le token prive et n'est pas utilisee dans le code.

---

## Analyse du Flux Complet

```text
+-------------------+         +------------------+         +-------------------+
| PaymentGateway.tsx|  -----> | Stripe Checkout  |  -----> | PaymentSuccess.tsx|
| /pay/{slug}       |         | (externe)        |         | /pay/{slug}/success|
+-------------------+         +------------------+         +-------------------+
        |                                                          |
        | Token prive                                              | Token prive
        | NON recupere                                             | NON transmis
        v                                                          v
   Deep link SANS token                                      Deep link SANS token
   winenote://event/{slug}                                   winenote://event/{slug}?payment=success
```

**Probleme central** : Le token prive de l'evenement n'est jamais passe dans la chaine `/pay/{slug}` → Stripe → `/pay/{slug}/success`.

---

## Solution Proposee

### Etape 1 : Stocker le Token Prive Avant le Paiement

Dans `PaymentGateway.tsx`, apres avoir recupere l'evenement :

```typescript
// Stocker le token prive en sessionStorage si evenement prive
if (eventData.private_token) {
  sessionStorage.setItem(`event_token_${eventData.slug}`, eventData.private_token);
}
```

### Etape 2 : Recuperer le Token dans PaymentSuccess.tsx

```typescript
const handleOpenInApp = () => {
  // Recuperer le token prive depuis sessionStorage
  const privateToken = sessionStorage.getItem(`event_token_${slug}`);
  
  // Construire le deep link avec token si evenement prive
  let deepLink = `winenote://event/${slug}`;
  const params = [];
  
  if (privateToken) {
    params.push(`token=${encodeURIComponent(privateToken)}`);
  }
  params.push("payment=success");
  
  deepLink += "?" + params.join("&");
  window.location.href = deepLink;
  // ...
};
```

### Etape 3 : Appliquer la Meme Logique a PaymentCancelled.tsx

```typescript
const handleBackToApp = () => {
  const privateToken = sessionStorage.getItem(`event_token_${slug}`);
  const deepLink = getEventDeepLink(slug || "", privateToken);
  window.location.href = deepLink;
};
```

### Etape 4 : Corriger PaymentGateway.tsx pour "already_member"

```typescript
// Dans le cas "already_member"
const privateToken = event.private_token || sessionStorage.getItem(`event_token_${slug}`);
<Button 
  onClick={() => window.location.href = getEventDeepLink(slug || "", privateToken)}
  className="w-full" 
  size="lg"
>
  Ouvrir dans l'app
</Button>
```

### Etape 5 : Mettre a Jour mobileAppUtils.ts

Modifier `getPaymentSuccessDeepLink` pour accepter un token optionnel :

```typescript
export function getPaymentSuccessDeepLink(slug: string, token?: string | null): string {
  const params = ['payment=success'];
  if (token) {
    params.unshift(`token=${encodeURIComponent(token)}`);
  }
  return `winenote://event/${slug}?${params.join('&')}`;
}
```

---

## Fichiers a Modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/PaymentGateway.tsx` | Stocker token prive + corriger deep link "already_member" |
| `src/pages/PaymentSuccess.tsx` | Recuperer token depuis sessionStorage + inclure dans deep link |
| `src/pages/PaymentCancelled.tsx` | Recuperer token depuis sessionStorage + inclure dans deep link |
| `src/lib/mobileAppUtils.ts` | Mettre a jour `getPaymentSuccessDeepLink` avec parametre token |

---

## Verification Supplementaire

L'Edge Function `get-event-by-slug` renvoie bien `private_token` dans la reponse (ligne 95 : `event: safeEventData` qui contient tous les champs). Cependant, `PaymentGateway.tsx` ne l'extrait pas correctement car le type `EventData` (lignes 14-25) ne contient pas le champ `private_token`.

**Correction additionnelle** : Ajouter `private_token?: string | null;` au type `EventData` dans `PaymentGateway.tsx`.

---

## Resume des Corrections

1. **PaymentGateway.tsx** : 
   - Ajouter `private_token` au type `EventData`
   - Stocker le token en sessionStorage
   - Utiliser le token dans le deep link "already_member"

2. **PaymentSuccess.tsx** :
   - Recuperer le token depuis sessionStorage
   - Construire un deep link complet avec token + `payment=success`

3. **PaymentCancelled.tsx** :
   - Recuperer le token depuis sessionStorage
   - Construire un deep link complet avec token

4. **mobileAppUtils.ts** :
   - Ameliorer `getPaymentSuccessDeepLink` pour supporter le token

