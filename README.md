# Go-Bill · Personal Argentina

Herramienta para generar facturas de Personal Argentina con login por Google.

## Estructura de archivos

```
go-bill/
  index.html          ← App completa (una sola página)
  styles.css          ← Todos los estilos
  app.js              ← Toda la lógica (Firebase + facturación + UI)
  vercel.json         ← Config de Vercel
  assets/
    logo-gobill.png   ← Subís vos (logo de la app)
    logo-personal.png ← Subís vos (logo del encabezado de la factura)
```

---

## Paso 1 — Configurar Firebase

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com)
2. Creá (o abrí) tu proyecto
3. Ir a **Configuración del proyecto** (ícono ⚙️) → **Tus apps** → **Web** → registrá una app
4. Copiá el objeto `firebaseConfig` que te muestra Firebase
5. Abrí `app.js` y reemplazá los valores en las líneas marcadas con `REEMPLAZA_CON_...`:

```js
const firebaseConfig = {
  apiKey:            "tu-api-key-aqui",
  authDomain:        "tu-proyecto.firebaseapp.com",
  projectId:         "tu-proyecto",
  storageBucket:     "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

6. En Firebase → **Authentication** → **Sign-in methods** → habilitá **Google**

---

## Paso 2 — Subir logos (opcional)

Creá la carpeta `assets/` en el repo y poné ahí:

| Archivo | Dónde aparece |
|---|---|
| `assets/logo-gobill.png` | Navbar y pantalla de login |
| `assets/logo-personal.png` | Encabezado de la factura |

Si no los ponés, la app funciona igual (aparece el texto en lugar del logo).

---

## Paso 3 — Subir a GitHub

```bash
git init
git add .
git commit -m "Go-Bill v1"
git remote add origin https://github.com/TU_USUARIO/go-bill.git
git push -u origin main
```

---

## Paso 4 — Deploy en Vercel

1. Entrá a [vercel.com](https://vercel.com) → **Add New Project**
2. Importá tu repo de GitHub
3. En la configuración del proyecto:
   - **Framework**: `Other`
   - **Output Directory**: dejar vacío (o `/`)
4. Click en **Deploy**
5. Copiá la URL que te da Vercel (ej: `go-bill.vercel.app`)

---

## Paso 5 — Autorizar dominio en Firebase

1. Firebase → **Authentication** → **Settings** → **Authorized domains**
2. Agregá tu URL de Vercel (ej: `go-bill.vercel.app`)

¡Listo! Ya podés loguearte con Google y usar la herramienta.
