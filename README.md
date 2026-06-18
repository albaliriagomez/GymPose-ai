# GymPose-ai
Sistema de analisis de postura en ejercicios con inteligencia artificial. Aplicacion full-stack que permite analizar la tecnica de ejercicios (sentadillas, planchas, peso muerto, zancadas, etc.) mediante vision por computadora con MediaPipe, generar planes de entrenamiento y nutricion personalizados usando IA (Groq/Llama), y realizar seguimiento de progreso.
---
## Requisitos previos
Antes de comenzar, asegurate de tener instalado:
| Herramienta | Version recomendada | Descarga |
|---|---|---|
| **Python** | 3.10+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Cualquier version reciente | [git-scm.com](https://git-scm.com/) |
| **PostgreSQL** | 15+ (o cuenta en Supabase) | [postgresql.org](https://www.postgresql.org/download/) |
> **Nota para Windows:** Al instalar Python, marca la opcion **"Add Python to PATH"** para poder usar `python` y `pip` desde la terminal.
---
## Pasos para ejecutar el proyecto
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
Deberias ver `(venv)` al inicio de la linea en la terminal.
#### 2.2 Instalar dependencias
```bash
pip install -r requirements.txt
```
#### 2.3 Configurar variables de entorno
Crea el archivo `backend/.env` con el siguiente contenido:
```env
DATABASE_URL=postgresql://usuario:contrasena@host:5432/nombre_base_datos
SECRET_KEY=clave_secreta_segura_cambia_esto
API_HOST=localhost
API_PORT=8000
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GROQ_API_KEY=tu_api_key_de_groq
```
**Explicacion de cada variable:**
| Variable | Descripcion | Como obtenerla |
|---|---|---|
| `DATABASE_URL` | URL de conexion a PostgreSQL | Puedes usar [Supabase](https://supabase.com) (gratuito) o una base de datos local |
| `SECRET_KEY` | Clave para firmar tokens JWT | Generala con: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GROQ_API_KEY` | API Key de Groq para funciones de IA | Registrate gratis en [console.groq.com](https://console.groq.com) |
>  **Importante:** El archivo `.env` contiene credenciales sensibles. **No lo subas a GitHub** (ya esta incluido en `.gitignore`). Cada persona debe usar sus propias credenciales.
#### 2.4 Configurar la base de datos
**Opcion A  Usar Supabase (recomendado, gratuito):**
1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. En la seccion **Project Settings  Database**, copia el `Connection string` (URI)
4. Pegalo como valor de `DATABASE_URL` en tu `.env`
**Opcion B  Usar PostgreSQL local:**
1. Instala PostgreSQL desde [postgresql.org](https://www.postgresql.org/download/)
2. Crea una base de datos:
   ```bash
   createdb gympose
   ```
3. La `DATABASE_URL` seria algo como: `postgresql://postgres:tu_contrasena@localhost:5432/gympose`
#### 2.5 Inicializar las tablas de la base de datos
```bash
python init_db.py
```
Esto creara todas las tablas necesarias (`users`, `sessions`, `repetitions`, `nutrition_plans`, `notifications`, `meals`, `progress_plans`, `progress_logs`).
#### 2.6 Iniciar el servidor backend
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
El servidor se iniciara en `http://localhost:8000`. Puedes ver la documentacion interactiva de la API en:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
Para verificar que funciona, abre `http://localhost:8000/health`  deberia responder con `{"status": "ok"}`.
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
La aplicacion se abrira en `http://localhost:5173` (o el puerto que Vite asigne).
> Asegurate de que el backend este corriendo en `http://localhost:8000` para que el frontend pueda comunicarse con el.
---
### 4. Probar que todo funciona
1. El backend debe estar corriendo en `http://localhost:8000`
2. El frontend debe estar corriendo en `http://localhost:5173`
3. Abre `http://localhost:5173` en tu navegador
4. Registrate con un correo y contrasena
5. Explora las funcionalidades: Dashboard, Plan de entrenamiento, Nutricion, Progreso, etc.
---
## Estructura del proyecto
```
GymPose-ai/
 backend/                    # API REST con FastAPI (Python)
    main.py                 # Punto de entrada del servidor
    database.py             # Configuracion de SQLAlchemy
    init_db.py              # Script para crear tablas
    requirements.txt        # Dependencias de Python
    alembic.ini             # Configuracion de migraciones
    models/                 # Modelos SQLAlchemy (usuarios, sesiones, etc.)
    schemas/                # Esquemas Pydantic para validacion
    routers/                # Endpoints de la API
    services/               # Logica de negocio (postura, IA, etc.)
    ml/                     # Modelos de ML (MediaPipe)
    alembic/                # Migraciones de base de datos

 frontend/                   # Aplicacion React + Vite + TailwindCSS
    src/
       main.jsx            # Punto de entrada de React
       context/            # Contextos (AuthProvider)
       hooks/              # Custom hooks (camara, postura, etc.)
       services/           # Llamadas a la API (axios)
       components/         # Componentes reutilizables
       pages/              # Paginas de la aplicacion
    package.json            # Dependencias de Node.js
    vite.config.js          # Configuracion de Vite
    tailwind.config.js      # Configuracion de TailwindCSS
    index.html              # HTML principal

 ml/                         # Experimentos de Machine Learning
    train.py                # Script de entrenamiento (placeholder)
    notebooks/              # Jupyter notebooks
    data/                   # Datos para entrenamiento

 .gitignore                  # Archivos ignorados por Git
 README.md                   # Este archivo
```
---
## Comandos utiles
### Backend
| Comando | Descripcion |
|---|---|
| `uvicorn main:app --reload --host 0.0.0.0 --port 8000` | Iniciar servidor con recarga automatica |
| `python init_db.py` | Crear/actualizar tablas de la base de datos |
| `alembic upgrade head` | Ejecutar migraciones pendientes |
| `pip install -r requirements.txt` | Instalar/actualizar dependencias |
### Frontend
| Comando | Descripcion |
|---|---|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Compilar para produccion |
| `npm run preview` | Vista previa de la compilacion de produccion |
| `npm run lint` | Ejecutar ESLint para revisar el codigo |
---
## Funcionalidades principales
- **Analisis de postura**: Sube una imagen y el sistema detecta los puntos clave del cuerpo con MediaPipe, calcula angulos articulares y clasifica el ejercicio (sentadilla, plancha, peso muerto, zancada) con recomendaciones de mejora.
- **Planes de entrenamiento**: Genera 3 variantes (A/B/C) segun tu objetivo (hipertrofia, perdida de grasa, mantenimiento) con recomendaciones personalizadas por IA.
- **Nutricion con IA**: Registra comidas, estimacion automatica de macronutrientes desde descripciones, generacion de recetas, planes de comidas y resumenes diarios.
- **Seguimiento de progreso**: Registro de peso, repeticiones, duracion de sesiones. Generacion automatica de rutinas semanales y planes de comidas con IA.
- **Panel de entrenador**: Los entrenadores pueden gestionar clientes, ver su historial y obtener analisis de adherencia generados por IA.
- **Dashboard**: Estadisticas de sesiones, calorias, consistencia semanal, graficos de intensidad y resumen nutricional.
---
## Tecnologias utilizadas
### Backend
- **FastAPI**  Framework web para API REST
- **SQLAlchemy**  ORM para base de datos
- **PostgreSQL / Supabase**  Base de datos relacional
- **MediaPipe**  Vision por computadora para deteccion de pose
- **OpenCV + NumPy**  Procesamiento de imagenes
- **Groq API (Llama)**  Inteligencia artificial para planes y nutricion
- **JWT (python-jose)**  Autenticacion segura
- **Passlib + bcrypt**  Hash de contrasenas
### Frontend
- **React 19**  Interfaz de usuario
- **Vite**  Herramienta de build y desarrollo
- **TailwindCSS**  Estilos CSS utilitarios
- **React Router DOM**  Enrutamiento
- **Axios**  Cliente HTTP
- **Recharts**  Graficos interactivos
- **MediaPipe Tasks Vision**  Deteccion de pose en tiempo real (cliente)
---
## Solucion de problemas comunes
**Error: `pip no se reconoce como un comando interno o externo`**
- Asegurate de haber marcado "Add Python to PATH" al instalar Python. Tambien puedes usar `py -m pip install -r requirements.txt`
**Error: `No se puede conectar a la base de datos`**
- Verifica que `DATABASE_URL` en `backend/.env` sea correcta. Si usas Supabase, asegurate de que la IP desde la que te conectas este permitida en la configuracion de Supabase (Project Settings -> Database -> Network Restrictions).
**Error: `node no se reconoce como un comando`**
- Descarga e instala Node.js desde [nodejs.org](https://nodejs.org/) y reinicia la terminal.
**Error: `npm install` falla**
- Elimina `node_modules` y `package-lock.json` dentro de `frontend/` y vuelve a ejecutar `npm install`.
**Error: El frontend no se conecta con el backend**
Verifica que:
1. El backend este corriendo en `http://localhost:8000`
2. La variable `VITE_API_URL` en `frontend/.env` sea `http://localhost:8000`
3. No haya bloqueos de CORS (revisa la consola del navegador)
---
## Notas
- **Base de datos**: El proyecto usa Supabase (PostgreSQL en la nube). Si deseas probar sin configurar tu propia base de datos, solicita acceso al proyecto de Supabase existente o sigue los pasos en la seccion 2.4 para crear tu propia instancia.
- **API de Groq**: Las funciones de IA (planes de entrenamiento, nutricion, etc.) requieren una API Key de Groq. Puedes obtener una gratuita en [console.groq.com](https://console.groq.com). Sin esta clave, algunas funcionalidades no estaran disponibles.
- **Analisis de pose**: La funcionalidad de analisis de postura con MediaPipe funciona 100% offline (no requiere API keys externas).

---
## Training Module
### Contrato funcional
- El backend expone los ejercicios del plan desde `services/training_service.py`.
- Cada ejercicio incluye metadatos para que el frontend sepa como renderizarlo y como medirlo:
  - `name`
  - `sets`
  - `reps`
  - `rest_seconds`
  - `muscle_group`
  - `notes`
  - `mode`
- Regla recomendada para frontend:
  - `mode="live"`: ejercicio pensado para flujo con camara / deteccion
  - `mode="timer"`: ejercicio basado en tiempo
  - `mode="hold"`: sostan isometrico
  - si no hay `mode`, tratarlo como ejercicio manual por repeticiones

### Ejercicios soportados actualmente
El catalogo activo del backend fue reducido al conjunto de ejercicios que si se usaran en la app.

### MediaPipe / pose / live
- Sentadilla al Cajon
- Zancadas Alternas por Tiempo
- Estocadas Estaticas
- Flexiones en Pared o Rodillas
- Flexiones de Pecho
- Flexiones Diamante
- Remo Sentado con Banda
- Remo con Mancuerna Apoyado en Banco
- Remo con Banda o Mancuerna
- Flexiones Rusas de Antebrazos
- Curl de Biceps con Barra
- Curl de Biceps con Mancuernas
- Curl de Biceps en Polea
- Curl de Biceps Predicador
- Curl Martillo
- Curl Martillo con Cable
- Polichinelas
- Burpees
- Marcha en Sitio Rodillas Altas
- Mountain Climbers
- Saltos con Zancada Alterna

### Timer / hold / manual
- Hip Thrust con Barra
- Hip Thrust con Mancuerna
- Hip Thrust con Peso Corporal
- Hip Thrust en Suelo
- Elevaciones de Talones Sentado
- Plank
- Plancha Lateral
- Plank con Rotacion
- Plank en Rodillas

### Nota para frontend
- El frontend no deberia depender de un catalogo hardcodeado como fuente principal.
- La fuente de verdad debe ser la respuesta del backend en `days[].exercises[]`.
- Para decidir la experiencia:
  - usar `mode="live"` para flujo con camara
  - usar `mode="timer"` para contador regresivo
  - usar `mode="hold"` para sostener postura
  - usar reps manuales cuando el ejercicio no tenga deteccion automatica
- Si un ejercicio requiere imagen, conviene mapear por `exercise.name` exacto para evitar desalineaciones entre `Plan` y `Training`.
