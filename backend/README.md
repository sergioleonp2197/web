# Backend - Medium Clone API

Stack: Node.js + Express + Sequelize + TypeScript.

## Modo por defecto

- SQLite local (`./data/medium.sqlite`)
- Sin configuracion adicional

## Scripts

- `npm run dev`: modo desarrollo
- `npm run build`: compilar TypeScript
- `npm run start`: ejecutar build
- `npm run seed`: insertar datos demo

## Configuracion

Archivo: `.env`.

Variables clave:

- `DB_DIALECT=sqlite` (default)
- `SQLITE_STORAGE=./data/medium.sqlite`
- `JWT_SECRET`
- `PORT`

Para Postgres:

- `DB_DIALECT=postgres`
- `DATABASE_URL` o `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS`
