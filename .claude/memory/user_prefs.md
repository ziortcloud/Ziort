---
name: User Preferences
description: How the user communicates, what they expect, working style
type: user
---

# User Profile

## Communication Style
- Sends short, informal messages — sometimes typos or partial sentences
- "prism query" meant running SQL migrations in Supabase
- "change everywhere" means bulk find-and-replace across all files
- Does not need explanations of obvious things — get to the point
- Confirms satisfaction briefly: "perfect", "good"

## Working Style
- Works on Windows (VS Code extension), machine: sakth user
- Project root: `C:\Users\sakth\Downloads\Bala\stunning-winner\`
- Expects Claude to make all changes autonomously without asking for permission on each file
- Wants complete implementations, not stubs or placeholders
- Prefers being told what manual steps remain, not just what was done in code

## Expectations
- When asked to "change X to Y everywhere" — do it across ALL files including SQL, JSON, HTML, env files
- When asked to deploy — provide the exact step-by-step with real values filled in, not templates
- When something can't be done programmatically (e.g. VS Code holding a file lock) — explain clearly what to do manually and why
- Does not want to be asked clarifying questions for straightforward tasks

## Domain Knowledge
- Running a multi-product SaaS for Indian SMBs
- Understands product/subscription concepts, Supabase, Vercel deployment
- Does not need basic concepts explained (auth flows, CRUD, etc.)
