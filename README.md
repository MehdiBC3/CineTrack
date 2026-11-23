# 🎬 CinéTrack

Application web de suivi de films et séries (watchlist « À voir / En cours / Vu », notes et statistiques) alimentée par l'API TMDB, composée d'un front, d'une API back et d'une base de données PostgreSQL, conteneurisée avec Docker et déployée sur Kubernetes.

> Projet ESILV M1 – Conteneurisation & Orchestration · Mehdi Bencheikh

---

## Architecture

```
┌────────────┐   /api    ┌──────────────┐   SQL    ┌──────────────┐
│  frontend  │ ────────▶ │   backend    │ ───────▶ │  PostgreSQL  │
│ React+Nginx│           │ Node/Express │          │   (volume)   │
└────────────┘           └──────┬───────┘          └──────────────┘
                                │ HTTPS (clé API côté serveur uniquement)
                                ▼
                          API TMDB (films/séries)
```

| Service | Techno | Rôle |
|---|---|---|
| `frontend` | React (Vite), servi par Nginx | Interface : recherche, watchlist, stats |
| `backend` | Node.js 20 + Express | API REST, proxy TMDB, accès base |
| `db` | PostgreSQL 16 | Stockage de la watchlist |

## Structure du dépôt

```
CineTrack/
├── backend/          # API REST (étape 2)
│   ├── src/
│   └── test/
├── frontend/         # Interface React (étape 3)
├── deploy/           # Manifestes Kubernetes (étape 5)
├── .github/workflows # Pipeline CI/CD (étape 6)
├── docker-compose.yml# Environnement de dev (étape 4)
├── .env.example      # Modèle des variables d'environnement
└── README.md
```

## Avancement

- [x] **Étape 1** – Structure du dépôt, branches `main` / `develop`, `.gitignore`
- [x] **Étape 2** – API back (Node/Express + PostgreSQL + TMDB)
- [ ] **Étape 3** – Front (React + Nginx)
- [ ] **Étape 4** – Docker : Dockerfiles multi-stage + `docker-compose.yml`
- [ ] **Étape 5** – Kubernetes : Deployments, Services, ConfigMap, Secret, PV/PVC
- [ ] **Étape 6** – CI/CD GitHub Actions (build → push → deploy)
- [ ] **Étape 7** – Documentation finale et présentation

## Workflow Git

- `main` : branche protégée, représente la production (déploiement sur tag `vX.Y.Z`)
- `develop` : branche de travail principale
- `feature/<nom>` : une branche par fonctionnalité, mergée dans `develop`

## API back

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | Le service répond (liveness) |
| GET | `/api/ready` | Le service et la base répondent (readiness) |
| GET | `/api/trending` | Films et séries tendance de la semaine (TMDB) |
| GET | `/api/search?q=...` | Recherche de films et séries (TMDB) |
| GET | `/api/watchlist[?status=...]` | Liste des titres suivis |
| POST | `/api/watchlist` | Ajoute un titre (`tmdb_id`, `media_type`, `title`, …) |
| PATCH | `/api/watchlist/:id` | Change le statut (`to_watch`, `watching`, `watched`) et/ou la note (1–10) |
| DELETE | `/api/watchlist/:id` | Retire un titre |
| GET | `/api/stats` | Statistiques (par statut, par type, note moyenne) |

La table `watchlist` est créée automatiquement au démarrage de l'API.

### Configuration

Toute la configuration passe par des variables d'environnement (voir `.env.example`).
Les valeurs sensibles (`DB_PASSWORD`, `TMDB_API_KEY`) ne sont jamais commitées : elles seront fournies par un fichier `.env` en dev et par un `Secret` Kubernetes en production.

### Lancer l'API en local (sans Docker)

Prérequis : Node.js 20+ et une base PostgreSQL accessible.

```bash
cd backend
npm install
npm test
# Windows PowerShell : définir les variables puis lancer
$env:DB_PASSWORD="..."; $env:TMDB_API_KEY="..."; npm start
```

> À partir de l'étape 4, toute l'application se lancera avec une seule commande : `docker compose up`.

## Sources

Données films et séries : [TMDB](https://www.themoviedb.org/). Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
