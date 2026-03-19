# Medium Clone Fullstack

Aplicacion fullstack inspirada en Medium, construida como monorepo con `Angular 20` en el frontend y `Node.js + Express + Sequelize` en el backend. El proyecto no se limita a renderizar pantallas: implementa autenticacion JWT, persistencia relacional, validacion de payloads, uploads de imagenes, perfiles, follows, favoritos, comentarios enriquecidos y manejo de borradores/publicacion de articulos.

## Resumen para reclutadores

Este proyecto demuestra capacidad para trabajar de extremo a extremo sobre una aplicacion real:

- diseno de SPA moderna con Angular standalone
- construccion de API REST tipada y protegida con JWT
- modelado relacional con Sequelize sobre SQLite o PostgreSQL
- validacion fuerte de entradas con Zod
- manejo de errores consistente para frontend y backend
- integracion de uploads, filtros, busqueda, paginacion y estados de publicacion

No es solo un CRUD. Tiene decisiones de arquitectura que muestran criterio tecnico:

- separacion clara entre UI, capa HTTP, autenticacion y modelo de dominio
- serializacion explicita de respuestas para no exponer el ORM directamente
- middlewares de seguridad y observabilidad (`helmet`, `cors`, `compression`, rate limit, `x-request-id`)
- compatibilidad con contenido legacy gracias a parseo/serializacion defensiva de articulos y comentarios

## Demo funcional que cubre

- registro e inicio de sesion
- persistencia de sesion con `localStorage` y recuperacion de usuario con `/auth/me`
- creacion, edicion y eliminacion de articulos
- articulos en estado `published` o `draft`
- soporte de cuerpo en `plain` o `markdown`
- calculo/normalizacion de tiempo estimado de lectura
- tags, busqueda por texto, ordenamiento y paginacion
- perfiles publicos y sistema de follow/unfollow
- favoritos para articulos
- comentarios con texto, imagen y likes
- upload de imagenes para articulo, comentario y avatar
- base de datos local con SQLite lista para arrancar sin infraestructura externa

## Stack tecnico

| Capa | Tecnologias |
| --- | --- |
| Frontend | Angular 20, TypeScript, RxJS, Reactive Forms, Angular Router |
| Backend | Node.js, Express 4, TypeScript, Sequelize 6 |
| Seguridad | JWT, bcryptjs, helmet, cors, express-rate-limit |
| Validacion | Zod |
| Uploads | Multer |
| Base de datos | SQLite por defecto, PostgreSQL opcional |
| Tooling | concurrently, nodemon, tsx, Angular CLI |

## Arquitectura general

```text
frontend (Angular SPA)
  -> services tipados
  -> interceptor JWT
  -> API REST /api

backend (Express)
  -> middlewares de seguridad / auth / errores
  -> controllers
  -> serializers
  -> Sequelize models
  -> SQLite o PostgreSQL
```

### Monorepo

La raiz del proyecto orquesta ambos lados:

- `frontend/`: SPA Angular
- `backend/`: API REST + persistencia
- `npm run dev`: levanta ambos procesos en paralelo
- `npm run build`: compila backend y frontend

Esto facilita correr el sistema completo en local sin depender de Docker ni de servicios externos.

## Frontend: que esta bien resuelto

### 1. Angular moderno sin `NgModule`

La aplicacion usa componentes standalone y configuracion centralizada en `app.config.ts`. Eso reduce boilerplate y hace mas directo el wiring de router, HTTP e inyeccion de dependencias.

Puntos tecnicos relevantes:

- `provideRouter(routes)` para rutas de la SPA
- `provideHttpClient(withInterceptors([authInterceptor]))` para centralizar autenticacion
- token de DI `API_URL` para desacoplar la URL base del backend
- `provideZoneChangeDetection({ eventCoalescing: true })` como ajuste de rendimiento

### 2. Capa de servicios HTTP tipada

El frontend no consume endpoints de forma ad hoc desde cada componente. La comunicacion esta concentrada en servicios:

- `AuthService`
- `ArticleService`
- `ProfileService`

Esto deja tres beneficios claros:

1. Los componentes trabajan con modelos tipados, no con JSON arbitrario.
2. La reutilizacion del acceso a datos es inmediata.
3. La logica de autenticacion y session management no queda duplicada.

Ejemplo conceptual:

```ts
login(payload) -> POST /auth/login
  -> guarda token
  -> actualiza BehaviorSubject<User | null>
  -> header y paginas protegidas reaccionan al nuevo estado
```

### 3. Sesion persistente y control de acceso

La autenticacion del lado cliente esta bien estructurada:

- `AuthService` mantiene el usuario actual en un `BehaviorSubject`
- el token JWT se persiste en `localStorage`
- `authInterceptor` agrega `Authorization: Bearer <token>` a cada request
- si el backend devuelve `401`, el interceptor limpia sesion y redirige a `/login`
- `authGuard` protege rutas como `/editor` y `/settings`

Eso demuestra manejo real de sesion, no solo una simulacion visual.

### 4. Formularios reactivos y UX de authoring

Las pantallas principales usan `ReactiveFormsModule`, validaciones y manejo de estado:

- `editor-page`: crear/editar articulo, snippets rapidos, emojis, preview de imagenes, estado draft/publicado
- `settings-page`: actualizar perfil y avatar
- `article-page`: publicar comentarios, editar comentarios y adjuntar imagenes

Ejemplo de payload enviado al crear un articulo:

```json
{
  "title": "Escalando una SPA con Angular",
  "description": "Patrones para ordenar una aplicacion mediana",
  "body": "# Introduccion\nSeparar dominio, UI y acceso a datos...",
  "coverImage": "https://mi-cdn.dev/angular-cover.jpg",
  "imageList": [
    "https://mi-cdn.dev/angular-cover.jpg",
    "https://mi-cdn.dev/diagram-1.jpg"
  ],
  "tagList": ["angular", "arquitectura", "frontend"],
  "allowComments": true,
  "contentFormat": "markdown",
  "status": "draft",
  "readingTimeMinutes": 6
}
```

### 5. Limpieza de suscripciones

Los componentes usan `takeUntilDestroyed` con `DestroyRef`. Eso evita fugas de memoria y muestra conocimiento de patrones modernos de Angular/RxJS.

## Backend: que esta bien resuelto

### 1. API REST estructurada por dominios

La API esta separada por rutas y controladores:

- `/api/auth`
- `/api/user`
- `/api/profiles`
- `/api/articles`
- `/api/tags`
- `/api/uploads`
- `/api/health`

Esto da una organizacion mantenible y facil de escalar.

### 2. Seguridad y hardening basico

El `app.ts` del backend no es minimo: incluye varias capas utiles para un entorno real.

- `helmet` para headers de seguridad
- `compression` para reducir payloads
- `cors` configurable por variable de entorno
- `express-rate-limit` separado para API general y auth
- `express.json({ limit: "1mb" })`
- `x-request-id` por request para trazabilidad
- logging simple con metodo, URL, status, duracion y request id

Ejemplo de log generado por request:

```text
[2026-03-19T21:35:19.000Z] GET /api/articles 200 14ms reqId=3e9a...
```

### 3. Validacion de entradas con Zod

Los controladores no confian en `req.body`. Cada flujo relevante parsea y valida la entrada:

- registro/login
- actualizacion de usuario
- creacion y edicion de articulos
- comentarios
- query params de listados

Eso reduce bugs, endurece la API y simplifica los mensajes de error para el frontend.

Ejemplo real de filtros soportados en articulos:

```http
GET /api/articles?tag=angular&search=arquitectura&sort=popular&status=published&limit=8&offset=0
```

### 4. Autenticacion JWT correctamente desacoplada

La autenticacion se resuelve con middlewares:

- `optionalAuth`: si llega token valido, adjunta `req.authUser`; si no, deja continuar
- `requireAuth`: bloquea la request con `401` si no hay token valido

Esto permite endpoints mixtos como:

- leer articulos publicos sin login
- saber si el usuario autenticado ya dio favorito
- restringir edicion, borrado y uploads a usuarios autenticados

### 5. Serializacion explicita del dominio

Una buena decision del backend es no retornar instancias crudas de Sequelize. En lugar de eso, usa funciones como:

- `serializeUser`
- `buildProfile`
- `buildArticle`
- `buildComment`

Beneficios:

- el frontend recibe una forma estable y pensada para UI
- se encapsula la logica derivada (`favorited`, `following`, `likesCount`, avatar por defecto)
- se evita acoplar la API a detalles internos del ORM

### 6. Manejo de errores consistente

El middleware global traduce distintos tipos de errores a respuestas uniformes:

- `ApiError`
- `ZodError`
- `UniqueConstraintError`
- `ForeignKeyConstraintError`
- `ValidationError`
- `MulterError`

Ejemplo de respuesta de error:

```json
{
  "error": "INVALID_INPUT",
  "message": "Invalid request payload",
  "details": {
    "fieldErrors": {
      "email": ["Invalid email"]
    }
  },
  "requestId": "0b1d...",
  "timestamp": "2026-03-19T21:35:19.000Z"
}
```

## Modelado de datos

### Entidades principales

- `User`
- `Article`
- `Comment`
- `Tag`
- `Follow`
- `Favorite`
- `CommentFavorite`
- `ArticleTag`

### Relaciones

```text
User 1:N Article
User 1:N Comment
User N:M User           (follow)
User N:M Article        (favorite)
User N:M Comment        (comment like)
Article 1:N Comment
Article N:M Tag
```

### Decisiones tecnicas interesantes

#### Articulos con metadata serializada

El campo `body` del articulo no guarda solamente texto plano. La aplicacion serializa informacion adicional dentro del mismo campo para mantener compatibilidad con contenido legacy y ampliar capacidades sin romper lectura previa.

Ejemplo de como se persiste internamente:

```json
{
  "content": "# Hola mundo",
  "allowComments": true,
  "contentFormat": "markdown",
  "status": "draft",
  "readingTimeMinutes": 3
}
```

Esto permite:

- soporte de drafts/publicacion
- activar o desactivar comentarios por articulo
- distinguir `plain` vs `markdown`
- calcular o respetar tiempo de lectura

La funcion `parseArticleBody` mantiene backward compatibility: si encuentra texto plano legacy, aun puede leerlo.

#### Comentarios enriquecidos

Los comentarios siguen una idea similar. El campo `body` puede serializar:

```json
{
  "body": "Buen articulo. Me gusto la explicacion del interceptor.",
  "imageUrl": "http://localhost:4000/uploads/comentario.png"
}
```

Resultado: el sistema soporta comentarios con texto, imagen o ambos, sin introducir una tabla extra solo para attachments.

## Endpoints importantes

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| `POST` | `/api/auth/register` | registro de usuario |
| `POST` | `/api/auth/login` | login y emision de JWT |
| `GET` | `/api/auth/me` | recuperar sesion actual |
| `PUT` | `/api/user` | actualizar perfil |
| `GET` | `/api/articles` | listado con filtros |
| `POST` | `/api/articles` | crear articulo |
| `PUT` | `/api/articles/:slug` | editar articulo |
| `DELETE` | `/api/articles/:slug` | eliminar articulo |
| `POST` | `/api/articles/:slug/favorite` | dar favorito |
| `GET` | `/api/articles/:slug/comments` | listar comentarios |
| `POST` | `/api/articles/:slug/comments` | comentar |
| `POST` | `/api/uploads/image` | subir imagen |
| `POST` | `/api/uploads/avatar` | subir avatar |

## Ejemplos tecnicos para mostrar en entrevista

### Flujo 1: login y sesion

1. El usuario hace login desde Angular.
2. `AuthService.login()` llama `POST /api/auth/login`.
3. El backend valida credenciales con `bcrypt`.
4. Se emite un JWT con el `userId`.
5. Angular guarda el token y actualiza el `BehaviorSubject`.
6. El interceptor adjunta el token a requests futuras.
7. Al recargar la SPA, `loadCurrentUser()` consulta `/auth/me` y reconstruye la sesion.

Esto demuestra dominio de auth state en frontend y auth middleware en backend.

### Flujo 2: creacion de articulo con draft y markdown

1. El editor Angular arma un `ArticlePayload`.
2. El backend valida con Zod.
3. `serializeArticleBody()` empaqueta contenido y metadata.
4. Sequelize persiste articulo, slug, imagenes y relaciones con tags.
5. `buildArticle()` devuelve una respuesta pensada para la UI.

El valor para reclutamiento aqui es que hay logica de producto, no solo persistencia plana.

### Flujo 3: comentario con imagen

1. El usuario sube una imagen con `FormData`.
2. `multer` valida MIME type y tamano maximo de 5 MB.
3. El backend devuelve URL publica del asset.
4. Angular usa esa URL al publicar el comentario.
5. El comentario se guarda como JSON serializado y luego se normaliza en la respuesta.

Esto demuestra integracion entre frontend, backend, filesystem y modelo de dominio.

## Estructura del repositorio

```text
.
+-- backend/
|   +-- src/
|   |   +-- config/
|   |   +-- controllers/
|   |   +-- middleware/
|   |   +-- models/
|   |   +-- routes/
|   |   `-- utils/
|   `-- data/medium.sqlite
+-- frontend/
|   +-- src/app/core/
|   +-- src/app/pages/
|   +-- src/app/shared/
|   `-- src/environments/
`-- package.json
```

## Como ejecutar

### Requisitos

- Node.js 20+ recomendado
- npm

### Instalacion

```bash
npm run install:all
```

### Desarrollo

```bash
npm run dev
```

Servicios disponibles:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:4000`
- API: `http://localhost:4000/api`

### Datos demo

```bash
npm run seed
```

Usuarios de ejemplo creados por el seed:

- `maria@example.com` / `maria1234`
- `david@example.com` / `david1234`

### Build de produccion

```bash
npm run build
```

## Configuracion

El backend arranca por defecto con SQLite local en `backend/data/medium.sqlite`.

Variables relevantes:

- `PORT`
- `FRONTEND_ORIGIN`
- `JWT_SECRET`
- `DB_DIALECT=sqlite|postgres`
- `SQLITE_STORAGE`
- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `DB_LOGGING`
- `DB_SYNC_ALTER`

Si se quiere usar PostgreSQL, basta con configurar `DB_DIALECT=postgres` y definir las credenciales correspondientes.

## Que comunica bien este proyecto sobre el perfil del desarrollador

Para una revision tecnica o una entrevista, este repositorio evidencia:

- capacidad de construir una SPA completa y conectarla a una API propia
- criterio de separacion de responsabilidades
- manejo de autenticacion real con sesiones persistentes
- modelado de relaciones mas alla del CRUD basico
- validacion, seguridad y tratamiento consistente de errores
- entendimiento practico de experiencia de autor: drafts, tags, media, comentarios, perfiles

## Mejoras razonables para una siguiente iteracion

- tests unitarios y de integracion para servicios/controladores
- refresh tokens o expiracion mas sofisticada de sesion
- almacenamiento de imagenes en S3/Cloudinary en vez de filesystem local
- renderizado seguro de markdown
- paginacion y feed personalizado tambien desde la UI principal
- CI/CD y analisis estatico automatizado

## Estado verificado

El proyecto fue validado localmente con:

```bash
npm run build
```

Compilacion correcta de:

- backend TypeScript
- frontend Angular
