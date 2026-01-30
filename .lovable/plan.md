

# Plan : Corriger le Calcul de Niveau dans check_and_award_badges

## Problème Identifié

La fonction SQL `check_and_award_badges` ajoute de l'XP lors de l'attribution d'un badge, mais **ne recalcule pas le niveau**.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ SITUATION ACTUELLE                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ Utilisateur: XP = 55, Level = 1                                      │
│ Badge obtenu: +10 XP                                                 │
│                                                                      │
│ Après badge:  XP = 65, Level = 1  ❌ (devrait être Level 2)         │
│               Car 65 >= 60 (seuil niveau 1 → 2)                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Comparaison des deux systèmes

| Source XP | Ajoute XP | Recalcule Niveau | Résultat |
|-----------|-----------|------------------|----------|
| Quiz (Edge Function) | ✅ | ✅ | ✅ Fonctionne |
| Badge (SQL Function) | ✅ | ❌ | ❌ Bug |

---

## Solution : Créer une fonction de recalcul de niveau

### Nouvelle fonction SQL : `recalculate_user_level`

Cette fonction appliquera la même logique que la Edge Function :
- Formule : `60 * level^1.4`
- Boucle while pour gérer les passages de plusieurs niveaux

```sql
CREATE OR REPLACE FUNCTION public.recalculate_user_level(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer;
  v_level integer;
  v_xp_needed integer;
  v_new_level integer;
  v_remaining_xp integer;
BEGIN
  -- Récupérer XP et niveau actuels
  SELECT COALESCE(xp, 0), COALESCE(level, 1) 
  INTO v_xp, v_level 
  FROM user_profiles 
  WHERE id = p_user_id;

  v_new_level := v_level;
  v_remaining_xp := v_xp;
  v_xp_needed := ROUND(60 * POWER(v_new_level, 1.4));

  -- Boucle de passage de niveau
  WHILE v_remaining_xp >= v_xp_needed LOOP
    v_remaining_xp := v_remaining_xp - v_xp_needed;
    v_new_level := v_new_level + 1;
    v_xp_needed := ROUND(60 * POWER(v_new_level, 1.4));
  END LOOP;

  -- Mettre à jour si le niveau a changé
  IF v_new_level > v_level THEN
    UPDATE user_profiles 
    SET xp = v_remaining_xp, 
        level = v_new_level,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Notification de passage de niveau
    PERFORM create_notification(
      p_user_id,
      'level_up',
      'Niveau supérieur !',
      'Félicitations ! Vous êtes passé au niveau ' || v_new_level,
      jsonb_build_object('old_level', v_level, 'new_level', v_new_level)
    );
  END IF;

  RETURN v_new_level;
END;
$$;
```

---

## Modification de check_and_award_badges

Après l'ajout d'XP, appeler la fonction de recalcul :

```sql
-- AVANT (lignes 79-82)
IF FOUND AND v_badge.xp_reward > 0 THEN
  UPDATE user_profiles SET xp = xp + v_badge.xp_reward WHERE id = p_user_id;
END IF;

-- APRÈS
IF FOUND AND v_badge.xp_reward > 0 THEN
  UPDATE user_profiles SET xp = xp + v_badge.xp_reward WHERE id = p_user_id;
  -- Recalculer le niveau après ajout d'XP
  PERFORM recalculate_user_level(p_user_id);
END IF;
```

---

## Résumé des fichiers à créer

| Fichier | Action |
|---------|--------|
| Migration SQL | CRÉER avec `recalculate_user_level` + mise à jour de `check_and_award_badges` |

---

## Section Technique

### Formule XP (base 60)

| Niveau | XP requis | XP cumulé total |
|--------|-----------|-----------------|
| 1 → 2 | 60 | 60 |
| 2 → 3 | 159 | 219 |
| 3 → 4 | 295 | 514 |
| 4 → 5 | 464 | 978 |

### XP des badges (exemples)

| Badge | XP Reward |
|-------|-----------|
| Première leçon | 10 |
| 10 leçons | 50 |
| Premier post | 10 |
| Premier événement | 15 |

### Test après implémentation

1. Créer un utilisateur avec XP = 55, Level = 1
2. Créer un post (badge "first_post" = +10 XP)
3. Vérifier : XP devrait être 5, Level devrait être 2

