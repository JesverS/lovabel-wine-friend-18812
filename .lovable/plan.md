

# Plan : Ajout de la Section Protection des Enfants (Google Play Compliance)

## Resume

Ce plan ajoute une section dediee a la protection des enfants sur la page Privacy (Politique de Confidentialite), conformement aux exigences de Google Play pour les applications de reseaux sociaux. Il inclut egalement un lien direct avec ancre (#child-safety) pour permettre une navigation directe vers cette section.

---

## Contexte et Exigences Google Play

Google Play exige que les applications de reseaux sociaux :

1. **Publier des normes explicites** interdisant l'exploitation et les abus sexuels sur mineurs
2. **Fournir un mecanisme de signalement** integre a l'application
3. **Gerer les contenus d'abus** en les supprimant apres notification
4. **Respecter les lois** concernant la securite des enfants
5. **Indiquer un contact responsable** de la securite des enfants

---

## Architecture de la Solution

```text
Page Privacy (/privacy)
├── Sections existantes (1-16)
│
├── NOUVELLE Section 17 : Protection et Securite des Enfants
│   ├── Tolerance zero (politique explicite)
│   ├── Contenus interdits (liste)
│   ├── Mecanisme de signalement (lien vers /contact)
│   ├── Mesures prises (suppression, signalement NCMEC)
│   ├── Contact responsable securite enfants
│   └── Lien vers formulaire de contact pre-rempli
│
├── Section 18 (ancienne 15) : Modification de la politique
└── Section 19 (ancienne 16) : Autorite de controle

Lien direct : /privacy#child-safety
```

---

## Modifications Prevues

### 1. Page Privacy.tsx

**Fichier :** `src/pages/Privacy.tsx`

**Ajouts :**
- Import de `useEffect` et `useLocation` de React Router pour gerer le scroll vers l'ancre
- Import d'icones supplementaires : `Baby` ou `ShieldAlert` de Lucide
- Nouvelle Card avec `id="child-safety"` pour permettre le lien direct
- Contenu conforme aux exigences Google Play
- Lien vers `/contact?subject=child-safety` pour signalement

**Contenu de la nouvelle section :**

```text
17. Protection et Securite des Enfants

WineNote s'engage fermement dans la protection des mineurs et applique 
une politique de TOLERANCE ZERO concernant l'exploitation et les abus 
sexuels sur mineurs (CSAM - Child Sexual Abuse Material).

CONTENUS STRICTEMENT INTERDITS :
• Tout contenu representant des abus sexuels sur mineurs
• Tout contenu sexualisant des mineurs
• Tout comportement de predation envers des mineurs
• Toute tentative de contact inapproprie avec des mineurs

MECANISME DE SIGNALEMENT :
Si vous etes temoin d'un contenu ou comportement inapproprie 
impliquant des mineurs, signalez-le immediatement via notre 
formulaire de contact dedie.

[Bouton : Signaler un contenu]

MESURES PRISES PAR WINENOTE :
• Suppression immediate des contenus signales
• Suspension/bannissement permanent des comptes concernes
• Signalement aux autorites competentes (NCMEC, autorites locales)
• Conservation des logs a des fins d'enquete

CONTACT RESPONSABLE SECURITE ENFANTS :
Pour toute notification concernant la securite des enfants :
contact@winenote.me
```

### 2. Page Contact.tsx

**Fichier :** `src/pages/Contact.tsx`

**Modifications :**
- Lecture du parametre `subject` dans l'URL via `useSearchParams`
- Si `subject=child-safety`, pre-selection du sujet "Signalement securite enfants"
- Ajout d'une nouvelle option dans le Select : "Signalement securite enfants"

**Code :**

```typescript
// Ajouter dans les imports
import { useSearchParams } from "react-router-dom";

// Dans le composant
const [searchParams] = useSearchParams();

// Dans useEffect au chargement
useEffect(() => {
  const subject = searchParams.get('subject');
  if (subject === 'child-safety') {
    setFormData(prev => ({ ...prev, subject: 'child-safety' }));
  }
}, [searchParams]);

// Dans le Select, ajouter l'option
<SelectItem value="child-safety">
  Signalement securite enfants
</SelectItem>
```

### 3. Mise a jour des CGU (Optionnel mais Recommande)

**Fichier :** `src/content/cgu-text.ts`

**Modifications :**
- Ajouter une section explicite sur la protection des enfants dans les CGU
- Mettre a jour `CGU_VERSION` vers "1.1.0"

**Contenu suggere a ajouter apres la section 6.2 (Contenus interdits) :**

```text
• tout contenu representant ou suggerant des abus sur mineurs ;
• tout comportement de predation ou de sollicitation envers des mineurs.
```

---

## Fichiers a Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/Privacy.tsx` | MODIFIER | Ajouter section 17 Protection des Enfants avec ancre |
| `src/pages/Contact.tsx` | MODIFIER | Ajouter sujet "child-safety" + lecture URL params |
| `src/content/cgu-text.ts` | MODIFIER | Renforcer les contenus interdits (optionnel) |

---

## URL et Navigation

### Liens directs

| URL | Description |
|-----|-------------|
| `/privacy#child-safety` | Scroll direct vers la section Protection des Enfants |
| `/contact?subject=child-safety` | Formulaire pre-rempli pour signalement |

### Integration dans l'app Android

Pour la conformite Google Play, vous pourrez fournir ces URLs :
- **Normes publiees :** `https://winenote.me/privacy#child-safety`
- **Mecanisme de signalement :** `https://winenote.me/contact?subject=child-safety`
- **Contact securite enfants :** `contact@winenote.me`

---

## Apercu Visuel de la Nouvelle Section

La section sera visuellement mise en evidence avec :
- Icone `ShieldAlert` en rouge/orange pour attirer l'attention
- Encadre avec bordure rouge pour "Tolerance Zero"
- Bouton CTA visible pour le signalement
- Contact email en evidence

---

## Section Technique

### Gestion du Scroll vers l'Ancre

```typescript
// Dans Privacy.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function Privacy() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.slice(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

  // ...reste du composant
}
```

### Structure de la Carte

```tsx
<Card id="child-safety" className="glass-card border-red-500/30">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
      <ShieldAlert className="h-6 w-6" />
      17. Protection et Securite des Enfants
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Contenu detaille */}
  </CardContent>
</Card>
```

---

## Checklist de Conformite Google Play

Apres implementation, vous pourrez certifier :

- [x] **Normes publiees** : Section 17 de la politique de confidentialite
- [x] **Mecanisme integre** : Formulaire de contact avec sujet dedie
- [x] **Gestion des contenus** : Engagement de suppression + signalement
- [x] **Respect des lois** : Mention du signalement NCMEC/autorites
- [x] **Contact responsable** : `contact@winenote.me` clairement indique

