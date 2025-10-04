# 🎨 Exemples de styles pour la sidebar

## Style 1 : Minimaliste (défaut actuel)
```tsx
<aside className="sticky top-20 h-fit w-full max-w-xs">
  <nav className="surface-card rounded-3xl p-6">
```

## Style 2 : Sidebar large avec glassmorphism
```tsx
<aside className="sticky top-20 h-fit w-full max-w-sm">
  <nav className="surface-card backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 rounded-2xl p-8 border border-gray-200/50">
```

## Style 3 : Sidebar compacte
```tsx
<aside className="sticky top-16 h-fit w-full max-w-[240px]">
  <nav className="surface-card rounded-2xl p-4">
```

## Style 4 : Sidebar avec bordure gauche colorée
```tsx
<aside className="sticky top-20 h-fit w-full max-w-xs">
  <nav className="surface-card rounded-3xl p-6 border-l-4 border-primary">
```

## Style 5 : Sidebar avec ombre
```tsx
<aside className="sticky top-20 h-fit w-full max-w-xs">
  <nav className="surface-card rounded-3xl p-6 shadow-xl">
```

---

## Personnalisation des items

### Style 1 : Items avec bordure gauche
```tsx
className={`block rounded-xl px-4 py-2.5 text-sm transition-all border-l-2 ${
  isActive
    ? 'border-primary bg-primary/10 font-semibold text-primary'
    : 'border-transparent text-muted hover:border-primary/30 hover:bg-background-soft'
}`}
```

### Style 2 : Items pills (arrondis complets)
```tsx
className={`block rounded-full px-4 py-2.5 text-sm transition-all ${
  isActive
    ? 'bg-primary text-white font-semibold'
    : 'text-muted hover:bg-primary/10'
}`}
```

### Style 3 : Items avec indicateur
```tsx
<Link className="relative block rounded-xl px-4 py-2.5 text-sm transition-all">
  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r"></span>}
  {child.title}
</Link>
```

### Style 4 : Items avec icône
```tsx
<Link className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
  <span className="text-primary">→</span>
  {child.title}
</Link>
```

---

## Sections personnalisées

### Style 1 : Sections avec ligne de séparation
```tsx
<div className="mb-2 pb-2 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-muted-soft">
  {item.title}
</div>
```

### Style 2 : Sections avec badge
```tsx
<div className="mb-2 flex items-center gap-2">
  <span className="text-xs font-semibold uppercase tracking-wide text-muted-soft">
    {item.title}
  </span>
  <span className="text-xs text-primary/60">
    {item.children.length}
  </span>
</div>
```

### Style 3 : Sections avec background
```tsx
<div className="mb-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
  {item.title}
</div>
```

