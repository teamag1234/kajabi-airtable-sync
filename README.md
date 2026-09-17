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
KAJABI_API_KEY=tu_api_key
AIRTABLE_TOKEN=tu_token
AIRTABLE_BASE_ID=tu_base_id
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

# Ofertas de renovación (precio en euros, enlace al checkout de Kajabi)
RENEWAL_PRICE_1M=  RENEWAL_URL_1M=
RENEWAL_PRICE_6M=  RENEWAL_URL_6M=
RENEWAL_PRICE_12M= RENEWAL_URL_12M=
```

Si `CRON_SECRET` está definido, todos los endpoints exigen `Authorization: Bearer <CRON_SECRET>` (Vercel Cron lo envía automáticamente).

## 📞 Endpoints

- `GET /api/health` - Health check
- `GET /api/sync-kajabi` - Sincronización manual
- `GET /api/check-failed-payments` - Verificación de pagos
- `GET /api/renewal-sequence` - Proceso diario de la secuencia de renovación
  - `?dry=1` simula sin enviar ni escribir; `?dry=1&hoy=2026-10-01` simula otro día
- `POST /api/renewal-enroll` - Alta de alumnos (uno o array)
- `PATCH /api/renewal-enroll` - Marcar aprobado / pausar / aplicar renovación
- `GET /api/renewal-summary` - Recuento por estado
- `GET /` - Dashboard

## 🔄 Cron Jobs (UTC)

- **2:00**: Sincronización automática de pagos
- **10:00**: Verificación de pagos fallidos
- **7:00** (9:00 hora peninsular en verano, 8:00 en invierno): secuencia de renovación

## 🔁 Sistema de renovación

### Cómo funciona

1. Cada alumno con acceso limitado tiene una fila en la tabla **Renovaciones** de Airtable con su email, curso y fecha de inicio.
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
6. Cada email ofrece tres opciones (1 mes, 6 meses, 1 año) con precio y enlace configurados en las variables `RENEWAL_*`.

### Cómo entra un alumno

- **Automático**: el sync de pagos reconoce la oferta comprada por su nombre (ver `lib/renewal/courses.js`) y crea la fila con la fecha de compra como inicio.
- **Por API** (n8n, Zapier, webhook de Kajabi):
  ```http
  POST /api/renewal-enroll
  Authorization: Bearer <CRON_SECRET>
  Content-Type: application/json

  { "email": "alumno@mail.com", "nombre": "María López", "curso": "aptis-6m", "fecha_inicio": "2026-09-01" }
  ```
  `curso` admite la key del catálogo, el nombre del curso o el nombre de la oferta de Kajabi. Si el curso no está en el catálogo, añade `"meses": 4`. Se puede enviar un array para altas masivas.
- **A mano en Airtable**: crea la fila con Email, Nombre, Curso y Fecha inicio. El cron completa el resto de fechas en su siguiente pasada.

### Quién sale de la secuencia

- **Aprobado** (casilla): el alumno ya tiene el título. También por API: `PATCH /api/renewal-enroll` con `{ "email": "...", "aprobado": true }`.
- **Pausar** (casilla): no enviar nada temporalmente.
- **Renovación**: si el sync detecta el pago de una oferta de renovación (o llega `PATCH` con `{ "email": "...", "renovar": { "meses": 6 } }`), se amplía la fecha de fin desde el fin anterior y la secuencia se reinicia para el nuevo periodo.

### Tabla Renovaciones en Airtable

Crea una tabla llamada `Renovaciones` (o el nombre que pongas en `AIRTABLE_RENEWALS_TABLE`) con estos campos:

| Campo | Tipo |
|-------|------|
| Email | Texto |
| Nombre | Texto |
| Curso | Texto |
| Curso key | Texto |
| Fecha inicio | Fecha |
| Meses acceso | Número |
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

En `lib/renewal/courses.js` está la lista de cursos principales con sus meses de acceso y los nombres de las ofertas de Kajabi que los venden. Ajusta ahí nombres y duraciones; la comparación ignora mayúsculas y acentos.

### Vista previa de los emails

```bash
npm test                 # tests de fechas, secuencia y catálogo
node scripts/preview-emails.mjs   # genera los 7 emails en scripts/preview/
```

Creado con ❤️ para automatizar el seguimiento de pagos de tu academia.
