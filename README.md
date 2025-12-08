


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
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** Tu API key de Google Gemini (la misma que tienes en `.env`)
   - Click en "Save"

4. **Configuración de Build (ya está en `netlify.toml`):**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Netlify detectará automáticamente el archivo `netlify.toml`

5. **Deploy:**
   - Netlify construirá y desplegará automáticamente
   - Cada vez que hagas `git push`, Netlify hará un nuevo deploy

### ⚠️ Importante:
- **NUNCA** subas tu `.env` a GitHub (ya está en `.gitignore`)
- La API key debe configurarse **SOLO** en el dashboard de Netlify como variable de entorno
- Después de agregar la variable de entorno, Netlify hará un rebuild automático
