

# Plan de Modification - Formule XP par Niveau

## Contexte

La Edge Function `submit-lesson-quiz` calcule l'XP requis pour passer au niveau suivant avec cette formule (ligne 132) :

```typescript
let xpNeeded = Math.round(300 * Math.pow(newLevel, 1.4));
```

**Exemple actuel :**
| Niveau | XP requis pour passer |
|--------|----------------------|
| 1 → 2  | 300 XP               |
| 2 → 3  | 792 XP               |
| 5 → 6  | 2081 XP              |
| 10 → 11| 7524 XP              |

---

## Question de Configuration

Avant d'appliquer la modification, veuillez indiquer les nouvelles valeurs souhaitées :

| Paramètre | Actuel | Nouvelle valeur ? |
|-----------|--------|-------------------|
| **XP de base** | 300 | (ex: 200, 500...) |
| **Exposant** | 1.4 | (ex: 1.2 pour progression plus lente, 1.6 pour plus rapide) |

**Exemples de progression :**

| Formule | Niveau 5 → 6 | Niveau 10 → 11 |
|---------|--------------|----------------|
| 300 × n^1.4 (actuel) | 2081 XP | 7524 XP |
| 200 × n^1.2 | 1149 XP | 3170 XP |
| 500 × n^1.0 (linéaire) | 2500 XP | 5000 XP |
| 300 × n^1.6 | 3047 XP | 15849 XP |

---

## Modifications Prévues

### Fichier : `supabase/functions/submit-lesson-quiz/index.ts`

**Ligne 132** - Modifier la formule :

```typescript
// AVANT
let xpNeeded = Math.round(300 * Math.pow(newLevel, 1.4));

// APRÈS (exemple avec nouvelles valeurs)
const XP_BASE_LEVEL = 60;    // Configurable
const XP_EXPONENT = 1.4;      // Configurable
let xpNeeded = Math.round(XP_BASE_LEVEL * Math.pow(newLevel, XP_EXPONENT));
```

**Lignes 137** - Même formule dans la boucle while :

```typescript
// AVANT
xpNeeded = Math.round(300 * Math.pow(newLevel, 1.4));

// APRÈS
xpNeeded = Math.round(XP_BASE_LEVEL * Math.pow(newLevel, XP_EXPONENT));
```

---

## Section Technique

### Paramètres à Définir

La fonction sera modifiée pour utiliser des constantes nommées en haut de la logique de calcul :

```typescript
// ⚙️ Configuration du système de niveau
const XP_BASE = 100;           // XP gagné par quiz (existant)
const MIN_FACTOR = 0.2;        // 20% XP minimum (existant)
const XP_BASE_LEVEL = ???;     // XP de base par niveau (à définir)
const XP_EXPONENT = ???;       // Exposant de progression (à définir)
```

---

## Confirmation Requise

**Dites-moi quelles valeurs vous souhaitez pour :**

1. `XP_BASE_LEVEL` : XP de base pour le calcul de niveau (actuellement 300)
2. `XP_EXPONENT` : Exposant de progression (actuellement 1.4)

Une fois les valeurs confirmées, j'appliquerai la modification à la Edge Function.

