# Financial Project Management Platform

## Local Full-Stack Run

Install dependencies:

```powershell
pnpm install --registry=https://registry.npmmirror.com
```

This project uses Node.js 24 or newer because the local backend uses Node's built-in SQLite module.

Start backend and frontend:

```powershell
pnpm run dev:full
```

Backend defaults to `http://localhost:3001`.
Frontend defaults to the Vite URL printed in the terminal.
SQLite data is stored at `server/data/project-management.db`.

## Excel Import/Export

Open the app as an admin user and go to `数据导入导出`.

- Use `导出项目台账` to download the current project ledger.
- Use `选择 Excel 文件` to upload `.xlsx`.
- Review validation results.
- Click `确认导入` to write valid rows to SQLite.

## GitHub Pages

GitHub Pages can still host the static frontend. Durable shared data requires running the local backend and setting `VITE_API_BASE_URL` to that backend URL before building the frontend.
