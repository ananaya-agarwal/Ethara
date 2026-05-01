# Team Task Manager (Full-Stack)

A full-stack collaborative task manager where teams can create projects, invite members, assign tasks, and track progress with role-based access.

## Features

- User authentication (signup/login) with JWT
- Project creation and team membership management
- Admin/Member role-based access control
- Task lifecycle management (`TODO`, `IN_PROGRESS`, `DONE`)
- Dashboard metrics:
  - Total tasks
  - Tasks by status
  - Tasks per user
  - Overdue tasks

## Tech Stack

- Frontend: React + Vite + Axios
- Backend: Node.js + Express + Prisma
- Database: SQLite (local), Railway Postgres/DB supported in production
- Auth: JWT

## Project Structure

- `client` - React frontend
- `server` - Express API + Prisma schema

## Local Setup

### 1) Install dependencies

```bash
npm install --prefix server
npm install --prefix client
```

### 2) Configure environment variables

Create these files from examples:

- `server/.env` from `server/.env.example`
- `client/.env` from `client/.env.example`

### 3) Prepare database

```bash
npm run prisma:generate --prefix server
npm run prisma:push --prefix server
```

### 4) Run both apps

Terminal 1:

```bash
npm run server:dev
```

Terminal 2:

```bash
npm run client:dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

## API Highlights

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members`
- `DELETE /api/projects/:projectId/members/:memberId`
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `PATCH /api/projects/:projectId/tasks/:taskId/status`
- `GET /api/dashboard`

## Railway Deployment (Mandatory)

Deploy as **two services**:

1. Backend service from `server`
2. Frontend service from `client`

### Backend (Railway)

- Root directory: `server`
- Start command: `npm run start`
- Add env vars:
  - `PORT=4000`
  - `JWT_SECRET=<strong-secret>`
  - `DATABASE_URL=<railway-db-url or sqlite url>`
  - `CLIENT_ORIGIN=<frontend-domain>`
- Run migration command once:
  - `npm run prisma:generate`
  - `npm run prisma:migrate` (or `npm run prisma:push` based on your DB strategy)

### Frontend (Railway)

- Root directory: `client`
- Build command: `npm run build`
- Start command: `npm run preview -- --host 0.0.0.0 --port $PORT`
- Env var:
  - `VITE_API_URL=https://<your-backend-domain>/api`

## Submission Checklist

- [ ] Live application URL (public)
- [ ] GitHub repository URL
- [ ] README with setup + deployment steps
- [ ] 2-5 minute demo video

## Suggested Demo Flow (2-5 min)

1. Signup and login
2. Create project (you become Admin)
3. Add member by email
4. Create and assign tasks
5. Update task status
6. Show dashboard metrics and overdue count
