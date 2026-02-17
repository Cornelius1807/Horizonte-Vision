# 🛡️ Horizonte Vision

**Plataforma de Reportes de Riesgos de Seguridad con Análisis IA**

Horizonte Vision es una aplicación web fullstack mobile-first que permite a trabajadores reportar riesgos de seguridad mediante fotos, las cuales son analizadas automáticamente por un motor de IA basado en **coco-ssd (TensorFlow.js)** con un motor de reglas explicable. Supervisores y CSST gestionan acciones correctivas, visualizan KPIs y exportan datos.

---

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Estilos | TailwindCSS v4 + shadcn/ui |
| Animaciones | Framer Motion + Lottie (lottie-react) |
| Base de Datos | PostgreSQL (Vercel Postgres) + Prisma ORM |
| Autenticación | NextAuth.js v4 (JWT + Credentials) |
| Almacenamiento | Vercel Blob |
| IA | TensorFlow.js + coco-ssd (in-browser) |
| Gráficos | Recharts |
| Validación | Zod |

---

## 📋 Funcionalidades

- **Reporte de riesgos** — Wizard de 5 pasos: área → foto → análisis IA → confirmación → envío
- **Análisis IA** — Detección de objetos con coco-ssd, motor de reglas con explicaciones en español
- **Gestión de acciones** — Crear, asignar, cambiar estado, cerrar con evidencia fotográfica
- **Dashboard** — KPIs, gráficos por área/severidad/tendencia, exportación CSV
- **Admin** — Configuración de umbrales del motor IA, auditoría de cambios
- **Roles** — WORKER, SUPERVISOR, CSST, ADMIN con permisos diferenciados

---

## 🏗️ Instalación Local

### Prerequisitos

- Node.js ≥ 18
- pnpm ≥ 9
- PostgreSQL (local o remoto)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Cornelius1807/Horizonte-Vision.git
cd Horizonte-Vision
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

Variables requeridas:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/horizonte_vision"
DIRECT_URL="postgresql://user:password@localhost:5432/horizonte_vision"

# NextAuth
NEXTAUTH_SECRET="generar-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Admin seed
ADMIN_EMAIL="admin@horizontevision.pe"
ADMIN_PASSWORD="Hv$ecur3!Adm1n2026"
```

Para generar `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Crear base de datos y ejecutar migraciones

```bash
npx prisma migrate dev --name init
```

### 5. Poblar datos iniciales (seed)

```bash
npx prisma db seed
```

### 6. Iniciar servidor de desarrollo

```bash
pnpm dev
```

La aplicación estará en **http://localhost:3000**

---

## 🔐 Credenciales de Demo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@horizontevision.pe | Hv$ecur3!Adm1n2026 |
| Trabajador | carlos.mendoza@ejemplo.pe | Trabajador123! |
| Supervisor | maria.lopez@ejemplo.pe | Supervisor123! |
| CSST | jorge.ramirez@ejemplo.pe | Csst123! |

---

## ☁️ Despliegue en Vercel

### 1. Crear proyecto en Vercel

- Importar el repo de GitHub
- Framework preset: **Next.js**

### 2. Configurar Vercel Postgres

- En Vercel, ir a **Storage** → **Create Database** → **Postgres**
- Conectar a tu proyecto — las variables `DATABASE_URL` y `DIRECT_URL` se añaden automáticamente

### 3. Configurar Vercel Blob

- En Vercel, ir a **Storage** → **Create Store** → **Blob**
- Conectar al proyecto — se añade `BLOB_READ_WRITE_TOKEN`

### 4. Variables de entorno

En **Settings → Environment Variables**, agregar:

| Variable | Valor |
|----------|-------|
| `NEXTAUTH_SECRET` | (resultado de `openssl rand -base64 32`) |
| `ADMIN_EMAIL` | admin@horizontevision.pe |
| `ADMIN_PASSWORD` | Hv$ecur3!Adm1n2026 |

### 5. Build y Deploy

Vercel detectará automáticamente Next.js. El build command es:

```
pnpm build
```

Y `postinstall` ejecuta `prisma generate` automáticamente.

### 6. Ejecutar migraciones en producción

```bash
npx prisma migrate deploy
```

### 7. Seed (una vez)

```bash
npx prisma db seed
```

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/                  # API Routes
│   │   ├── auth/             # NextAuth
│   │   ├── reports/          # CRUD reportes
│   │   ├── actions/          # CRUD acciones
│   │   ├── metrics/          # KPIs y tendencias
│   │   ├── admin/            # Reglas IA, auditoría, CSV
│   │   ├── blob/             # Upload de archivos
│   │   ├── areas/            # Áreas
│   │   ├── risk-types/       # Tipos de riesgo
│   │   └── users/            # Usuarios
│   ├── login/                # Página de login
│   ├── report/               # Wizard de reportes (5 pasos)
│   ├── actions/              # Gestión de acciones
│   ├── dashboard/            # Dashboard con KPIs
│   ├── admin/rules/          # Config del motor IA
│   ├── layout.tsx            # Layout raíz
│   └── page.tsx              # Landing page
├── components/
│   ├── ui/                   # Componentes base (shadcn/ui)
│   ├── app-layout.tsx        # Layout con navegación
│   ├── providers.tsx         # SessionProvider
│   ├── lottie-animation.tsx  # Wrapper Lottie
│   └── empty-state.tsx       # Estado vacío
├── lib/
│   ├── auth.ts               # Configuración NextAuth
│   ├── prisma.ts             # Cliente Prisma singleton
│   ├── rules-engine.ts       # Motor IA + reglas
│   ├── validations.ts        # Schemas Zod
│   ├── audit.ts              # Helper auditoría
│   └── utils.ts              # Utilidades
├── types/
│   └── next-auth.d.ts        # Tipos NextAuth
└── middleware.ts              # Protección de rutas
prisma/
├── schema.prisma             # Modelos de la BD
└── seed.ts                   # Datos iniciales
```

---

## 🧠 Motor de IA

El motor de IA funciona **100% en el navegador** usando TensorFlow.js y el modelo coco-ssd:

1. El usuario captura o sube una foto
2. coco-ssd detecta objetos en la imagen
3. El motor de reglas analiza las detecciones:
   - **Regla A (Obstrucción)**: ≥2 objetos clasificados como obstáculos
   - **Regla B (Orden y Limpieza)**: ≥3 objetos totales o ≥3 clases diferentes
4. Se calcula severidad basada en umbrales configurables
5. Se genera explicación en español para el usuario
6. El usuario confirma o ajusta la sugerencia antes de enviar

---

## 📄 Licencia

MIT © Horizonte Vision
