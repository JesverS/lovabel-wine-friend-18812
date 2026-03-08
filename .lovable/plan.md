
Objectif: faire une analyse globale (pas seulement Mapbox) et corriger définitivement la carte.

Constat actuel (preuves runtime):
- L’erreur vient du RPC Supabase, pas de Mapbox.
- Console + réseau montrent: `42804 structure of query does not match function result type`, détail: `column 4`.
- Dans la fonction `get_user_tastings_with_location`, la colonne 4 `wine_year` est déclarée en `smallint`, mais `wine.year` est de type `integer`.
- Aucune requête Mapbox n’est lancée tant que le RPC échoue (donc la carte ne peut même pas s’initialiser).

Plan d’action global
1) Corriger la fonction SQL (cause racine)
- Créer une migration qui remplace la fonction `get_user_tastings_with_location`.
- Harmoniser les types de sortie:
  - soit `wine_year integer` (recommandé, aligné sur `wine.year`),
  - soit caster explicitement `w.year::smallint` dans les 3 SELECT.
- Garder les bons JOIN déjà introduits (`user_wine_notice_event`, `user_wine_notice_cellar`) et la branche spontanée sur `uwn.latitude/longitude`.

2) Vérifier qu’il n’existe qu’une seule signature active
- Contrôler qu’il n’y a pas d’overload résiduel de la fonction qui pourrait être résolu par erreur.
- Conserver la signature attendue par le front: `(uuid, text)`.

3) Ajouter un diagnostic front plus explicite (anti-boucle “erreur générique”)
- Dans `TastingsMap.tsx`, différencier les erreurs:
  - erreur RPC (Supabase),
  - token Mapbox manquant,
  - erreur Mapbox runtime (`map.on('error', ...)`).
- Afficher un message utilisateur plus précis (ex: “Erreur SQL de la fonction de dégustations”) et log structuré.

4) Validation bout-en-bout
- Rejouer l’appel RPC avec `p_user_id` réel.
- Vérifier que la réponse renvoie au moins la dégustation spontanée existante.
- Recharger la page profil et confirmer:
  - plus de 400 sur `/rpc/get_user_tastings_with_location`,
  - apparition des requêtes Mapbox,
  - affichage des points et popup.

5) Filet de sécurité
- Ajouter une note de migration claire: la colonne `wine_year` doit rester cohérente avec `wine.year`.
- (Optionnel) simplifier la fonction en `LANGUAGE sql` pour réduire les risques de mismatch de type.

Section technique (résumé précis)
- Source du bug: incohérence de type SQL dans la fonction, colonne 4 (`wine_year`).
- Ce n’est pas un souci fournisseur carte: Mapbox n’est pas atteint tant que le RPC retourne 400.
- Correctif minimal fiable:
  - `RETURNS TABLE (... wine_year integer ...)`
  - ou `SELECT w.year::smallint AS wine_year` dans chaque branche `UNION ALL`.
- Impact: la carte refonctionne sans modifier l’UI Mapbox, car le blocage est en amont (data fetch).
