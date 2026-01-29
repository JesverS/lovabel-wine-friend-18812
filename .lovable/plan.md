

# Correction du Fond Blanc Grisé

## Problème Identifié

Le fond blanc de la carte affiche une teinte grise au lieu d'un blanc pur. Cela vient de l'utilisation de la classe Tailwind `bg-white` qui peut hériter des variables CSS du thème ou être mal interprétée par `html2canvas`.

```text
Actuel:                          Attendu:
┌─────────────────┐              ┌─────────────────┐
│   ░░░░░░░░░░    │              │   ▒▒▒▒▒▒▒▒▒▒    │
│   ░░ GRIS ░░    │      →       │   ▓▓ BLANC ▓▓   │
│   ░░░░░░░░░░    │              │   ▒▒▒▒▒▒▒▒▒▒    │
└─────────────────┘              └─────────────────┘
```

## Cause

La classe `bg-white` et les classes `bg-gray-*` de Tailwind héritent des variables CSS du design system du projet. Lors du rendu en canvas, ces couleurs peuvent ne pas être correctement résolues.

## Solution

Remplacer toutes les classes Tailwind de couleur par des styles inline avec des valeurs hexadécimales fixes dans le composant `StoryTemplateCard` :

| Élément | Avant (Tailwind) | Après (inline) |
|---------|------------------|----------------|
| Carte blanche | `bg-white` | `backgroundColor: '#FFFFFF'` |
| Titre | `text-gray-900` | `color: '#111827'` |
| Domaine | `text-gray-500` | `color: '#6B7280'` |
| Séparateur | `bg-gray-200` | `backgroundColor: '#E5E7EB'` |
| Placeholder | `bg-gray-100` | `backgroundColor: '#F3F4F6'` |
| Icône placeholder | `text-gray-300` | `color: '#D1D5DB'` |
| Citation | `text-gray-600` | `color: '#4B5563'` |
| Note | `text-gray-400` | `color: '#9CA3AF'` |
| Barre fond | `bg-gray-200` | `backgroundColor: '#E5E7EB'` |
| Barre remplie | `bg-gray-800` | `backgroundColor: '#1F2937'` |
| Label | `text-gray-500` | `color: '#6B7280'` |

---

## Fichier à Modifier

`src/components/ShareStoryDialog.tsx`

