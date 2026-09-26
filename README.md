# CommitFlow AI

> **Autonomous AI-Driven Git Development & Commit Engine**

CommitFlow AI is a full-stack platform designed to automate incremental software development, plan multi-day development architectures, and produce real Git commits directly into repositories.

---

## ⚡ Features

- 🤖 **Autonomous AI Planning & Execution Engine**: Breaks complex software projects into structured daily milestones and discrete tasks.
- 🌳 **Real Git Commits & Repository Management**: Directly creates conventional commits, generates functional source code, and maintains repository trees.
- 🚀 **GitHub Integration**: Direct push synchronization, remote connection management, and GitHub contribution activity attribution.
- 📊 **Real-time Live Telemetry & Log Console**: Server-sent events (SSE) live-streaming execution progress, unit test status, and agent actions.
- 🎨 **Modern Cyber-Slate Dashboard**: Built with React 18, Vite, Tailwind CSS, and Lucide icons.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router, Lucide React
- **Backend**: Node.js, Express, TypeScript, TSX, Simple-Git, Zod
- **Database & ORM**: SQLite, Prisma ORM
- **AI Engine**: Autonomous Planning Engine with Google Gemini support

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/) installed and available in PATH

### 2. Backend Setup
```bash
cd server
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```
The server will run on `http://localhost:5000`.

### 3. Frontend Setup
In a second terminal:
```bash
cd client
npm install
npm run dev
```
The client will run on `http://localhost:5173`.

---

## ⚙️ Configuration

Set your GitHub personal access token and commit identity in the **Settings** page:
- **Git Author Name**: e.g., `Vidhushaaa30`
- **Git Author Email**: e.g., `vidhushanagarajan30@gmail.com`
- **Execution Speed & Auto-push toggles**

---

## 📄 License
MIT License
