# DataShare — Project Brief

## Purpose

DataShare is a secure file transfer platform designed for freelancers and small businesses. It allows users to upload files and generate temporary, secure download links with expiration and optional password protection.

## Target Users

- **Registered users**: freelancers and small businesses who need to share files securely
- **Anonymous uploaders** (optional US07): anyone needing quick file sharing without an account
- **Download recipients**: anyone with a valid download link (no account required)

## MVP Scope (US01–US06)

| US | Feature | Priority |
|----|---------|----------|
| US01 | Upload with account — generate unique download link | MVP |
| US02 | Download via link — public access with optional password | MVP |
| US03 | User registration — email + password, JWT | MVP |
| US04 | User login — email + password → JWT | MVP |
| US05 | File history — list uploaded files with status | MVP |
| US06 | File deletion — physical deletion, irreversible | MVP |

## Advanced Features (US07–US10, optional)

| US | Feature | Priority |
|----|---------|----------|
| US07 | Anonymous upload — no account, no history | Optional |
| US08 | Tag management — organize files with tags | Optional |
| US09 | File password — protect downloads with a password | Optional |
| US10 | Auto-expiration — cron job purges expired files daily | Optional |

## Out of Scope

- Payment / billing
- Admin roles or admin dashboard
- Real-time collaboration
- Email confirmation on registration
- Multi-file upload in single request (MVP = one file at a time)
- File preview / online viewing

## Business Context

- **Timeline**: 4-week MVP for investor demo
- **Deployment**: Docker Compose (local demo)
- **Repository**: GitHub with conventional commits, branch protection on `main`
