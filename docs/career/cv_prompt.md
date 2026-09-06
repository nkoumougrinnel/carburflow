# 🎯 Prompt de génération de CV — Carburflow & GBLRecover

> **Usage** : copiez-collez l'intégralité du bloc « PROMPT » ci-dessous dans l'IA de votre choix (ChatGPT, Claude, Mistral, Gemini, etc.) pour générer votre CV. Le prompt est conçu pour produire un CV **professionnel, technique, mesurable** et adapté à un profil **développeur full-stack / data engineer junior à confirmé**.

---

## 📋 PROMPT (à copier-coller)

```
Tu es un expert en rédaction de CV techniques pour développeurs full-stack et data engineers. Génère un CV professionnel, moderne et très structuré (format Markdown prêt à convertir en PDF via Pandoc/LaTeX ou un éditeur Markdown) à partir des deux projets concrets suivants. Le CV doit être rédigé à la première personne ("Je…"), en français, avec des verbes d'action, des résultats chiffrés quand c'est possible, et un focus sur l'impact business.

====================
IDENTITÉ DU CANDIDAT (à compléter par l'utilisateur)
====================
- Nom complet : [À REMPLIR]
- Titre professionnel visé : Développeur Full-Stack / Data Engineer
- Email : [À REMPLIR]
- Téléphone : [À REMPLIR]
- LinkedIn : [À REMPLIR]
- GitHub : [À REMPLIR]
- Localisation : [À REMPLIR]
- Langues : Français (courant), Anglais (technique)

====================
PROJET 1 — CARBURFLOW
====================
Contexte : Application web de suivi des consommations de carburant sur plusieurs sites (cuves, groupes électrogènes, rapports hebdomadaires). Projet réalisé dans un contexte de stage / équipe de 6 personnes ("Team Ultime").

Stack technique :
- Backend : Django 5 + Django REST Framework, PostgreSQL, Celery (tâches asynchrones), Redis, JWT auth, pytest
- Frontend : React 18 + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts, React Hook Form, Zod
- DevOps : Docker, Docker Compose, Nginx, GitHub Actions CI/CD
- Données : Pandas, OpenPyXL, pipeline d'import CSV/XLSX avec validation et rapport de rejets
- Outils : Make, scripts PowerShell de test, documentation MkDocs/Sphinx

Responsabilités & réalisations (mets en valeur ce qui correspond à mon implication) :
- Conception et implémentation de l'API REST modulaire (apps/authentication, sites, reports, alerts, notifications, services, equipment, api)
- Modélisation de la base de données (MCD/MLD) : sites, cuves, groupes, rapports, lignes de rapport, alertes
- Mise en place du pipeline d'import Excel/CSV : validation, normalisation, gestion des rejets ligne par ligne, import idempotent
- Détection automatique d'anomalies et alertes métier (écarts de consommation, cuves critiques)
- Authentification JWT + RBAC (admin, manager, user) avec permissions granulaires par site
- Interface React responsive avec dashboard temps réel, graphiques de tendance, filtres par période, jauges d'autonomie
- Conteneurisation Docker (multi-stage builds) et orchestration via Docker Compose (dev + prod)
- Documentation technique complète (architecture, API OpenAPI, guide utilisateur, guide métier, plan de déploiement)
- Tests unitaires et d'intégration (pytest), scripts PowerShell de validation end-to-end

====================
PROJET 2 — GBLRECOVER
====================
Contexte : Plateforme de Revenue Assurance pour CAMTEL (opérateur télécoms camerounais). Centralise, fiabilise et rend actionnables les données de facturation, paiement et créances. Remplace un processus Excel manuel par une plateforme web consolidée. Projet "Team Ultime" (même équipe).

Stack technique :
- Backend : FastAPI (Python 3.12), SQLAlchemy 2.0 async, Alembic, Pydantic v2, PostgreSQL 16, JWT, Passlib/bcrypt, Uvicorn
- Frontend : React 19 + TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form + Zod
- Données : Pandas, OpenPyXL, pipeline d'import Excel contrôlé (validation, rejets, idempotence)
- DevOps : Docker, Docker Compose, Vercel (frontend), Railway (backend + DB)
- Design System : palette "Canopée CAMTEL" (ivoire, encre, teal, cuivre)

Responsabilités & réalisations :
- Conception de l'architecture backend FastAPI avec séparation claire routers / services / schemas / models
- Modélisation SQLAlchemy complète : clients, comptes, services, factures, paiements, imputations, créances, centres, agences, gestionnaires, rôles, permissions, audit
- Implémentation du pipeline d'import Excel (Pandas + OpenPyXL) avec prévisualisation, mapping, validation, rapport de rejets détaillé (ligne/colonne/valeur/motif)
- Mise en place des vues SQL métier (balance par gestionnaire, top clients endettés, aging, évolution des remboursements)
- Authentification JWT + RBAC avec filtrage automatique par centre/agence/portefeuille côté backend
- API REST versionnée (/api/v1) avec pagination, erreurs structurées, X-Request-ID, OpenAPI 3.1 (Swagger UI)
- Interface React 19 + TypeScript : dashboard avec KPI (encours, créances échues, taux de recouvrement, actions en retard), vue client 360° (comptes, services, factures, paiements, créances, historique), filtres en cascade
- Application du Design System "Canopée CAMTEL" avec composants shadcn/ui personnalisés
- Documentation produit & technique complète (GBLContext, PRD, TRD, Audit complet, Audit fonctionnalités, refonte UI)
- Tests smoke + scripts d'import de données réelles (Excel "GBL - Juillet 2026")

====================
COMPÉTENCES TRANSVERSES (issues des deux projets)
====================
- Architecture logicielle : conception modulaire, separation of concerns, APIs RESTful
- Qualité : tests unitaires/intégration, CI/CD, code review, documentation vivante
- DevOps : Docker, Docker Compose, Nginx, reverse proxy, déploiement multi-environnements
- Data : modélisation, pipelines ETL, validation, qualité des données
- Méthodologie : Agile/Scrum, travail en équipe (6 personnes), Git flow, gestion de versions
- Documentation : rédaction technique (README, architecture, API, guides utilisateur/métier)

====================
FORMAT DU CV ATTENDU
====================
Génère un CV avec les sections suivantes (en Markdown, prêt à imprimer) :

1. EN-TÊTE : Nom, titre, contact, liens (GitHub/LinkedIn)
2. PROFIL / RÉSUMÉ (3-4 lignes) : synthèse du profil, valeur ajoutée, domaines d'expertise
3. COMPÉTENCES TECHNIQUES : groupées par catégorie (Backend, Frontend, Data, DevOps, Outils)
4. EXPÉRIENCE PROFESSIONNELLE : 
   - Pour chaque projet, une fiche avec :
     * Nom du projet, contexte, période
     * Stack technique (badges)
     * 5-8 bullet points "verbe d'action + résultat + technologie"
   - Mets Carburflow en premier (plus récent / plus complet)
5. PROJETS PERSONNELS / OPEN SOURCE (optionnel) : si pertinent
6. FORMATION : diplôme(s), école, année
7. CERTIFICATIONS (optionnel)
8. LANGUES
9. CENTRES D'INTÉRÊT TECHNIQUES (optionnel)

====================
CONTRAINTES DE RÉDACTION
====================
- Utilise des verbes d'action : "Conçu", "Développé", "Implémenté", "Optimisé", "Déployé", "Automatisé", "Refactorisé", "Documenté"
- Chiffre quand c'est possible : "6 modules métier", "pipeline d'import gérant 10k+ lignes", "API avec 20+ endpoints", "RBAC à 3 rôles", "temps de réponse < 200ms"
- Pas de superlatifs vides ("passionné", "motivé", "autonome") sans contexte factuel
- Mets en avant l'impact : réduction du temps de traitement, fiabilisation des données, passage d'Excel à une vraie plateforme
- Longueur cible : 1 page A4 (environ 400-500 mots) en mode dense
- Adapte le ton pour un recrutement en CDI, stage de fin d'études, ou alternance (préciser dans [À REMPLIR])

====================
LIVRABLE
====================
Génère :
1. Le CV complet en Markdown
2. Une version "courte" (bio LinkedIn, ~150 mots)
3. Une lettre de motivation générique (optionnel, à activer)
4. Une liste de 5 suggestions de projets annexes que je pourrais mener pour renforcer mon profil (ex: contribution open source, side project, certification)

N'invente aucun fait technique que je n'ai pas listé ci-dessus. Si une info manque, utilise [À COMPLÉTER].
```

---

## 🚀 Comment l'utiliser

1. **Copier tout le bloc `PROMPT`** (entre les lignes `====================` du PROMPT).
2. **Remplacer tous les `[À REMPLIR]`** par vos vraies informations (nom, contact, formation, période des stages).
3. **Adapter la partie "Responsabilités"** : ne gardez que les missions que VOUS avez réellement faites (si vous étiez en équipe, ne vous attribuez pas tout le travail).
4. **Coller dans votre IA préférée** (ChatGPT, Claude, Mistral, Gemini, Le Chat, etc.).
5. **Itérer** : demandez des variantes (plus concis, plus technique, plus orienté data, plus orienté web, en anglais, etc.).

## 💡 Variantes utiles à demander ensuite

- "Adapte ce CV pour une candidature en **alternance Data Engineer**"
- "Traduis ce CV en **anglais** pour une candidature internationale"
- "Génère une **version PDF-ready** avec mise en page ATS-friendly (évite les tableaux, icônes, couleurs)"
- "Rédige la **lettre de motivation** pour [NOM ENTREPRISE] sur ce profil"
- "Propose une **bio LinkedIn** version 'À propos' (2600 caractères max)"

## 📝 Notes importantes

- **Honnêteté** : ne gonflez pas vos responsabilités. Le prompt liste tout ce que le projet CONTIENT, pas forcément ce que VOUS avez fait. Sélectionnez ce qui vous revient.
- **Vérification** : relisez toujours le CV généré avant envoi. Les IA hallucinent parfois des chiffres ou des technologies.
- **Contexte stage/équipe** : les deux projets sont estampillés "Team Ultime" (équipe de 6 personnes). Mentionnez-le comme du travail en équipe, pas individuel.
