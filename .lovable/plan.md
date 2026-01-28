
# Refonte du Design Story Instagram - Style Carte Elegant

## Resume

Transformer le composant `ShareStoryDialog` pour adopter un nouveau design epure inspire de l'image de reference : un fond pastel avec une carte blanche centrale contenant les informations du vin/post. Ajouter un selecteur de 4 couleurs pastel pour personnaliser le fond.

---

## Analyse du Design de Reference

Le nouveau design comprend :

```text
+------------------------------------------+
|  \\ (traits decoratifs)                  |
|                                          |
|    +--------------------------------+    |
|    |     NOM DU VIN (majuscules)   |    |
|    |     Domaine WineNote          |    |
|    |                               |    |
|    |    +--------------------+     |    |
|    |    |                    |     |    |
|    |    |   PHOTO/IMAGE      |     |    |
|    |    |   (grande)         |     |    |
|    |    |                    |     |    |
|    |    +--------------------+     |    |
|    |                               |    |
|    |         10/10                 |    |
|    |                               |    |
|    |  Acidite ====   Tanins ====   |    |
|    |  Corps   ====   Douceur ===   |    |
|    |                               |    |
|    +--------------------------------+    |
|                                          |
|          @winenote    (icone verre)      |
+------------------------------------------+
```

---

## Modifications Prevues

### 1. Nouveau Template Unifie

Creer un seul template `StoryTemplateCard` qui remplace les 4 templates actuels :

**Caracteristiques :**
- Fond pastel uni (couleur selectionnable)
- Traits decoratifs SVG en haut a gauche
- Carte blanche centree avec ombre douce
- Image principale : photo du post OU etiquette du vin
- Nom du vin en majuscules (police serif)
- Nom du domaine en gris
- Note en grand format avec slash stylise
- Barres de degustation compactes en grille 2x2
- Footer avec @winenote et icone de verre a vin

### 2. Selecteur de Couleurs Pastel

Ajouter 4 options de couleurs pastel :

| Couleur | Code Hex | Description |
|---------|----------|-------------|
| Taupe | `#A89F91` | Gris-beige (comme l'image) |
| Rose | `#D4A5A5` | Rose poudre |
| Sauge | `#A5B5A5` | Vert sauge |
| Lavande | `#B5A5C5` | Violet lavande |

Interface : 4 cercles cliquables au-dessus de la preview

### 3. Logique d'Affichage de l'Image

**Priorite d'affichage :**
1. Si le post a une `image_url` -> Utiliser la photo du post
2. Sinon si le vin a une `label_url` -> Utiliser l'etiquette du vin
3. Sinon -> Afficher un placeholder avec icone Wine

### 4. Traits Decoratifs

Ajouter des traits SVG simples en haut a gauche du fond :
- 3 lignes blanches inclinees
- Style minimaliste "eclat/rayons"

---

## Structure du Code

### Nouveau Composant de Barre de Degustation

```typescript
const TastingBarCard = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1">
    <span className="text-xs text-gray-500 italic">{label}</span>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gray-800 rounded-full"
        style={{ width: `${(value / 10) * 100}%` }}
      />
    </div>
  </div>
);
```

### Template Principal

```typescript
const StoryTemplateCard = ({
  wineName,
  domainName,
  imageUrl,      // Photo du post OU etiquette du vin
  wineNotice,
  backgroundColor
}: Props) => (
  <div style={{ backgroundColor }} className="w-[1080px] h-[1920px] relative">
    {/* Traits decoratifs */}
    <DecorativeLines />
    
    {/* Carte blanche centrale */}
    <div className="absolute inset-x-[100px] top-[280px] bottom-[200px] bg-white rounded-3xl shadow-xl p-12">
      {/* Contenu */}
    </div>
    
    {/* Footer @winenote */}
    <div className="absolute bottom-16 left-0 right-0 flex justify-center">
      <span>@winenote</span>
      <WineGlassIcon />
    </div>
  </div>
);
```

### Interface du Dialog

Ajouter le selecteur de couleurs :

```typescript
const PASTEL_COLORS = [
  { name: 'Taupe', value: '#A89F91' },
  { name: 'Rose', value: '#D4A5A5' },
  { name: 'Sauge', value: '#A5B5A5' },
  { name: 'Lavande', value: '#B5A5C5' },
];

// Dans le dialog, avant la preview :
<div className="flex justify-center gap-3 mb-4">
  {PASTEL_COLORS.map((color) => (
    <button
      key={color.value}
      onClick={() => setSelectedColor(color.value)}
      className={cn(
        "w-8 h-8 rounded-full border-2 transition-all",
        selectedColor === color.value 
          ? "border-primary scale-110" 
          : "border-transparent"
      )}
      style={{ backgroundColor: color.value }}
    />
  ))}
</div>
```

---

## Fichiers a Modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/ShareStoryDialog.tsx` | Refonte complete du design |

---

## Details Techniques

### Dimensions (format Story 9:16)
- Canvas : 1080 x 1920 pixels
- Carte blanche : ~880px large, ~1400px haut
- Padding carte : 48-60px
- Image principale : ~700px x ~700px (carre ou ratio original)

### Typographie
- Nom du vin : Serif, majuscules, ~48px
- Domaine : Sans-serif, gris, ~24px
- Note : ~80px pour le chiffre, ~40px pour "/10"
- Labels barres : Italique, gris, ~16px

### Couleurs de la Carte
- Fond carte : `#FFFFFF`
- Texte principal : `#1a1a1a`
- Texte secondaire : `#666666`
- Barres remplies : `#1a1a1a`
- Barres vides : `#e5e5e5`
- Separateur : `#e5e5e5`

---

## Gestion des Cas

| Type de Post | Image Affichee | Notes Affichees |
|--------------|----------------|-----------------|
| Degustation avec photo | Photo du post | Oui |
| Degustation sans photo | Etiquette du vin | Oui |
| Post avec photo (sans notes) | Photo du post | Non |
| Post avec vin (sans photo ni notes) | Etiquette du vin | Non |
| Post texte seul | Placeholder Wine | Non |

---

## Resume des Changements

1. **Supprimer** les 4 templates actuels (Tasting, Photo, Quote, Wine)
2. **Creer** un seul template `StoryTemplateCard` avec le nouveau design
3. **Ajouter** un state `selectedColor` pour la couleur de fond
4. **Ajouter** le selecteur de 4 couleurs pastel dans le dialog
5. **Modifier** la logique pour prioriser la photo du post sur l'etiquette du vin
6. **Ajouter** les traits decoratifs SVG en haut a gauche
7. **Adapter** les barres de degustation au nouveau style (noir sur gris clair)
