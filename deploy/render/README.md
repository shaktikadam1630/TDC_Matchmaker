# Render Deployment

This project deploys to Render as two services:

- `tdc-matchmaker-api`: Docker Web Service using `backend/Dockerfile`
- `tdc-matchmaker-web`: Static Site built from `frontend`

The repository includes `render.yaml`, so Render can create both services from **New > Blueprint**.

## Required database

The backend requires MongoDB. Render does not provide a MongoDB service in this Blueprint. Use a MongoDB provider and copy its connection string into the backend service's `MONGO_URI` environment variable. For a temporary local database, use the root `docker-compose.yml` instead.

## Deploy

1. Push the repository to GitHub.
2. In Render, select **New > Blueprint**.
3. Connect `shaktikadam1630/TDC_Matchmaker`.
4. Select the `main` branch and apply `render.yaml`.
5. Enter the MongoDB connection string when Render asks for the secret `MONGO_URI`.
6. Enter an OpenAI key for `OPENAI_API_KEY`, or leave it empty to use the rule-based fallback.
7. Deploy the Blueprint.

The Blueprint uses these service URLs:

```text
https://tdc-matchmaker-api.onrender.com
https://tdc-matchmaker-web.onrender.com
```

If you change either service name, update `CORS_ORIGINS` and `VITE_API_URL` in `render.yaml` before redeploying.

## Manual setup

If you do not use a Blueprint, create the services manually:

### Backend Web Service

- Runtime: Docker
- Root Directory: `backend`
- Dockerfile: `Dockerfile`
- Health Check Path: `/api/health`

Set `NODE_ENV`, `AUTO_SEED`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `OPENAI_API_KEY`, and `OPENAI_MODEL`.

### Frontend Static Site

- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- `VITE_API_URL`: `https://YOUR-BACKEND.onrender.com/api`

Add this rewrite:

```text
/*  ->  /index.html  (Rewrite)
```