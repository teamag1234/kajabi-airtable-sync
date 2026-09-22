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

- **Aprobado** (casilla): el alumno ya tiene el título. También por API: `PATCH /api/renewal-enroll` con `{ "email": "...", "aprobado": true }`.
- **Pausar** (casilla): no enviar nada temporalmente.
- **Renovación**: si el sync detecta el pago de una oferta de renovación (o llega `PATCH` con `{ "email": "...", "renovar": { "meses": 6 } }`), se amplía la fecha de fin desde el fin anterior y la secuencia se reinicia para el nuevo periodo.

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
