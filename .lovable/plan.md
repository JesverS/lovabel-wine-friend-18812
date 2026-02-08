

# Plan : Ajout d'une option de refus du matching de vin (faux positif)

## Probleme

Quand le scanner detecte un vin existant en base (badge "deja en base"), l'utilisateur n'a aucun moyen de refuser ce matching. Or, un domaine peut avoir deux vins au nom tres similaire (ex: "Cuvee Prestige" et "Cuvee Prestige Reserve", ou "Les Terrasses" et "Les Terrasses du Diable"), et le seuil de 88% peut les confondre.

Actuellement, si le matching est incorrect :
- Le bouton dit "Utiliser ce vin" sans alternative
- L'utilisateur ne peut pas forcer la creation d'un nouveau vin
- Il n'y a aucune information sur QUEL vin existant a ete matche (juste un badge)

## Solution

Ajouter un mecanisme simple pour que l'utilisateur puisse refuser le matching et basculer en mode creation classique. L'approche : afficher le nom du vin matche dans le scanner et proposer un bouton "Ce n'est pas ce vin" qui remet `matchedWineId` a `null` et restaure le comportement de creation normal.

## Comportement detaille

Quand un vin est matche apres le scan :

1. Le badge "(deja en base)" s'affiche comme aujourd'hui dans le `WineLabelScanner`
2. En dessous du badge, un lien/bouton discret "Ce n'est pas ce vin" est visible
3. En cliquant dessus :
   - Le `WineLabelScanner` appelle un callback `onDismissMatch`
   - Le dialogue parent remet `matchedWineId` a `null`
   - L'image scannee est restauree comme label (conversion base64 vers File)
   - Le bouton principal repasse a "Creer la bouteille" / "Creer le vin"
   - Les champs restent pre-remplis, l'utilisateur peut ajuster si besoin
4. L'utilisateur peut alors creer normalement son nouveau vin

## Fichiers a modifier

| Fichier | Description |
|---------|-------------|
| `src/components/WineLabelScanner.tsx` | Ajouter un callback `onDismissMatch` et un bouton "Ce n'est pas ce vin" |
| `src/components/CreateWineForPostDialog.tsx` | Gerer le callback et restaurer le mode creation |
| `src/components/AddWineToDomainDialog.tsx` | Idem |
| `src/components/CreateWineInDomainDialog.tsx` | Idem |

## Section technique

### 1. WineLabelScanner

Ajouter une nouvelle prop optionnelle a l'interface :

```
onDismissMatch?: () => void
```

Dans la section des resultats du scan, modifier l'affichage quand `scanResult.wine_matched` est `true` :
- Apres le badge "deja en base", ajouter un bouton de type `button` avec le texte "Ce n'est pas ce vin"
- Style : `variant="link"` ou `variant="ghost"`, petite taille, couleur `text-muted-foreground`
- Au clic : appeler `onDismissMatch()` si fourni

### 2. CreateWineForPostDialog

Ajouter une fonction `handleDismissMatch` :
- Remet `matchedWineId` a `null`
- Restaure l'image scannee comme `labelFile` : recupere `imagePreview` (qui contient le base64 original stocke dans le `WineLabelScanner`) depuis le callback
- Le scanner transmet le base64 de l'image dans le callback `onDismissMatch` afin que le parent puisse le reutiliser

Modification alternative plus simple : plutot que de transmettre l'image, stocker le `imageBase64` du scan dans un etat `scannedImageBase64` au moment du `handleScanComplete`, puis le reutiliser dans `handleDismissMatch` pour recreer le `labelFile`.

Concretement :
- Nouvel etat : `scannedImageBase64` (string | null)
- Dans `handleScanComplete` : `setScannedImageBase64(imageBase64)`
- Dans `handleDismissMatch` :
  - `setMatchedWineId(null)`
  - Si `scannedImageBase64` : convertir en File et affecter a `labelFile` + `labelPreview`

Passer `handleDismissMatch` au `WineLabelScanner` via la prop `onDismissMatch`.

### 3. AddWineToDomainDialog

Meme logique : stocker le base64 au moment du `onScanComplete`, ajouter `handleDismissMatch` qui remet `matchedWineId` a null et restaure l'image, passer la prop `onDismissMatch` au scanner.

### 4. CreateWineInDomainDialog

Idem.

### 5. Reset

Dans chaque `resetForm()`, ajouter `setScannedImageBase64(null)`.
Verifier bien que l'utilisatuer pourras bien tout changer meme cree un domain en cas de grosse erreur...
