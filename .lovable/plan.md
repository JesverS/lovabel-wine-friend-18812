

# Simplification de la Recherche d'Appellations

## Probleme

Le filtre `type_vin_suggere` (lignes 101-104) bloque la recherche. Si tu tapes "Champagne" mais que le type de vin selectionne est "rouge", aucun resultat n'apparait.

## Solution

Supprimer le filtre par type et faire une recherche simple par nom avec `ilike` sur la colonne `normalized_nom` (qui existe deja et est insensible aux accents).

## Modification Unique

**Fichier** : `src/components/wine/AppellationSelect.tsx`

**Changement** (lignes 93-120) :

```typescript
const loadAppellations = async () => {
  setLoading(true);
  try {
    let query = supabase
      .from('appellation')
      .select('*')
      .order('nom');

    // Recherche simple par nom uniquement (insensible aux accents via normalized_nom)
    if (search.trim()) {
      // Utiliser ilike sur normalized_nom pour ignorer accents et majuscules
      query = query.ilike('normalized_nom', `%${search.toLowerCase()}%`);
    }

    // PAS DE FILTRE par type_vin_suggere - on affiche toutes les appellations

    const { data, error } = await query.limit(50);

    if (error) throw error;
    setAppellations(data || []);
  } catch (error: any) {
    toast.error('Erreur lors du chargement des appellations');
  } finally {
    setLoading(false);
  }
};
```

## Comportement Apres Correction

| Recherche | Resultat |
|-----------|----------|
| "Champagne" | Trouve "Champagne" quel que soit le type selectionne |
| "cremant" | Trouve "Cremant d'Alsace", "Cremant de Bourgogne", etc. |
| "cotes" | Trouve "Cotes du Rhone", "Cotes de Provence", etc. |
| "" (vide) | Affiche les 50 premieres appellations par ordre alphabetique |

## Nettoyage Optionnel

Le mapping `WINE_TYPE_ID_TO_TEXT` (lignes 39-46) et la variable `wineTypeText` (ligne 65) ne seront plus utilises pour le filtrage. On peut les conserver pour le `CreateAppellationDialog` qui les utilise encore pour pre-remplir le `type_vin_suggere` lors de la creation.

