# 💍 TDC Matchmaker Dashboard

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-optional-412991?logo=openai&logoColor=white)

A web dashboard for professional matchmakers to manage customers and find the best matches for them. Matches are ranked by a custom scoring algorithm and explained by AI.

## 📌 Overview

Each matchmaker logs in and sees only their own customers. For any customer, the app suggests the most compatible profiles from a pool of 240 dummy profiles. Every suggestion has a score, a reason for each factor, and an AI-written insight. The matchmaker can then send an intro email to the match.

## ✨ Features

- 🔐 Secure login with JWT, where each matchmaker sees only their own customers
- 👥 Customer list with search, status filter and pagination
- 📄 Full biodata view, journey stage tracking and private notes
- 🎯 Smart match suggestions, ranked 0–100 using 13 weighted factors
- 🚫 Deal-breaker handling (kids, religion, age range, relocation)
- 🤖 AI insights: why they match, conversation starters and watch-outs
- ✉️ AI-drafted intro email that the matchmaker can edit before sending (mock email)
- 🔁 Duplicate-send protection, with a sent history for each customer
- 🛟 Works without AI: it falls back to rule-based text when there is no API key

## 🧠 How Matching Works

| Step | What happens |
|---|---|
| 1. Filter | An indexed Mongo query keeps only compatible profiles (gender, marital status, age and religion preferences) |
| 2. Score | 13 factors, including age, income, height, kids, religion, location, language, education and profession, are scored 0–1 and weighted by the customer's gender |
| 3. Explain | The top 10 are sent to OpenAI for insights and a small bounded re-rank (±8 points) |

Details and assumptions: [docs/MATCHING_LOGIC.md](docs/MATCHING_LOGIC.md)

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js 20, Express, Zod, JWT |
| Database | MongoDB with Mongoose |
| AI | OpenAI API (optional) |
| DevOps | Docker, Docker Compose, GitHub Actions, AWS |

## 📁 Project Structure

```
Matcher/
├── frontend/   # React app (login, dashboard, customer page)
├── backend/    # Express API, matching engine, AI service, seed data
├── deploy/     # AWS deployment guide
├── docs/       # Matching logic and detailed notes
└── docker-compose.yml
```

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose (or Node.js 20+ and MongoDB for local dev)

### Run with Docker

```bash
git clone <your-repo-url>
cd Matcher
cp .env.example .env        # set JWT_SECRET (OPENAI_API_KEY is optional)
docker compose up --build
```

Open **http://localhost:8080**. Demo data loads automatically on first run.

### Run locally (hot reload)

```bash
docker compose up mongo -d

cd backend
cp .env.example .env
npm install
npm run dev                 # API on http://localhost:4000

cd ../frontend
npm install
npm run dev                 # UI on http://localhost:5173
```

Other commands (in `backend/`): `npm run seed` to reset the data, `npm test` to run the tests.

## 🔑 Demo Login

| Username | Password | Customers |
|---|---|---|
| `matchmaker1` | `Match@123` | 16 |
| `matchmaker2` | `Match@123` | 8 |

## 🔌 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Log in and get a token |
| GET | `/api/customers` | List customers (search, filter, pagination) |
| GET | `/api/customers/:id` | Customer biodata and notes |
| GET | `/api/customers/:id/matches` | Ranked match suggestions |
| POST | `/api/customers/:id/matches/:profileId/intro` | Draft the intro email |
| POST | `/api/customers/:id/matches/:profileId/send` | Send the match |
| GET | `/api/customers/:id/sent` | Sent history |

Full list: [docs/PROJECT_DETAILS.md](docs/PROJECT_DETAILS.md)

## ☁️ Deployment

Deployable to AWS (App Runner, plus S3 and CloudFront for the frontend). See [deploy/aws/README.md](deploy/aws/README.md).

## ⚠️ Known Limitations

- JWT is stored in `localStorage` (an httpOnly cookie is better for production)
- Email is mocked, and the AI cache and rate limiter are in-memory
- Scoring weights are set by hand, not learned from real outcomes

## 📄 License

For assessment and demo purposes.
