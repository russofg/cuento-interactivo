


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto y agrega tu API key de Google Gemini:
   ```bash
   VITE_GEMINI_API_KEY=tu_api_key_aqui
   ```
   
   **Importante:** Obtén tu API key en: https://aistudio.google.com/apikey

3. Run the app:
   ```bash
   npm run dev
   ```

## Configuración de Variables de Entorno

El proyecto usa Vite, por lo que las variables de entorno deben:
- Empezar con el prefijo `VITE_` para ser expuestas al cliente
- Estar en un archivo `.env` en la raíz del proyecto
- El archivo `.env` está en `.gitignore` y no se sube a GitHub por seguridad

## Desplegar en Netlify

### Pasos para desplegar:

1. **Sube tu código a GitHub** (si no lo has hecho ya):
   ```bash
   git add .
   git commit -m "Preparado para Netlify"
   git push
   ```

2. **Conecta tu repositorio con Netlify:**
   - Ve a [netlify.com](https://www.netlify.com) e inicia sesión
   - Click en "Add new site" → "Import an existing project"
   - Conecta con GitHub y selecciona este repositorio

3. **Configura las variables de entorno en Netlify:**
   - En el dashboard de Netlify, ve a: **Site settings** → **Environment variables**
   - Click en "Add a variable"
   - **Key:** `VITE_GEMINI_API_KEY` (⚠️ DEBE ser exactamente así, con VITE_ al inicio)
   - **Value:** Tu API key de Google Gemini (la misma que tienes en `.env`)
   - **Scope:** Selecciona "All scopes" o al menos "Production"
   - Click en "Save"

4. **⚠️ CRÍTICO: Hacer un nuevo deploy después de agregar la variable:**
   - Después de agregar la variable de entorno, **DEBES** hacer un nuevo deploy
   - Ve a **Deploys** en el dashboard de Netlify
   - Click en "Trigger deploy" → "Clear cache and deploy site"
   - O simplemente haz un nuevo commit y push a GitHub para trigger automático

5. **Configuración de Build (ya está en `netlify.toml`):**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Netlify detectará automáticamente el archivo `netlify.toml`

6. **Verificar que funciona:**
   - Abre la consola del navegador (F12) en tu sitio de Netlify
   - Si ves el error "VITE_GEMINI_API_KEY is missing", la variable no se está pasando correctamente
   - Verifica que el nombre de la variable sea exactamente `VITE_GEMINI_API_KEY` (con mayúsculas)

### 🔧 Solución de problemas:

**Si la variable no se detecta en Netlify:**

1. **Verifica el nombre de la variable:**
   - Debe ser exactamente: `VITE_GEMINI_API_KEY`
   - No debe tener espacios antes o después
   - Debe empezar con `VITE_` (esto es requerido por Vite)

2. **Haz un nuevo deploy:**
   - Las variables de entorno solo se inyectan durante el build
   - Si agregaste la variable después del deploy, necesitas hacer un nuevo build
   - Ve a Deploys → Trigger deploy → Clear cache and deploy site

3. **Verifica el scope de la variable:**
   - Asegúrate de que la variable esté disponible para "Production" o "All scopes"
   - Si solo está en "Development", no funcionará en producción

4. **Revisa los logs de build:**
   - Ve a Deploys → Click en el último deploy → Ver logs
   - Busca si hay errores relacionados con variables de entorno

### ⚠️ Importante:
- **NUNCA** subas tu `.env` a GitHub (ya está en `.gitignore`)
- La API key debe configurarse **SOLO** en el dashboard de Netlify como variable de entorno
- **SIEMPRE** haz un nuevo deploy después de agregar/modificar variables de entorno
