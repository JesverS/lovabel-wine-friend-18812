

# Plan : Dashboard "Mon Palais" + Cartes de degustation partageables

---

## Donnees disponibles

La table `user_wine_notice` contient toutes les degustations :
- `rating` (note globale), `liked` (0=dislike, 1=like), `details` (JSON avec slot1-4 ou anciennes cles acidity/tannins/body/sweetness)
- `wine_id` → table `wine` (name, type, domain_id, appellation_id, year, label_url)
- `wine.type` → `wine_type` (1=rouge, 2=blanc, 5=rose, 8=effervescent)
- `wine.domain_id` → `domain` (name, region)
- Relations `user_wine_notice_cellar` et `user_wine_notice_event` pour le contexte

Pas besoin de migration SQL. Toutes les donnees necessaires existent deja.

---

## PARTIE 1 : Dashboard "Mon Palais"

### 1.1 Nouveau composant `src/components/TastingDashboard.tsx`

Page accessible depuis le profil utilisateur (nouvel onglet "Mon Palais" dans `UserProfile.tsx`). Visible uniquement par le proprietaire du profil.

**Requete unique** : fetch toutes les `user_wine_notice` de l'utilisateur avec join sur `wine` et `domain` pour calculer les stats cote client.

### 1.2 Sections du dashboard

**Bloc 1 — Chiffres cles** (4 cards en grille)
- Nombre total de degustations
- Note moyenne globale
- Nombre de vins aimes (liked=1) vs pas aimes (liked=0)
- Nombre de domaines differents explores

**Bloc 2 — Repartition par type de vin** (bar chart horizontal avec Recharts)
- Compteur par type : Rouge, Blanc, Rose, Effervescent, Autre
- Couleurs associees (#6A1B2B rouge, #C9A227 blanc, #F5A3B5 rose, #E5E7EB effervescent)

**Bloc 3 — Profil aromatique moyen** (radar chart Recharts)
- Moyenne des 4 slots pour chaque type de vin degusted (ex: pour les rouges → moyenne Fruite, Epice, Tannique, Boise)
- Affiche le type de vin le plus degusted par defaut, avec selector pour changer

**Bloc 4 — Top regions** (liste ordonnee)
- Top 5 regions les plus degustees, avec nombre de degustations par region

**Bloc 5 — Progression dans le temps** (line chart Recharts)
- Nombre de degustations par mois sur les 12 derniers mois
- Note moyenne par mois en overlay

### 1.3 Integration dans UserProfile.tsx

- Ajouter un onglet "Mon Palais" (icone BarChart3) dans le `TabsList` existant
- Conditionnel : visible uniquement si `isOwnProfile` est true
- Le composant recoit `userId` en prop

---

## PARTIE 2 : Cartes de degustation partageables (Stories)

### 2.1 Etat actuel

`ShareStoryDialog.tsx` existe et fonctionne deja. Il est appele depuis `PostCard.tsx` pour partager un post de type wine_notice en format story Instagram (1080x1920). Il utilise `html2canvas` pour capturer un template HTML inline avec choix de couleur de fond.

### 2.2 Nouveau point d'entree : depuis les degustations

Actuellement, le partage n'est possible que depuis un post dans le feed. Il faut l'ajouter depuis :

**A) `UserTastings.tsx`** — Ajouter un bouton "Partager" (icone Instagram) sur chaque carte de degustation dans la liste. Au clic, ouvrir `ShareStoryDialog` en construisant les props `post` et `wine` depuis les donnees de la tasting note.

**B) `WineDetailsDialog.tsx`** — Ajouter un bouton "Partager en Story" dans le dialog de detail d'un vin, si l'utilisateur a une notice existante pour ce vin.

**C) `CellarWineDetailsDialog.tsx`** — Meme principe que B, dans le contexte cave.

### 2.3 Amelioration du template visuel

Le template actuel est fonctionnel. Ameliorations legeres :

- Ajouter l'annee du vin (`year`) et l'appellation sous le nom du domaine
- Ajouter l'icone Wine SVG dans le footer (deja dans le HTML mais absente du composant React de preview)
- Troncature du contenu texte a 120 caracteres max pour eviter les debordements

### 2.4 Nouvelle carte "Mon Palais" partageable

Creer un second template dans `ShareStoryDialog` (ou un nouveau `SharePalaisDashboardDialog.tsx`) qui genere une story a partir des stats du dashboard :

- Titre "Mon Palais @winenote"
- Nombre de degustations, note moyenne
- Repartition par type (barres colorees)
- Profil aromatique (representation simplifiee en barres, pas de radar en HTML pur)
- Bouton dans le dashboard "Mon Palais" pour declencher ce partage

---

## Resume technique

| Element | Fichiers | Migration SQL |
|---------|----------|---------------|
| Dashboard Mon Palais | Nouveau `TastingDashboard.tsx` | Non |
| Onglet profil | `UserProfile.tsx` | Non |
| Bouton partager sur tastings | `UserTastings.tsx` | Non |
| Bouton partager sur wine details | `WineDetailsDialog.tsx`, `CellarWineDetailsDialog.tsx` | Non |
| Amelioration template story | `ShareStoryDialog.tsx` | Non |
| Story "Mon Palais" | Nouveau `SharePalaisStoryDialog.tsx` | Non |

Aucune migration SQL necessaire. Recharts est deja installe. html2canvas est deja installe.

