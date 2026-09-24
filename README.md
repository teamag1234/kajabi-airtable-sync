# 🔄 Kajabi-Airtable Sync

Sistema automático de sincronización de pagos desde Kajabi a Airtable con detección de cuotas fallidas, emails automáticos y **secuencia de renovación de acceso** para alumnos.

## ✨ Características

- ✅ Sincronización automática diaria de pagos desde Kajabi
- ✅ Registro automático de alumnos y pagos en Airtable
- ✅ Detección de pagos fallidos
- ✅ Emails automáticos de recordatorio para cuotas pendientes
- ✅ Secuencia automática de renovación (7 emails, ventana de 7 días tras el fin de acceso)
- ✅ Dashboard web para control manual
- ✅ Cron jobs automáticos en Vercel
- ✅ Historial completo de pagos y estados

## 🚀 Deployment en Vercel

1. Ve a https://vercel.com
2. Importa este repositorio
3. Añade las variables de entorno en Settings (ver `.env.example`)
4. Deploy automático

## 📋 Variables de Entorno

```env
KAJABI_CLIENT_ID=tu_client_id
KAJABI_CLIENT_SECRET=tu_client_secret
AIRTABLE_TOKEN=tu_token
AIRTABLE_BASE_ID=appN0vx5OPGi81zB5   # base "CURSOS ONLINE"
AIRTABLE_RENEWALS_TABLE=Renovaciones
CRON_SECRET=un_secreto_largo

# Email: servicio de nodemailer (gmail) o SMTP genérico con EMAIL_HOST (Brevo, Resend, Postmark...)
EMAIL_SERVICE=gmail
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=tu_email
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=hola@agacademyaptis.com
EMAIL_FROM_NAME=Jesu · AG Academy
EMAIL_REPLY_TO=
EMAIL_SIGNATURE=Jesu
```

Si `CRON_SECRET` está definido, todos los endpoints exigen `Authorization: Bearer <CRON_SECRET>` (Vercel Cron lo envía automáticamente).

**Modo prueba**: con `RENEWAL_TEST_TO=correo@vuestro.com` la secuencia envía todos los emails del día a esa dirección (el alumno real va en el asunto) y no anota nada en Airtable. Al quitar la variable, los mismos emails salen a los alumnos.

## 📞 Endpoints

- `GET /api/health` - Health check
- `GET /api/sync-kajabi` - Sincronización manual
- `GET /api/check-failed-payments` - Verificación de pagos
- `GET /api/renewal-import` - Importa accesos desde Kajabi a la tabla Renovaciones (incremental, últimos 3 días)
  - `?dry=1` simula; `?desde=2025-08-01` revisa compras creadas desde esa fecha; `?completo=1` recorre por fecha de creación en vez de actualización
- `GET /api/renewal-sequence` - Proceso diario de la secuencia de renovación
  - `?dry=1` simula sin enviar ni escribir; `?dry=1&hoy=2026-10-01` simula otro día
- `POST /api/renewal-enroll` - Alta de alumnos (uno o array)
- `PATCH /api/renewal-enroll` - Marcar aprobado / pausar / aplicar renovación
- `GET /api/renewal-summary` - Recuento por estado
- `POST /api/test-nivel` - Leads del test de nivel de la web (público, lo llama el widget; ver abajo)
- `GET /api/renewal-aprobado?t=<token>` - Página pública del botón "Ya lo he conseguido" (marca Aprobado y pide reseña en Google o WhatsApp a Jesu)
- `GET /api/renewal-click?t=<token>&o=<oferta>&p=<paso>` - Enlace de las ofertas del email: registra el clic (Clics, Último clic, Oferta clicada, Paso del clic) y redirige al checkout con UTMs
- `GET /` - Dashboard

## 🔄 Cron Jobs (UTC)

- **2:00**: Sincronización automática de pagos
- **10:00**: Verificación de pagos fallidos
- **6:30**: importación incremental de accesos desde Kajabi
- **7:00** (9:00 hora peninsular en verano, 8:00 en invierno): secuencia de renovación

## 🔁 Sistema de renovación

### Cómo funciona

1. Cada alumno con acceso limitado tiene una fila en la tabla **Renovaciones** de Airtable (base CURSOS ONLINE) con su email, curso y fecha de inicio.
2. El sistema calcula la **fecha de fin** (inicio + meses del curso) y la **fecha límite de renovación** (fin + 7 días).
3. Cada día a las 9:00 el cron revisa la tabla y envía como máximo un email por alumno según dónde esté respecto a su fecha de fin:

| Paso | Día | Email |
|------|-----|-------|
| 1 | -7 | Te queda una semana de acceso |
| 2 | -3 | Quedan 3 días |
| 3 | -1 | Mañana se cierra tu acceso |
| 4 | 0 | Hoy termina tu acceso, tienes 7 días para renovar |
| 5 | +3 | Te quedan 4 días para renovar |
| 6 | +6 | Mañana se cierra la renovación |
| 7 | +7 | Último día |

4. Pasado el día +7 la fila pasa a **Cerrado** y no recibe más emails.
5. Si un día el cron no se ejecuta, al siguiente solo se envía el email más reciente pendiente, nunca los atrasados.
6. Cada email ofrece las renovaciones de pago único del curso del alumno (precio y checkout de Kajabi, definidos en `lib/renewal/courses.js`). En el checkout se puede fraccionar en 3 con Klarna. Si el curso no tiene renovación de pago único, el email pide responder para gestionarla.

### Cómo entra un alumno

- **Automático desde Kajabi** (la vía principal): cada día a las 6:30 UTC el endpoint `/api/renewal-import` recorre las compras actualizadas en Kajabi en los últimos 3 días. Para cada compra cuya oferta esté en el catálogo (o sea una renovación de un curso del catálogo) toma la **fecha de fin de acceso que fija Kajabi** (`deactivated_at`, que es la caducidad programada) y crea o actualiza la fila del alumno. Si un alumno tiene varias compras del mismo curso se queda la que termina más tarde. Las suscripciones activas y las ofertas fuera del catálogo se ignoran.
  - Carga inicial: `node scripts/import-kajabi.mjs --dry` (simula) y `node scripts/import-kajabi.mjs` (importa los últimos 14 meses de compras y marca Aprobado a quien conste como aprobado en CURSOS KAJABI).
- **Sync de pagos**: el sync antiguo también reconoce la oferta comprada y da de alta al alumno, pero el importador de arriba es más fiable porque usa la caducidad real.
- **Por API** (n8n, Zapier, webhook de Kajabi):
  ```http
  POST /api/renewal-enroll
  Authorization: Bearer <CRON_SECRET>
  Content-Type: application/json

  { "email": "alumno@mail.com", "nombre": "María López", "curso": "aptis-6m", "fecha_inicio": "2026-09-01" }
  ```
  `curso` admite la key del catálogo, el nombre del curso o el nombre de la oferta de Kajabi. Si el curso no está en el catálogo, añade `"meses": 4` (o `"dias": 50`). Se puede enviar un array para altas masivas.
- **A mano en Airtable**: crea la fila con Email, Nombre, Curso y Fecha inicio. El cron completa el resto de fechas en su siguiente pasada.

### Quién sale de la secuencia

- **Aprobado** (casilla): el alumno ya tiene el título. Cada email lleva un botón "Ya lo he conseguido" con un enlace firmado que marca la casilla al pulsarlo y pide una reseña. También por API: `PATCH /api/renewal-enroll` con `{ "email": "...", "aprobado": true }`.
- **Pausar** (casilla): no enviar nada temporalmente.
- **Renovación**: si el sync detecta el pago de una oferta de renovación (o llega `PATCH` con `{ "email": "...", "renovar": { "meses": 6 } }`), se amplía la fecha de fin desde el fin anterior y la secuencia se reinicia para el nuevo periodo.

### Atribución de renovaciones al email

Los botones de oferta del email pasan por `/api/renewal-click`, que anota el clic en la fila del alumno y redirige al checkout de Kajabi con `utm_source=email`, `utm_medium=renovacion`, `utm_campaign=renovacion-paso-N` y `utm_content=<oferta>`. Cuando el importador detecta después una compra de renovación de ese alumno, amplía su fila (conserva el curso, suma **Nº renovaciones**, guarda **Última renovación**, **Oferta renovación**, **Importe renovación** y **Paso al renovar**) y marca **Renovado desde email** solo si hubo un clic en el email en los 30 días anteriores a la compra. Las renovaciones que llegan por otros caminos (enlaces que mandan los teachers, WhatsApp) quedan registradas pero sin esa marca.

### Tabla Renovaciones en Airtable

La tabla `Renovaciones` ya existe en la base **CURSOS ONLINE** (`appN0vx5OPGi81zB5`, tabla `tblAgRrCPuDelcSqu`). Si hay que recrearla en otra base, estos son sus campos:

| Campo | Tipo |
|-------|------|
| Email | Texto |
| Nombre | Texto |
| Curso | Texto |
| Curso key | Texto |
| Fecha inicio | Fecha |
| Meses acceso | Número |
| Días acceso | Número (solo cursos con acceso en días, como Level Express) |
| Fecha fin | Fecha |
| Fecha límite renovación | Fecha |
| Estado | Selección única (Activo, En secuencia, Cerrado, Aprobado, Pausado) |
| Aprobado | Casilla |
| Pausar | Casilla |
| Último paso enviado | Número |
| Fecha último email | Fecha |
| Emails enviados | Número |
| Nº renovaciones | Número |
| Última renovación | Fecha |
| Origen | Texto |
| Notas | Texto largo |
| Renovado desde email | Casilla |
| Paso al renovar | Número |
| Importe renovación | Número |
| Oferta renovación | Texto |
| Clics | Número |
| Último clic | Fecha |
| Oferta clicada | Texto |
| Paso del clic | Número |

Las escrituras usan `typecast`, así que las opciones de Estado se crean solas la primera vez.

### Catálogo de cursos

En `lib/renewal/courses.js` está la lista de cursos principales con su acceso y los nombres de las ofertas de Kajabi que los venden (tomados de la tabla CURSOS KAJABI). La comparación ignora mayúsculas y acentos y, si varias ofertas coinciden, gana el nombre más largo.

| Curso | Acceso | Renovaciones en el email |
|-------|--------|--------------------------|
| Directo al Aptis Express / Express Tutorizado | 6 meses | 1 mes 97 €, 6 meses 297 €, 1 año 497 € |
| Directo al Aptis / Tutorizado | 12 meses | 1 mes 97 €, 6 meses 297 €, 1 año 497 € |
| Aptis Accelerator (Lite, Plus) | 4 meses | 4 meses 197 € |
| Aptis Level (Policía Nacional) | 3 meses | 50 días 115 €, 3 meses 157 € |
| Aptis Level Express | 50 días | 50 días 115 €, 3 meses 157 € |
| Ten tu Aptis | 4 meses (por defecto) u 8 meses si la oferta lo indica | ninguna de pago único en Kajabi |

Las ofertas de "Aptis Expert" (curso ya retirado) se tratan como Directo al Aptis.

Aptis Infinity es suscripción mensual y queda fuera de la secuencia.

### Vista previa de los emails

```bash
npm test                 # tests de fechas, secuencia y catálogo
node scripts/preview-emails.mjs   # genera los 7 emails en scripts/preview/
```

Creado con ❤️ para automatizar el seguimiento de pagos de tu academia.

## 🎯 Test de nivel con oferta (agacademyaptis.com/test-nivel)

Sustituye el assessment de Kajabi por un test interactivo: 34 preguntas tipo APTIS, nota sobre 10, nivel (100% = B2), desglose por partes y el curso que mejor le encaja con 300 € de descuento durante 20 minutos.

- `lib/level-test/quiz.js` – preguntas con su respuesta correcta, tramos de nivel (A1 < 30% ≤ A2 < 55% ≤ B1 < 85% ≤ B2) y reglas de recomendación. Lo usan el widget y el servidor.
- `kajabi/test-nivel.template.html` + `kajabi/test-nivel.css` – pantallas y estilos.
- `kajabi/test-nivel.html` – **generado** con `npm run build:test-nivel`. Es lo que se pega en Kajabi. Un test falla si no está al día.
- `POST /api/test-nivel` – guarda cada lead en la tabla `Test de nivel` (una fila por email, recalculando la nota) y anota el clic en la oferta.

Puesta en marcha:

1. **Cupón en Kajabi** (Sales → Coupons): código `TEST300`, importe fijo 300 €, válido en las 3 ofertas de la store (Level `aLwrqozM`, Express `TRchWq3V`, Tutorizado `422hix8o`). El widget lo aplica solo con `?coupon_code=TEST300` en el checkout; nunca se muestra el código.
2. **Tabla en Airtable**: `node scripts/create-level-test-table.mjs` (token con `schema.bases:write`), o créala a mano con los campos de `CAMPOS_TABLA` en `lib/level-test/lead.js`.
3. **Página de Kajabi** `/test-nivel`: quita el bloque del assessment y añade un bloque *Custom Code* con todo el contenido de `kajabi/test-nivel.html`.
4. Prueba el flujo completo y verifica que en el checkout aparece el descuento aplicado.

Cambiar cupón, importe, minutos de la oferta o WhatsApp: bloque `CONFIG` al principio del `<script>` de la plantilla, y `npm run build:test-nivel`. Cambiar preguntas, tramos o reglas de curso: `quiz.js` y lo mismo.

**Para los closers**: cada fila llega con `Mensaje WhatsApp` ya escrito (nombre, nivel, nivel que le piden, si contestó a la carrera y el curso que miró) y `Enviar WhatsApp`, un enlace que abre el chat con ese texto. `Estado closer` lo rellenan ellos. El texto se genera en `lib/level-test/mensaje.js`.

**Kajabi**: al terminar el test el servidor envía el formulario de Kajabi `Test de nivel` (o el de `KAJABI_LEVEL_TEST_FORM`) con nombre, email y teléfono, así que se crea el contacto y saltan las etiquetas, secuencias y automatizaciones de ese formulario. También le pone la etiqueta `test-nivel-a1` / `-a2` / `-b1` / `-b2` si existe en Kajabi (la API no crea etiquetas). El resultado queda en el campo `Kajabi` de la fila. Necesita que la clave de la API de Kajabi tenga permiso de escritura.

Eventos para Google Tag Manager (`dataLayer`): `test_nivel_inicio`, `test_nivel_completado` (nivel, nota, curso_recomendado) y `test_nivel_oferta_click` (curso, con_descuento). Si está el píxel de Meta se lanza `Lead`. El GCLID que ya guardáis en `localStorage`/cookie viaja con el lead a Airtable.
