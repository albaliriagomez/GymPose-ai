# GymPose-ai 🏋️
Sistema de análisis de postura en ejercicios con inteligencia artificial. Aplicación full-stack que permite analizar la técnica de ejercicios (sentadillas, planchas, peso muerto, zancadas, etc.) mediante visión por computadora con MediaPipe, generar planes de entrenamiento y nutrición personalizados usando IA (Groq/Llama), y realizar seguimiento de progreso.
---
## 📋 Requisitos previos
Antes de comenzar, asegúrate de tener instalado:
| Herramienta | Versión recomendada | Descarga |
|---|---|---|
| **Python** | 3.10+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Cualquier versión reciente | [git-scm.com](https://git-scm.com/) |
| **PostgreSQL** | 15+ (o cuenta en Supabase) | [postgresql.org](https://www.postgresql.org/download/) |
> **Nota para Windows:** Al instalar Python, marca la opción **"Add Python to PATH"** para poder usar `python` y `pip` desde la terminal.
---
## 🚀 Pasos para ejecutar el proyecto
### 1. Clonar el repositorio
Abre una terminal y ejecuta:
```bash
git clone https://github.com/albaliriagomez/GymPose-ai.git
cd GymPose-ai
```
---
### 2. Configurar el Backend (Python + FastAPI)
#### 2.1 Crear y activar entorno virtual
```bash
# Dentro de la carpeta GymPose-ai
cd backend
# Crear entorno virtual
python -m venv venv
# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS / Linux:
# source venv/bin/activate
```
Deberías ver `(venv)` al inicio de la línea en la terminal.
#### 2.2 Instalar dependencias
```bash
pip install -r requirements.txt
```
#### 2.3 Configurar variables de entorno
Crea el archivo `backend/.env` con el siguiente contenido:
```env
DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_base_datos
SECRET_KEY=clave_secreta_segura_cambia_esto
API_HOST=localhost
API_PORT=8000
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GROQ_API_KEY=tu_api_key_de_groq
```
**Explicación de cada variable:**
| Variable | Descripción | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | URL de conexión a PostgreSQL | Puedes usar [Supabase](https://supabase.com) (gratuito) o una base de datos local |
| `SECRET_KEY` | Clave para firmar tokens JWT | Genérala con: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GROQ_API_KEY` | API Key de Groq para funciones de IA | Regístrate gratis en [console.groq.com](https://console.groq.com) |
> ⚠️ **Importante:** El archivo `.env` contiene credenciales sensibles. **No lo subas a GitHub** (ya está incluido en `.gitignore`). Cada persona debe usar sus propias credenciales.
#### 2.4 Configurar la base de datos
**Opción A — Usar Supabase (recomendado, gratuito):**
1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. En la sección **Project Settings → Database**, copia el `Connection string` (URI)
4. Pégalo como valor de `DATABASE_URL` en tu `.env`
**Opción B — Usar PostgreSQL local:**
1. Instala PostgreSQL desde [postgresql.org](https://www.postgresql.org/download/)
2. Crea una base de datos:
   ```bash
   createdb gympose
   ```
3. La `DATABASE_URL` sería algo como: `postgresql://postgres:tu_contraseña@localhost:5432/gympose`
#### 2.5 Inicializar las tablas de la base de datos
```bash
python init_db.py
```
Esto creará todas las tablas necesarias (`users`, `sessions`, `repetitions`, `nutrition_plans`, `notifications`, `meals`, `progress_plans`, `progress_logs`).
#### 2.6 Iniciar el servidor backend
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
El servidor se iniciará en `http://localhost:8000`. Puedes ver la documentación interactiva de la API en:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
Para verificar que funciona, abre `http://localhost:8000/health` — debería responder con `{"status": "ok"}`.
---
### 3. Configurar el Frontend (React + Vite)
Abre **otra terminal** (diferente a la del backend) y ejecuta:
#### 3.1 Instalar dependencias
```bash
cd frontend
npm install
```
#### 3.2 Configurar variable de entorno
Crea el archivo `frontend/.env` (si no existe) con:
```env
VITE_API_URL=http://localhost:8000
```
#### 3.3 Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación se abrirá en `http://localhost:5173` (o el puerto que Vite asigne).
> Asegúrate de que el backend esté corriendo en `http://localhost:8000` para que el frontend pueda comunicarse con él.
---
### 4. Probar que todo funciona
1. El backend debe estar corriendo en `http://localhost:8000`
2. El frontend debe estar corriendo en `http://localhost:5173`
3. Abre `http://localhost:5173` en tu navegador
4. Regístrate con un correo y contraseña
5. Explora las funcionalidades: Dashboard, Plan de entrenamiento, Nutrición, Progreso, etc.
---
## 📁 Estructura del proyecto
```
GymPose-ai/
├── backend/                    # API REST con FastAPI (Python)
│   ├── main.py                 # Punto de entrada del servidor
│   ├── database.py             # Configuración de SQLAlchemy
│   ├── init_db.py              # Script para crear tablas
│   ├── requirements.txt        # Dependencias de Python
│   ├── alembic.ini             # Configuración de migraciones
│   ├── models/                 # Modelos SQLAlchemy (usuarios, sesiones, etc.)
│   ├── schemas/                # Esquemas Pydantic para validación
│   ├── routers/                # Endpoints de la API
│   ├── services/               # Lógica de negocio (postura, IA, etc.)
│   ├── ml/                     # Modelos de ML (MediaPipe)
│   └── alembic/                # Migraciones de base de datos
│
├── frontend/                   # Aplicación React + Vite + TailwindCSS
│   ├── src/
│   │   ├── main.jsx            # Punto de entrada de React
│   │   ├── context/            # Contextos (AuthProvider)
│   │   ├── hooks/              # Custom hooks (cámara, postura, etc.)
│   │   ├── services/           # Llamadas a la API (axios)
│   │   ├── components/         # Componentes reutilizables
│   │   └── pages/              # Páginas de la aplicación
│   ├── package.json            # Dependencias de Node.js
│   ├── vite.config.js          # Configuración de Vite
│   ├── tailwind.config.js      # Configuración de TailwindCSS
│   └── index.html              # HTML principal
│
├── ml/                         # Experimentos de Machine Learning
│   ├── train.py                # Script de entrenamiento (placeholder)
│   ├── notebooks/              # Jupyter notebooks
│   └── data/                   # Datos para entrenamiento
│
├── .gitignore                  # Archivos ignorados por Git
└── README.md                   # Este archivo
```
---
## 🔧 Comandos útiles
### Backend
| Comando | Descripción |
|---|---|
| `uvicorn main:app --reload --host 0.0.0.0 --port 8000` | Iniciar servidor con recarga automática |
| `python init_db.py` | Crear/actualizar tablas de la base de datos |
| `alembic upgrade head` | Ejecutar migraciones pendientes |
| `pip install -r requirements.txt` | Instalar/actualizar dependencias |
### Frontend
| Comando | Descripción |
|---|---|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Compilar para producción |
| `npm run preview` | Vista previa de la compilación de producción |
| `npm run lint` | Ejecutar ESLint para revisar el código |
---
## 🧪 Funcionalidades principales
- **Análisis de postura**: Sube una imagen y el sistema detecta los puntos clave del cuerpo con MediaPipe, calcula ángulos articulares y clasifica el ejercicio (sentadilla, plancha, peso muerto, zancada) con recomendaciones de mejora.
- **Planes de entrenamiento**: Genera 3 variantes (A/B/C) según tu objetivo (hipertrofia, pérdida de grasa, mantenimiento) con recomendaciones personalizadas por IA.
- **Nutrición con IA**: Registra comidas, estimación automática de macronutrientes desde descripciones, generación de recetas, planes de comidas y resúmenes diarios.
- **Seguimiento de progreso**: Registro de peso, repeticiones, duración de sesiones. Generación automática de rutinas semanales y planes de comidas con IA.
- **Panel de entrenador**: Los entrenadores pueden gestionar clientes, ver su historial y obtener análisis de adherencia generados por IA.
- **Dashboard**: Estadísticas de sesiones, calorías, consistencia semanal, gráficos de intensidad y resumen nutricional.
---
## 🛠️ Tecnologías utilizadas
### Backend
- **FastAPI** — Framework web para API REST
- **SQLAlchemy** — ORM para base de datos
- **PostgreSQL / Supabase** — Base de datos relacional
- **MediaPipe** — Visión por computadora para detección de pose
- **OpenCV + NumPy** — Procesamiento de imágenes
- **Groq API (Llama)** — Inteligencia artificial para planes y nutrición
- **JWT (python-jose)** — Autenticación segura
- **Passlib + bcrypt** — Hash de contraseñas
### Frontend
- **React 19** — Interfaz de usuario
- **Vite** — Herramienta de build y desarrollo
- **TailwindCSS** — Estilos CSS utilitarios
- **React Router DOM** — Enrutamiento
- **Axios** — Cliente HTTP
- **Recharts** — Gráficos interactivos
- **MediaPipe Tasks Vision** — Detección de pose en tiempo real (cliente)
---
## ⚠️ Solución de problemas comunes
**Error: `pip no se reconoce como un comando interno o externo`**
→ Asegúrate de haber marcado "Add Python to PATH" al instalar Python. También puedes usar `py -m pip install -r requirements.txt`
**Error: `No se puede conectar a la base de datos`**
→ Verifica que `DATABASE_URL` en `backend/.env` sea correcta. Si usas Supabase, asegúrate de que la IP desde la que te conectas esté permitida en la configuración de Supabase (Project Settings → Database → Network Restrictions).
**Error: `node no se reconoce como un comando`**
→ Descarga e instala Node.js desde [nodejs.org](https://nodejs.org/) y reinicia la terminal.
**Error: `npm install` falla**
→ Elimina `node_modules` y `package-lock.json` dentro de `frontend/` y vuelve a ejecutar `npm install`.
**Error: El frontend no se conecta con el backend**
→ Verifica que:
1. El backend esté corriendo en `http://localhost:8000`
2. La variable `VITE_API_URL` en `frontend/.env` sea `http://localhost:8000`
3. No haya bloqueos de CORS (revisa la consola del navegador)
---
## 📝 Notas
- **Base de datos**: El proyecto usa Supabase (PostgreSQL en la nube). Si deseas probar sin configurar tu propia base de datos, solicita acceso al proyecto de Supabase existente o sigue los pasos en la sección 2.4 para crear tu propia instancia.
- **API de Groq**: Las funciones de IA (planes de entrenamiento, nutrición, etc.) requieren una API Key de Groq. Puedes obtener una gratuita en [console.groq.com](https://console.groq.com). Sin esta clave, algunas funcionalidades no estarán disponibles.
- **Análisis de pose**: La funcionalidad de análisis de postura con MediaPipe funciona 100% offline (no requiere API keys externas).
