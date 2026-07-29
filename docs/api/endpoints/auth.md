# Auth API

Base : `/api/v1/auth/`

| Méthode | URL | Auth | Description |
|---------|-----|------|-------------|
| POST | `/auth/register` | non | Inscription (+ token) |
| POST | `/auth/login` | non | Connexion (`username`, `password`) |
| POST | `/auth/logout` | oui | Invalide le token |
| GET | `/auth/me` | oui | Profil courant |
| PATCH | `/auth/me` | oui | Maj prénom / nom / email |
| POST | `/auth/password` | oui | Changer mot de passe |
| GET | `/auth/csrf` | non | Jeton CSRF |
| GET | `/auth/sites` | non | Sites actifs pour inscription (`id`, `nom_site`) |

## Payload login / register (réponse)

```json
{
  "token": "...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "...",
    "first_name": "",
    "last_name": "",
    "full_name": "admin",
    "role": "admin",
    "site_id": null,
    "site_nom": null,
    "is_staff": true
  }
}
```

## Rôles API (compat frontend)

| DB (`ProfilUtilisateur.role`) | API / frontend |
|-------------------------------|----------------|
| `super_admin`, `admin` | `admin` |
| `agent` | `operateur` |
| `user` | `user` |

## Comptes démo

```bash
python manage.py seed_accounts
```

- `admin` / `admin`
- `operateur` / `operateur123`
- `user` / `user123`
