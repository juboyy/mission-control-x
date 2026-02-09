# MCX Dashboard: Dark/Light Mode Toggle

## Spec de Implementação

**Data:** 2026-02-08  
**Autor:** Robin (Research Subagent)  
**Status:** Proposta

---

## 1. Análise do CSS Atual

O dashboard já possui uma **excelente base para theming** com CSS variables no `:root`:

### Variáveis Existentes (Dark Theme)
```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a25;
  --bg-card: #16161f;
  --border-color: rgba(255, 255, 255, 0.08);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.4);
  --accent-primary: #00d4ff;
  --accent-secondary: #7c3aed;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;
  /* + shadows, radii, transitions */
}
```

**Veredito:** A implementação será **simples** - apenas criar theme variants e toggle logic.

---

## 2. Abordagem Técnica Proposta

### 2.1 CSS: Data Attribute Theming
Usar `data-theme` no `<html>` para alternar temas:

```css
/* Default: Dark (mantém compatibilidade) */
:root {
  /* ... variáveis atuais ... */
}

/* Light Theme Override */
:root[data-theme="light"] {
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e8ecf1;
  --bg-card: #ffffff;
  --border-color: rgba(0, 0, 0, 0.08);
  --text-primary: #1a1a2e;
  --text-secondary: rgba(26, 26, 46, 0.7);
  --text-muted: rgba(26, 26, 46, 0.5);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.15);
  /* accent colors permanecem iguais para consistência de marca */
}
```

### 2.2 Respeitar System Preference
Adicionar media query para respeitar preferência do sistema quando não há escolha manual:

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    /* Light theme vars */
  }
}
```

### 2.3 JavaScript: Toggle + Persistência

```javascript
// Theme Manager
const ThemeManager = {
  STORAGE_KEY: 'mcx-theme',
  
  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.setTheme(saved);
    } else {
      // Respeita preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }
  },
  
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateToggleUI(theme);
  },
  
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  },
  
  updateToggleUI(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Mudar para Light Mode' : 'Mudar para Dark Mode';
    }
  }
};

// Inicializar no load
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
```

---

## 3. Toggle UI

### Localização
**Header, lado direito** - ao lado do botão refresh:

```html
<div class="header-right">
  <div class="budget-widget">...</div>
  <button class="btn-theme" id="themeToggle" onclick="ThemeManager.toggle()">☀️</button>
  <button class="btn-refresh" onclick="refreshData()">🔄</button>
</div>
```

### Estilo do Botão
```css
.btn-theme {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  cursor: pointer;
  font-size: 16px;
  transition: var(--transition);
}

.btn-theme:hover {
  background: rgba(124, 58, 237, 0.1);
  border-color: var(--accent-secondary);
  transform: rotate(20deg);
}
```

---

## 4. Paleta Light Mode Proposta

| Token | Dark | Light | Nota |
|-------|------|-------|------|
| `--bg-primary` | `#0a0a0f` | `#f5f7fa` | Fundo principal |
| `--bg-secondary` | `#12121a` | `#ffffff` | Sidebar, header |
| `--bg-tertiary` | `#1a1a25` | `#e8ecf1` | Inputs, hovers |
| `--bg-card` | `#16161f` | `#ffffff` | Cards com shadow |
| `--border-color` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Bordas |
| `--text-primary` | `#ffffff` | `#1a1a2e` | Texto principal |
| `--text-secondary` | `rgba(255,255,255,0.7)` | `rgba(26,26,46,0.7)` | Texto secundário |
| `--text-muted` | `rgba(255,255,255,0.4)` | `rgba(26,26,46,0.5)` | Texto desabilitado |

**Cores de acento** (`--accent-primary`, `--accent-secondary`, `--success`, etc) **mantidas iguais** para consistência.

---

## 5. Considerações Especiais

### 5.1 Scrollbar
Adicionar variante light:
```css
:root[data-theme="light"] ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
}
```

### 5.2 Gradients
O `--accent-gradient` pode ser mantido igual - funciona bem em ambos os temas.

### 5.3 Logo Animation
A animação de spin do logo continua funcionando sem alterações.

### 5.4 Chart Colors (futuro)
Se adicionarmos charts, usar variáveis CSS para cores dinâmicas.

---

## 6. Checklist de Implementação

- [ ] Adicionar variáveis light theme em `css/style.css`
- [ ] Adicionar media query `prefers-color-scheme`
- [ ] Criar `ThemeManager` em `js/app.js`
- [ ] Adicionar botão toggle no header
- [ ] Testar transição suave entre temas
- [ ] Testar persistência (localStorage)
- [ ] Testar com preferência do sistema
- [ ] Testar responsividade mobile

---

## 7. Estimativa

| Item | Tempo |
|------|-------|
| CSS variables | 20 min |
| JavaScript toggle | 15 min |
| UI button + style | 10 min |
| Testes | 15 min |
| **Total** | **~1 hora** |

---

## 8. Notas

- Manter dark como default (atual) para não quebrar experiência existente
- Transição suave com `transition: background-color 0.3s, color 0.3s`
- Considerar adicionar transition ao `:root` para mudança global suave
