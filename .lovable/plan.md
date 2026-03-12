

# Plan — Rafraichir la section "Apprenez et Jouez"

## Probleme actuel

Les badges utilisent des emojis (📚, 🎯, 🏆, 👥, 🍷, 🎉) qui font cheap. Les couleurs des deux cards sont tres differentes (wine vs gold) ce qui cree un desequilibre visuel.

## Changements prevus (WineExperiences.tsx uniquement)

### 1. Remplacer les emojis par des icones Lucide

| Emoji actuel | Remplacement Lucide |
|---|---|
| 📚 Cours interactifs | `BookOpen` |
| 🎯 Quiz | `Target` |
| 🏆 Badges | `Award` |
| 👥 1-8 joueurs | `Users` |
| 🍷 Degustation | `Wine` |
| 🎉 Convivial | `PartyPopper` |

Chaque badge aura une icone Lucide de 14px inline avant le texte au lieu de l'emoji.

### 2. Harmoniser les couleurs

- Unifier le fond des deux icones principales avec `bg-gradient-wine` (supprimer `bg-gradient-gold` sur la card Jeu)
- La card Jeu utilisera une variante plus subtile : meme gradient wine mais avec une opacite differente sur le glow, et `hover:border-primary` au lieu de `hover:border-secondary`
- Les badges "gold" deviennent aussi `badge-wine` pour la coherence visuelle
- Le bouton "Lancer une partie" passe de `bg-gradient-gold text-slate` a un style `variant="outline"` avec bordure primary pour differencier sans casser l'harmonie

### 3. Resultat

Deux cards visuellement coherentes, avec des icones SVG propres au lieu d'emojis, et une palette unifiee autour du theme wine. La differenciation se fait par le contenu et le style du bouton (plein vs outline).

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/WineExperiences.tsx` | Emojis → icones Lucide, couleurs harmonisees |

