

# Audit Complet : Solutions de Scan de Bouteilles de Vin

## Contexte et Objectif

**Probleme actuel :** L'utilisateur doit saisir manuellement 8+ champs pour ajouter un vin :
- Nom du vin (obligatoire)
- Domaine (obligatoire avec recherche)
- Annee
- Volume
- Type (rouge/blanc/rose/effervescent)
- Appellation
- Description
- Photo etiquette

**Objectif :** Scanner une etiquette de bouteille et pre-remplir automatiquement ces champs.

**Contrainte budgetaire :** Solution gratuite ou avec free tier genereux (moins de 5000 photos/mois minimum).

---

## Donnees a Extraire d'une Etiquette de Vin

| Donnee | Difficulte | Exemple |
|--------|------------|---------|
| Nom du vin | Moyenne | "Chateau Margaux", "Cuvee Prestige" |
| Domaine/Producteur | Moyenne | "Domaine de la Romanee-Conti" |
| Millesime (annee) | Facile | "2018", "2020" |
| Appellation | Difficile | "Pauillac AOC", "Saint-Emilion Grand Cru" |
| Type de vin | Moyenne | Souvent deduit de l'appellation ou couleur etiquette |
| Degre d'alcool | Facile | "13.5% vol" |
| Volume | Facile | "75cl", "750ml" |
| Region | Moyenne | "Bordeaux", "Bourgogne" |

---

## Comparaison des Solutions

### Tableau Recapitulatif

| Solution | Free Tier | Precision Vin | Implementation | Score |
|----------|-----------|---------------|----------------|-------|
| **Lovable AI (Gemini)** | Inclus avec Lovable | Excellente | Simple (deja disponible) | **★★★★★** |
| OCR.space | 25K/mois | OCR brut uniquement | Moyenne | ★★★☆☆ |
| Google Cloud Vision | 1K/mois | OCR brut uniquement | Complexe | ★★☆☆☆ |
| Tesseract.js (local) | Illimite | Faible sur photos | Complexe | ★★☆☆☆ |
| API4AI Wine Recognition | Demo only | Excellente (labels) | Simple | ★★★☆☆ |
| Zyla Wine Label API | Freemium limite | Bonne | Simple | ★★★☆☆ |

---

## Analyse Detaillee des Solutions

### 1. Lovable AI avec Gemini Vision (RECOMMANDEE)

**Disponibilite :** Deja integre a votre projet via LOVABLE_API_KEY

**Modele suggere :** `google/gemini-2.5-flash` ou `google/gemini-3-flash-preview`

**Free Tier :** Inclus avec votre abonnement Lovable (credits mensuels)

**Fonctionnement :**
```text
Photo etiquette --> Edge Function --> Lovable AI (Gemini Vision)
                                           |
                                           v
                                    Extraction structuree JSON
                                           |
                                           v
                                    Pre-remplissage formulaire
```

**Avantages :**
- Deja configure dans votre projet (pas de nouvelle API a integrer)
- Comprehension semantique de l'image (pas juste OCR)
- Peut identifier le type de vin par la couleur de l'etiquette
- Peut deduire l'appellation meme si partiellement visible
- Peut faire du matching avec votre base de domaines existante
- Supporte le francais nativement

**Inconvenients :**
- Consomme des credits Lovable AI
- Necessite connexion internet

**Cout estime :**
- ~0.001-0.005$ par image selon le modele
- Avec 5000 images/mois = 5-25$/mois maximum
- Free tier Lovable couvre probablement les premiers milliers

**Implementation technique :**
Edge function qui recoit l'image en base64, l'envoie a Gemini Vision avec un prompt structure, et retourne un JSON avec les champs extraits.

---

### 2. OCR.space API

**Free Tier :** 25,000 requetes/mois (tres genereux)

**Fonctionnement :** OCR pur - extrait tout le texte visible sur l'image

**Prix :**
| Plan | Requetes/mois | Prix |
|------|---------------|------|
| Free | 25,000 | 0$ |
| PRO | 300,000 | 30$/mois |

**Avantages :**
- Tres genereux en free tier
- API simple a utiliser
- Bonne qualite OCR

**Inconvenients :**
- OCR brut uniquement : extrait TOUT le texte en vrac
- Necessite un post-traitement intelligent pour identifier les champs
- Ne comprend pas le contexte "vin"
- Difficulte a distinguer nom du vin vs domaine vs appellation

**Exemple de sortie brute :**
```text
"CHATEAU MARGAUX\nPremier Grand Cru Classe\nMargaux\n2018\n13% vol\n75cl\nMis en bouteille au chateau"
```
--> Necessite parsing regex + IA pour structurer

**Verdict :** Utilisable comme etape 1 (extraction texte) combinee avec Lovable AI (etape 2 : comprehension)

---

### 3. Google Cloud Vision API

**Free Tier :** 1,000 images/mois seulement

**Prix apres free tier :**
- Text Detection : 1.50$/1000 images (1001 a 5M)
- Label Detection : 1.50$/1000 images

**Avantages :**
- Tres haute qualite OCR
- Detection de logos (pourrait identifier les domaines)
- Web Detection pour retrouver le vin en ligne

**Inconvenients :**
- Free tier insuffisant (seulement 1000/mois)
- Necessite compte Google Cloud et facturation active
- Configuration complexe (credentials JSON, SDK)
- OCR brut, meme probleme qu'OCR.space

**Verdict :** Trop limite en free tier et complexe a configurer

---

### 4. Tesseract.js (OCR local dans le navigateur)

**Free Tier :** Illimite (tourne cote client)

**Fonctionnement :** Bibliotheque JavaScript qui fait l'OCR directement dans le navigateur de l'utilisateur

**Avantages :**
- 100% gratuit
- Pas de requetes serveur
- Confidentialite des donnees (rien n'est envoye)

**Inconvenients :**
- Qualite OCR mediocre sur photos d'etiquettes
- Necessite images bien cadrees, haute resolution
- Lent sur mobile (5-15 secondes par image)
- Charge 15-20MB de modeles dans le navigateur
- Tres sensible a la lumiere, angle, reflets sur la bouteille
- Aucune comprehension semantique

**Precision estimee :** 40-60% sur etiquettes de vin reelles (reflets, textes courbes, typographies artistiques)

**Verdict :** Deconseille pour le cas d'usage vin (photos prises par utilisateurs = qualite variable)

---

### 5. API4AI Wine Recognition

**Specialise vin :** Oui, entraine sur des centaines de milliers d'etiquettes

**Free Tier :** Demo gratuite avec rate limiting (quelques requetes/jour)

**Prix production :** Pay-as-you-go sur RapidAPI (~0.003$/requete)

**Fonctionnement :**
```bash
curl -X POST "https://demo.api4ai.cloud/wine-rec/v1/results" \
     -F "url=https://image-de-ma-bouteille.jpg"
```

**Sortie :**
```json
{
  "results": [
    {
      "entities": [
        {"label": "Chateau Margaux 2018", "confidence": 0.92},
        {"label": "Chateau Margaux 2019", "confidence": 0.85}
      ]
    }
  ]
}
```

**Avantages :**
- Specifiquement entraine pour les vins
- Tres bonne precision sur etiquettes connues
- Retourne le nom complet du vin directement

**Inconvenients :**
- Ne fonctionne que sur des etiquettes DEJA dans leur base
- Vins peu connus ou recents = non reconnus
- Free tier tres limite (demo seulement)
- Pas d'extraction des details (millesime, appellation separes)

**Verdict :** Interessant en complement mais ne couvre pas les vins nouveaux/inconnus

---

### 6. Zyla Wine Label Recognition API

**Free Tier :** 50 requetes/mois (trop limite)

**Prix :** A partir de 5$/mois pour 100 requetes

**Verdict :** Free tier insuffisant pour votre besoin

---

## Solution Recommandee : Architecture Hybride

### Approche en 2 Etapes

```text
ETAPE 1: Capture Photo
         |
         v
ETAPE 2: Edge Function "scan-wine-label"
         |
         +---> Envoi image a Lovable AI (Gemini Vision)
         |
         +---> Prompt structure pour extraction
         |
         v
ETAPE 3: Reponse JSON structuree
         {
           "wine_name": "Chateau Margaux",
           "domain_name": "Chateau Margaux",
           "year": 2018,
           "appellation": "Margaux AOC",
           "wine_type": "rouge",
           "alcohol": 13.5,
           "volume_ml": 750,
           "confidence": 0.85
         }
         |
         v
ETAPE 4: Matching avec base de donnees
         - Recherche domaine existant
         - Recherche appellation existante
         |
         v
ETAPE 5: Pre-remplissage formulaire
         - Utilisateur valide/corrige
         - Creation vin
```

### Prompt Optimise pour Gemini Vision

```text
Tu es un expert en vins français. Analyse cette photo d'étiquette de bouteille de vin et extrais les informations suivantes en JSON :

{
  "wine_name": "nom de la cuvée/vin (sans le domaine)",
  "domain_name": "nom du domaine/château/producteur",
  "year": nombre ou null,
  "appellation": "appellation complète (AOC, AOP, IGP, etc.)",
  "wine_type": "rouge|blanc|rosé|effervescent|autre",
  "alcohol_percentage": nombre ou null,
  "volume_ml": nombre ou null,
  "region": "région viticole française",
  "confidence": nombre entre 0 et 1
}

Si une information n'est pas visible sur l'étiquette, retourne null.
Pour wine_type, déduis-le de l'appellation ou de la couleur dominante de l'étiquette si possible.
```

---

## Estimation des Couts

### Scenario : 5000 scans/mois

| Solution | Cout Mensuel | Notes |
|----------|--------------|-------|
| Lovable AI (Gemini Flash) | ~5-25$ | Inclus partiellement dans credits Lovable |
| OCR.space | 0$ | Gratuit jusqu'a 25K/mois |
| Google Vision | ~7.50$ | 1K gratuit + 4000 x 1.50$/1000 |
| Tesseract.js | 0$ | Gratuit mais qualite mediocre |

**Recommandation :** Utiliser Lovable AI qui offre le meilleur rapport qualite/cout et est deja integre.

---

## Plan d'Implementation Propose

### Phase 1 : Prototype Rapide

1. **Edge Function** `scan-wine-label`
   - Recoit image en base64
   - Appelle Lovable AI avec Gemini Vision
   - Retourne JSON structure

2. **Composant React** `WineLabelScanner`
   - Capture photo (camera ou fichier)
   - Affiche loading pendant analyse
   - Pre-remplit le formulaire

3. **Integration** dans les dialogues existants
   - AddWineToDomainDialog
   - CreateWineForPostDialog
   - SpontaneousTastingDialog

### Phase 2 : Enrichissement

4. **Matching intelligent**
   - Recherche domaine similaire dans `domain`
   - Recherche appellation dans `appellation`
   - Suggestion automatique si correspondance

5. **Historique**
   - Cache des scans precedents
   - Detection bouteille deja scannee

### Phase 3 : Optimisation

6. **Feedback loop**
   - Utilisateur corrige les erreurs
   - Donnees utilisees pour ameliorer les prompts

---

## Fichiers a Creer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/scan-wine-label/index.ts` | Edge function analyse image |
| `src/components/WineLabelScanner.tsx` | Composant capture + preview |
| `src/hooks/useWineLabelScan.ts` | Hook React pour appeler l'edge function |
| Modification `AddWineToDomainDialog.tsx` | Integration scanner |
| Modification `CreateWineForPostDialog.tsx` | Integration scanner |

---

## Conclusion

**Solution recommandee :** Lovable AI avec Gemini Vision

**Raisons :**
1. Deja disponible dans votre projet (pas de nouvelle API)
2. Comprehension semantique superieure a l'OCR classique
3. Supporte le francais et le vocabulaire viticole
4. Free tier genereux via Lovable
5. Implementation simple via Edge Function

**Cout estime :** 0-25$/mois pour 5000 scans (largement dans votre budget)

**Temps d'implementation estime :** 4-6 heures pour la version fonctionnelle

