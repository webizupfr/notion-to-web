# Guide de stylisation des couleurs Notion

Ce document explique comment styliser toutes les couleurs et styles que tu appliques dans Notion (texte, fond, callouts, etc.) pour qu'ils s'affichent parfaitement sur ton site.

---

## 🎨 **Système de couleurs Notion**

### **1. Couleurs de texte et fond (Rich Text)**
Notion envoie des annotations de couleur via l'API. Ton code les capture déjà et génère des attributs `data-*` que tu peux styliser.

**Couleurs supportées par Notion :**
- `blue`, `red`, `green`, `yellow`, `orange`, `purple`, `pink`, `brown`, `gray`
- Avec variantes `_background` pour les fonds

### **2. Hooks CSS disponibles**
Dans `src/components/notion/Blocks.tsx`, le code génère :
- `data-color="blue"` pour les couleurs de texte
- `data-bg="blue"` pour les couleurs de fond
- Classes `.rt-mark` pour le conteneur

---

## 🛠️ **Intégration dans ton projet**

### **Étape 1 : Ajouter les styles dans globals.css**

Ajoute ce bloc à la fin de `src/app/globals.css` :

```css
/* ===== COULEURS NOTION ===== */
/* Couleurs de texte Notion */
.rt-mark[data-color="blue"] { color: #3b82f6; }
.rt-mark[data-color="red"] { color: #dc2626; }
.rt-mark[data-color="green"] { color: #16a34a; }
.rt-mark[data-color="yellow"] { color: #eab308; }
.rt-mark[data-color="orange"] { color: #ea580c; }
.rt-mark[data-color="purple"] { color: #9333ea; }
.rt-mark[data-color="pink"] { color: #ec4899; }
.rt-mark[data-color="brown"] { color: #a16207; }
.rt-mark[data-color="gray"] { color: #6b7280; }

/* Couleurs de fond Notion */
.rt-mark[data-bg="blue"] { 
  background-color: #dbeafe; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="red"] { 
  background-color: #fee2e2; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="green"] { 
  background-color: #dcfce7; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="yellow"] { 
  background-color: #fef3c7; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="orange"] { 
  background-color: #fed7aa; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="purple"] { 
  background-color: #e9d5ff; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="pink"] { 
  background-color: #fce7f3; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="brown"] { 
  background-color: #f3e8ff; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
.rt-mark[data-bg="gray"] { 
  background-color: #f3f4f6; 
  padding: 0.125rem 0.25rem; 
  border-radius: 0.25rem; 
}
```

### **Étape 2 : Étendre le support des callouts colorés**

Modifie le case `"callout"` dans `src/components/notion/Blocks.tsx` :

```tsx
case "callout": {
  const icon = block.callout.icon?.type === "emoji" ? block.callout.icon.emoji : null;
  const color = block.callout.color; // Nouvelle ligne
  const colorClass = color && color !== "default" ? `callout-${color}` : '';
  
  return (
    <div className={`callout rounded-3xl border p-5 ${colorClass}`}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="text-xl" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className="space-y-3">
          <div>{renderRichText(block.callout.rich_text)}</div>
          {getBlockChildren(block).length ? <Blocks blocks={getBlockChildren(block)} /> : null}
        </div>
      </div>
    </div>
  );
}
```

Puis ajoute ces styles dans `globals.css` :

```css
/* Callouts colorés Notion */
.callout-gray { 
  background: #f8fafc; 
  border-color: #e2e8f0; 
}
.callout-red { 
  background: #fef2f2; 
  border-color: #fecaca; 
}
.callout-blue { 
  background: #eff6ff; 
  border-color: #bfdbfe; 
}
.callout-green { 
  background: #f0fdf4; 
  border-color: #bbf7d0; 
}
.callout-yellow { 
  background: #fffbeb; 
  border-color: #fed7aa; 
}
.callout-orange { 
  background: #fff7ed; 
  border-color: #fed7aa; 
}
.callout-purple { 
  background: #faf5ff; 
  border-color: #d8b4fe; 
}
.callout-pink { 
  background: #fdf2f8; 
  border-color: #f9a8d4; 
}
.callout-brown { 
  background: #fef7ff; 
  border-color: #e9d5ff; 
}
```

---

## 🎯 **Personnalisation avancée**

### **1. Adapter les couleurs à ton thème**
Tu peux modifier les couleurs pour qu'elles s'harmonisent avec ton design system :

```css
/* Version adaptée à ton thème amber/red */
.rt-mark[data-color="blue"] { color: var(--primary); }
.rt-mark[data-color="red"] { color: var(--accent); }
.rt-mark[data-bg="blue"] { 
  background-color: color-mix(in oklab, var(--primary) 20%, white); 
}
.rt-mark[data-bg="red"] { 
  background-color: color-mix(in oklab, var(--accent) 20%, white); 
}
```

### **2. Ajouter des couleurs personnalisées**
Si tu veux ajouter des couleurs qui ne sont pas dans Notion par défaut :

```css
/* Couleurs personnalisées */
.rt-mark[data-color="brand"] { color: var(--primary); }
.rt-mark[data-bg="brand"] { 
  background-color: color-mix(in oklab, var(--primary) 15%, white); 
}
```

### **3. Styles pour les toggles et todos colorés**
Ajoute le support des couleurs pour les toggles et todos :

```css
/* Toggle coloré */
.toggle-gray { background: #f8fafc; border-color: #e2e8f0; }
.toggle-red { background: #fef2f2; border-color: #fecaca; }
.toggle-blue { background: #eff6ff; border-color: #bfdbfe; }

/* Todo coloré */
.todo-gray [data-checked="true"] { background: #f3f4f6; }
.todo-red [data-checked="true"] { background: #fee2e2; }
.todo-blue [data-checked="true"] { background: #dbeafe; }
```

---

## 🔧 **Configuration et paramétrage**

### **1. Variables CSS pour faciliter les changements**
Tu peux définir des variables CSS pour centraliser les couleurs :

```css
:root {
  /* Couleurs Notion */
  --notion-blue: #3b82f6;
  --notion-red: #dc2626;
  --notion-green: #16a34a;
  --notion-yellow: #eab308;
  --notion-orange: #ea580c;
  --notion-purple: #9333ea;
  --notion-pink: #ec4899;
  --notion-brown: #a16207;
  --notion-gray: #6b7280;
  
  /* Fond Notion */
  --notion-bg-blue: #dbeafe;
  --notion-bg-red: #fee2e2;
  --notion-bg-green: #dcfce7;
  /* ... etc */
}

/* Puis utiliser les variables */
.rt-mark[data-color="blue"] { color: var(--notion-blue); }
.rt-mark[data-bg="blue"] { background-color: var(--notion-bg-blue); }
```

### **2. Mode sombre (optionnel)**
Si tu veux ajouter un mode sombre pour les couleurs Notion :

```css
@media (prefers-color-scheme: dark) {
  .rt-mark[data-color="blue"] { color: #60a5fa; }
  .rt-mark[data-bg="blue"] { background-color: #1e3a8a; }
  /* ... autres couleurs */
}
```

### **3. Animations et transitions**
Tu peux ajouter des effets subtils :

```css
.rt-mark[data-bg] {
  transition: background-color 0.2s ease;
}
.callout {
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
```

---

## 📝 **Check-list d'intégration**

- [ ] Ajouter les styles de base dans `globals.css`
- [ ] Modifier le case `"callout"` dans `Blocks.tsx`
- [ ] Tester avec du contenu Notion coloré
- [ ] Ajuster les couleurs selon ton thème
- [ ] Ajouter des couleurs personnalisées si besoin
- [ ] Tester en mode sombre (optionnel)

---

## 🚀 **Prochaines étapes**

1. **Test immédiat** : Crée du contenu coloré dans Notion et vérifie que ça s'affiche bien
2. **Personnalisation** : Ajuste les couleurs pour qu'elles s'harmonisent avec ton design
3. **Extensions** : Ajoute le support des toggles/todos colorés si tu en as besoin
4. **Optimisation** : Utilise les variables CSS pour faciliter les changements futurs

---

## 💡 **Conseils**

- **Commence simple** : Ajoute d'abord les couleurs de base, puis étends progressivement
- **Teste régulièrement** : Vérifie que tes couleurs s'affichent bien avec du contenu réel
- **Cohérence** : Assure-toi que les couleurs Notion s'harmonisent avec ton thème global
- **Performance** : Les styles CSS sont légers, pas de souci de performance

Ton système est déjà bien conçu pour supporter les couleurs Notion, il suffit d'ajouter les styles CSS correspondants !

