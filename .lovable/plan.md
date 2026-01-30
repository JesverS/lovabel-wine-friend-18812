

# Plan : Creation de upload-lesson-quiz et Correction Niveau 0

## Resume des modifications

| Fichier | Action |
|---------|--------|
| `supabase/functions/upload-lesson-quiz/index.ts` | CREER avec le code fourni (logs renommes) |
| `supabase/config.toml` | AJOUTER `upload-lesson-quiz`, RETIRER `submit-lesson-quiz` |
| `src/pages/Learning.tsx` | CORRIGER niveau 0 → 1 + formule XP (base 60) |

---

## Phase 1 : Creer la Edge Function

### Fichier : `supabase/functions/upload-lesson-quiz/index.ts`

Le code fourni par l'utilisateur sera utilise avec les modifications suivantes :
- Renommer tous les logs `[submit-lesson-quiz]` → `[upload-lesson-quiz]`
- Le reste du code reste identique (formule base 60)

---

## Phase 2 : Mettre a jour config.toml

### Ajouter :
```toml
[functions.upload-lesson-quiz]
verify_jwt = true
```

### Supprimer :
```toml
[functions.submit-lesson-quiz]
verify_jwt = true
```

---

## Phase 3 : Corriger Learning.tsx

### Ligne 97 - Fallback niveau 1
```tsx
// AVANT
const userLevel = userProfile?.level ?? 0;

// APRES
const userLevel = userProfile?.level ?? 1;
```

### Ligne 99 - Protection division par zero
```tsx
// AVANT
const xpNeeded = Math.round(60 * Math.pow(userLevel, 1.4));

// APRES (protection si niveau 0 persiste en DB)
const xpNeeded = Math.round(60 * Math.pow(Math.max(userLevel, 1), 1.4));
```

### Ligne 100 - Supprimer condition niveau 0
```tsx
// AVANT
const progressToNextLevel = userLevel === 0 ? 0 : (userXp / xpNeeded) * 100;

// APRES
const progressToNextLevel = (userXp / xpNeeded) * 100;
```

### Lignes 175-179 - Supprimer texte niveau 0
```tsx
// AVANT
{userLevel === 0 ? "Debloquez votre premier niveau" : `Progression vers le niveau ${userLevel + 1}`}
...
{userLevel === 0 ? "0 XP" : `${userXp} / ${xpNeeded} XP`}

// APRES
`Progression vers le niveau ${userLevel + 1}`
...
`${userXp} / ${xpNeeded} XP`
```

### Lignes 184-188 - Supprimer bloc conditionnel niveau 0
```tsx
// SUPPRIMER COMPLETEMENT
{userLevel === 0 && (
  <p className="text-xs text-muted-foreground mt-2 text-center">
    🎯 Reponds a ton premier quiz pour passer niveau 1 !
  </p>
)}
```

---

## Phase 4 : Supprimer l'ancienne fonction

Supprimer le dossier `supabase/functions/submit-lesson-quiz/`

---

## Section technique

### Formule XP (base 60 - conservee)

| Niveau | XP requis pour passer au suivant |
|--------|----------------------------------|
| 1 → 2 | 60 XP |
| 2 → 3 | 159 XP |
| 3 → 4 | 295 XP |
| 4 → 5 | 464 XP |
| 5 → 6 | 662 XP |

### XP gagne par quiz
- Base : 100 XP
- Minimum : 20% (echec total = 20 XP)
- Maximum : 100 + (100 * difficulte_multiplier)
- Exemple difficulte 3 : 100 * (0.2 + 1.0 * 1.2) = 140 XP

