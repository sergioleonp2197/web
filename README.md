# Medium Clone (Angular + Node + Sequelize)

Proyecto fullstack en `C:\Users\sergi\Desktop\web`.

- `frontend/`: Angular + TypeScript
- `backend/`: Node.js + Express + Sequelize

## Arranque rapido

```bash
npm run dev
```

Eso levanta backend + frontend al mismo tiempo.

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:4000`

## Notas

- El backend queda configurado por defecto con SQLite local (`backend/data/medium.sqlite`), sin necesidad de Postgres.
- Si quieres datos demo: `npm run seed`.
- Si prefieres Postgres, cambia `backend/.env` a `DB_DIALECT=postgres` y configura credenciales.
