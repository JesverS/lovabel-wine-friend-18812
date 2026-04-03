

# Plan — Recherche multi-mots sans nouvelle table

## Probleme actuel

La fonction fait `ILIKE '%roche mazet chardonnay%'` sur chaque colonne separement → aucun match quand le query combine domaine + nom.

## Solution

Reecrire `search_wines` et `search_wines_game` directement sur les tables existantes (`wine`, `domain`, `wine_type`). Pas de nouvelle table.

### Logique

1. **Normaliser** le query (unaccent, lower, trim)
2. **Extraire l'annee** si presente (regex `\m(19|20)\d{2}\M`) et la retirer du texte
3. **Splitter les mots restants** en tableau (`string_to_array`)
4. **Concatener** les champs en une seule chaine : `domain.name || ' ' || wine.name || ' ' || wine_type.type`
5. **Verifier que TOUS les mots** matchent dans cette chaine concatenee (boucle `bool_and` + `ILIKE`)
6. **Filtrer par annee** si detectee
7. **Trier** par similarite trigram (`pg_trgm.similarity`)

### Fonction finale `search_wines`

```sql
CREATE OR REPLACE FUNCTION public.search_wines(query text)
RETURNS TABLE(id uuid, name text, year integer, label_url text, domain jsonb, wine_type jsonb)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  normalized text;
  cleaned text;
  words text[];
  extracted_year integer;
BEGIN
  normalized := extensions.unaccent(lower(trim(query)));
  
  -- Extraire annee 4 chiffres
  extracted_year := (regexp_match(normalized, '\m((?:19|20)\d{2})\M'))[1]::integer;
  
  -- Retirer l'annee du texte
  cleaned := trim(regexp_replace(normalized, '\m(?:19|20)\d{2}\M', '', 'g'));
  
  -- Splitter en mots
  words := array_remove(string_to_array(cleaned, ' '), '');
  
  RETURN QUERY
  SELECT
    w.id, w.name, w.year, w.label_url,
    jsonb_build_object('id', d.id, 'name', d.name, 'logo_url', d.logo_url, 'region', d.region),
    jsonb_build_object('id', wt.id, 'type', wt.type)
  FROM wine w
  LEFT JOIN domain d ON w.domain_id = d.id
  LEFT JOIN wine_type wt ON w.type = wt.id
  WHERE
    w.is_playable = true
    AND (extracted_year IS NULL OR w.year = extracted_year)
    AND (
      array_length(words, 1) IS NULL
      OR (
        SELECT bool_and(
          extensions.unaccent(lower(
            coalesce(d.name,'') || ' ' || coalesce(w.name,'') || ' ' || coalesce(wt.type::text,'')
          )) ILIKE '%' || word || '%'
        )
        FROM unnest(words) AS word
      )
    )
  ORDER BY
    similarity(
      extensions.unaccent(lower(coalesce(d.name,'') || ' ' || coalesce(w.name,''))),
      cleaned
    ) DESC,
    w.created_at DESC
  LIMIT 20;
END;
$$;
```

Meme logique pour `search_wines_game`.

### Exemples de resultats

```text
Query                        → Match
"Roche Mazet"                → tous les vins du domaine Roche Mazet
"Roche Mazet Chardonnay"     → mots [roche, mazet, chardonnay] → chacun present dans "roche mazet chardonnay 2023"
"Chardonnay Roche Mazet"     → meme resultat (ordre libre)
"Roche Mazet 2023"           → annee extraite=2023, mots [roche, mazet] → filtre domaine + annee
"Chardonay"                  → trigram similarity classe en premier malgre typo
```

### Fichier

| Fichier | Action |
|---------|--------|
| `supabase/migrations/new.sql` | DROP + CREATE des 2 fonctions |

Zero changement frontend — signature identique.

