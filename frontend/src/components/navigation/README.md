# Navigation Components

Composants de navigation améliorés pour CarburFlow avec animations fluides.

## Composants disponibles

### AnimatedBadge
Badge animé pour les notifications et alertes.

**Props:**
- `count` (number): Nombre d'éléments
- `variant` ('danger' | 'primary' | 'warning'): Variante de couleur
- `animationType` ('pulse' | 'bounce'): Type d'animation

### MobileMenu
Menu de navigation mobile avec animations fluides.

**Props:**
- `isOpen` (boolean): État d'ouverture du menu
- `onClose` (function): Fonction de fermeture
- `activeView` (string): Vue actuellement active

### DropdownMenu
Menu déroulant pour les actions utilisateur.

**Props:**
- `children` (ReactNode): Contenu du menu
- `isOpen` (boolean): État d'ouverture
- `onClose` (function): Fonction de fermeture
- `align` ('left' | 'right'): Alignement du menu

### DropdownItem
Élément de menu déroulant.

**Props:**
- `icon` (ReactNode): Icône
- `label` (string): Texte du menu
- `badge` (ReactNode): Badge
- `onClick` (function): Fonction de clic
- `isDivider` (boolean): Séparateur

### UserMenu
Menu utilisateur avec avatar, nom, rôle et actions.

**Props:**
- `user` (object): Données utilisateur
- `isAdmin` (boolean): Si l'utilisateur est admin
- `isOperator` (boolean): Si l'utilisateur est opérateur
- `onLogout` (function): Fonction de déconnexion
- `onNavigate` (function): Fonction de navigation

### ThemeToggle
Bouton pour basculer entre le mode clair et sombre.

### NotificationPanel
Panneau de notifications avec liste des alertes.

**Props:**
- `isOpen` (boolean): État d'ouverture
- `onClose` (function): Fonction de fermeture
- `unreadCount` (number): Nombre de notifications non lues

## Styles

Les styles sont définis dans `styles/navigation.css` et importés dans `main.jsx`.

### Animations
- **badgePulse**: Animation de pulsation pour les badges
- **badgeBounce**: Animation de rebond pour les badges

### Classes CSS
- `.topbar`: Barre de navigation principale
- `.topbar-badge`: Badge animé
- `.nav-link`: Lien de navigation
- `.mobile-menu`: Menu mobile
- `.notification-panel`: Panneau de notifications
- `.dropdown-menu`: Menu déroulant

## Utilisation

```jsx
import { AnimatedBadge, MobileMenu, ThemeToggle, NotificationPanel } from '@/components/navigation'

// Dans votre composant
function MyComponent() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(5)

  return (
    <>
      <AnimatedBadge count={unreadCount} variant="danger" animationType="pulse" />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} activeView="dashboard" />
      <ThemeToggle />
      <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} unreadCount={unreadCount} />
    </>
  )
}
```