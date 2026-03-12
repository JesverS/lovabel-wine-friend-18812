

# Plan — Bouton déconnexion dans les paramètres + Breadcrumbs manquants

## 1. Déplacer la déconnexion dans les paramètres (Header.tsx + UserProfile.tsx)

### Header.tsx
- Supprimer le bouton LogOut desktop (lignes 165-173) et son AlertDialog associe
- Garder le bouton LogOut dans le menu hamburger mobile (deja present)
- Supprimer aussi le bouton mobile de deconnexion dans le hamburger — la deconnexion sera uniquement dans les parametres du profil

### UserProfile.tsx
- Dans le DialogContent des parametres (apres les InnerTabs, ligne ~391), ajouter un separateur + section "Se deconnecter" :
  - Un `Separator`
  - Un bouton "Se deconnecter" destructif avec icone LogOut
  - Au clic, ouvrir un AlertDialog de confirmation puis `supabase.auth.signOut()` + redirect vers `/`
- Importer `LogOut` de lucide-react, `Separator`, `AlertDialog` components, et `supabase`

## 2. Breadcrumbs manquants

Ajouter un breadcrumb `Accueil > {Page}` dans les pages suivantes, en suivant le pattern existant (import Breadcrumb components + placement en haut du main) :

| Page | Fil d'Ariane |
|------|-------------|
| `Cellars.tsx` | Accueil > Cavistes |
| `Feed.tsx` | Accueil > Feed |
| `Favorites.tsx` | Accueil > Favoris |
| `Badges.tsx` | Accueil > Badges |
| `Notifications.tsx` | Accueil > Notifications |
| `GameMultiplayer.tsx` | Accueil > Jeu |

Chaque page recevra le meme bloc standard :
```tsx
<Breadcrumb className="mb-6">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink asChild><Link to="/">Accueil</Link></BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>{nomPage}</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/Header.tsx` | Supprimer bouton LogOut desktop + hamburger mobile + AlertDialog |
| `src/pages/UserProfile.tsx` | Ajouter bouton deconnexion avec confirmation dans les parametres |
| `src/pages/Cellars.tsx` | Breadcrumb |
| `src/pages/Feed.tsx` | Breadcrumb |
| `src/pages/Favorites.tsx` | Breadcrumb |
| `src/pages/Badges.tsx` | Breadcrumb |
| `src/pages/Notifications.tsx` | Breadcrumb |
| `src/pages/GameMultiplayer.tsx` | Breadcrumb |

