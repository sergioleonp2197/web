# Frontend - Medium Clone (Angular)

Aplicacion Angular + TypeScript conectada al backend en `http://localhost:4000/api`.

Arquitectura:

- Standalone Components (sin `NgModule`)
- TailwindCSS integrado via PostCSS (`.postcssrc.json`)

## Scripts

- `npm start`: servidor de desarrollo
- `npm run build`: build de produccion
- `npm test`: pruebas unitarias

## Pantallas incluidas

- Home con feed y tags
- Login / Registro
- Perfil (articulos y favoritos)
- Editor (crear/editar articulo)
- Detalle de articulo con comentarios
- Settings de cuenta

## Config API

La URL base se define en `src/app/app.config.ts` via token `API_URL`.
