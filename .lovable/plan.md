

# Plan : Promotion de l'App Mobile sur la Page About

## Resume

Ajouter une section de promotion de l'application mobile sur la page About, avec un comportement adapte selon la plateforme :
- **iOS** : Banniere visible + bouton "Telecharger sur l'App Store" qui redirige directement vers l'App Store
- **Android** : Banniere visible + bouton "Rejoindre la beta test" qui redirige vers le lien de beta test Google Play
- **Desktop** : Section statique avec les deux liens (App Store + Beta Android) affiches cote a cote

L'URL du Play Store dans `mobileAppUtils.ts` sera mise a jour avec le lien de beta test fourni.

---

## Comportement Detaille

### Sur iPhone (iOS detecte)
1. **Redirection automatique** : A l'ouverture de la page About, l'utilisateur est redirige automatiquement vers la fiche App Store apres un court delai (~1 seconde), pour lui laisser le temps de voir la page
2. **Banniere dans le hero** : Une banniere apparait en haut du hero avec le message "Disponible sur iPhone" et un bouton "Telecharger l'app" au cas ou la redirection automatique ne se declencherait pas

### Sur Android
1. **Pas de redirection automatique** (la beta n'est pas une app stable, on ne force pas)
2. **Banniere dans le hero** : Un message "Bientot disponible sur Android" avec un bouton "Rejoindre la beta test" qui ouvre le lien Google Play Testing

### Sur Desktop
1. **Section "Disponible sur mobile"** : Affichee apres le hero ou dans la section CTA, avec deux boutons/badges :
   - Bouton App Store (lien iOS)
   - Bouton "Beta Android" (lien beta test)

---

## Fichiers a Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/lib/mobileAppUtils.ts` | MODIFIER | Ajouter la constante `ANDROID_BETA_URL` avec le lien de beta test |
| `src/pages/About.tsx` | MODIFIER | Ajouter la banniere mobile dans le hero + section "Disponible sur mobile" + logique de redirection auto iOS |

---

## Section Technique

### Modification de `mobileAppUtils.ts`

Ajout d'une nouvelle constante pour le lien de beta test Android :

```text
APP_STORE_URL    = https://apps.apple.com/fr/app/wine-note-meet-share-learn/id6757152544
ANDROID_BETA_URL = https://play.google.com/apps/testing/com.jeangaspard.winenote
```

Le `PLAY_STORE_URL` existant reste inchange (il pourra servir quand l'app Android sera en production).

### Modification de `About.tsx`

**1. Redirection automatique iOS :**
- Un `useEffect` detecte la plateforme via `getMobilePlatform()`
- Si `ios` : redirection vers `APP_STORE_URL` apres 1 seconde de delai (pour que la page ait le temps de s'afficher)
- Si `android` : pas de redirection automatique

**2. Banniere mobile dans le hero (visible uniquement sur mobile) :**

```text
Sur iOS :
+--------------------------------------------------+
|  Disponible sur iPhone                            |
|  Telechargez WineNote pour une meilleure          |
|  experience                                       |
|  [Telecharger sur l'App Store]                    |
+--------------------------------------------------+

Sur Android :
+--------------------------------------------------+
|  Bientot disponible sur Android                   |
|  Rejoignez notre programme de beta test           |
|  et soyez parmi les premiers !                    |
|  [Rejoindre la beta test]                         |
+--------------------------------------------------+
```

Cette banniere sera placee juste en dessous du badge "Bienvenue sur WineNote" dans le hero, avant le titre H1. Elle n'apparait que sur mobile (detection via `getMobilePlatform()`).

**3. Section desktop "Disponible sur mobile" :**

Ajoutee dans la section CTA existante (en bas de page), visible sur toutes les tailles d'ecran, avec deux boutons :
- Icone Apple + "App Store"
- Icone Android + "Beta Test Android"

Les deux sont des liens externes (`<a href="..." target="_blank">`).

### Points techniques complementaires

- La detection de plateforme utilise `getMobilePlatform()` deja existant dans `mobileAppUtils.ts` (basee sur le `userAgent`)
- La redirection iOS utilise `window.location.href` pour ouvrir la page App Store directement (pas un deep link, donc pas de fallback necessaire)
- Le delai de 1 seconde avant redirection iOS permet a l'utilisateur de voir brievement la page et de comprendre ce qui se passe
- Sur desktop, les deux liens sont toujours visibles pour permettre aux utilisateurs de decouvrir l'app depuis leur ordinateur

