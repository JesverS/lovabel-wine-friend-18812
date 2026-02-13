

# Plan d'amelioration UX - 5 corrections

> Note : Mon audit precedent comportait 8 points. Le "probleme 9" n'existe pas dans la liste. Ce plan couvre donc les points **1, 6, 7 et 8**. Si vous pensiez a un autre point, n'hesitez pas a preciser.

---

## 1. Bouton CTA dans le Hero (probleme 1)

Ajouter deux boutons d'action dans le Hero de la page d'accueil, sous le sous-titre actuel :

- **"Decouvrir" / "Explorer"** : redirige vers `/learning` (ou `/events`)
- **"Se connecter"** : visible uniquement pour les utilisateurs non connectes, redirige vers `/auth`

Les boutons seront stylises avec les variantes existantes (`default` pour le CTA principal, `outline` avec fond semi-transparent pour le secondaire).

**Fichier concerne** : `src/components/Hero.tsx`

---

## 2. Mise a jour du copyright (probleme 6)

Remplacer "2025" par "2026" dans le footer.

**Fichier concerne** : `src/components/Footer.tsx`

---

## 3. Squelettes de chargement pour Cellars et Events (probleme 7)

Actuellement, les pages Cellars et Events affichent un simple texte "Chargement..." pendant le fetch. Remplacer par des squelettes (skeleton loaders) reprenant la forme des cartes affichees.

- **Cellars** : grille de 4-6 cartes squelettes avec avatar rond, ligne de titre et ligne de localisation
- **Events** : grille de 3-4 cartes squelettes avec rectangle pour la banniere, lignes de titre, date et lieu

On reutilisera le composant `Skeleton` deja present dans `src/components/ui/skeleton.tsx`.

**Fichiers concernes** : `src/pages/Cellars.tsx`, `src/pages/Events.tsx`

---

## 4. Barre de navigation fixe mobile (probleme 8)

Ajouter un composant `MobileBottomNav` affiche uniquement sur mobile (< 768px) avec 5 icones :

| Icone | Label | Route |
|-------|-------|-------|
| Home | Accueil | `/` |
| Search | Recherche | `/search` |
| MessageSquare | Feed | `/feed` |
| Heart | Favoris | `/favorites` |
| User | Profil | `/user/:slug` ou `/auth` |

Comportement :
- Fixe en bas de l'ecran, z-index eleve, fond avec glassmorphism
- Icone active mise en surbrillance selon la route courante
- Masque sur desktop (via `md:hidden`)
- Un `padding-bottom` sera ajoute au body/layout pour eviter que le contenu soit cache derriere la barre

**Fichiers concernes** :
- Nouveau fichier : `src/components/MobileBottomNav.tsx`
- `src/App.tsx` : integration du composant dans le layout global (a l'interieur du BrowserRouter)

---

## Resume technique

| Fichier | Action |
|---------|--------|
| `src/components/Hero.tsx` | Ajouter 2 boutons CTA (Decouvrir + Connexion conditionnel) |
| `src/components/Footer.tsx` | Copyright 2025 vers 2026 |
| `src/pages/Cellars.tsx` | Remplacer texte de chargement par grille de Skeleton |
| `src/pages/Events.tsx` | Remplacer texte de chargement par grille de Skeleton |
| `src/components/MobileBottomNav.tsx` | Nouveau composant barre de nav mobile |
| `src/App.tsx` | Integrer MobileBottomNav |

