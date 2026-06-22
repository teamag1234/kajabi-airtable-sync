# 🔄 Kajabi-Airtable Sync

Sistema automático de sincronización de pagos desde Kajabi a Airtable con detección de cuotas fallidas y emails automáticos.

## ✨ Características

- ✅ Sincronización automática diaria de pagos desde Kajabi
- ✅ Registro automático de alumnos y pagos en Airtable
- ✅ Detección de pagos fallidos
- ✅ Emails automáticos de recordatorio para cuotas pendientes
- ✅ Dashboard web para control manual
- ✅ Cron jobs automáticos en Vercel
- ✅ Historial completo de pagos y estados

## 🚀 Deployment en Vercel

1. Ve a https://vercel.com
2. Importa este repositorio
3. Añade las variables de entorno en Settings
4. Deploy automático

## 📋 Variables de Entorno Requeridas

```env
KAJABI_API_KEY=tu_api_key
AIRTABLE_TOKEN=tu_token
AIRTABLE_BASE_ID=tu_base_id
EMAIL_SERVICE=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=noreply@tudominio.com
```

## 📞 Endpoints

- `GET /api/health` - Health check
- `GET /api/sync-kajabi` - Sincronización manual
- `GET /api/check-failed-payments` - Verificación de pagos
- `GET /` - Dashboard

## 🔄 Cron Jobs

- **2:00 AM**: Sincronización automática de pagos
- **10:00 AM**: Verificación de pagos fallidos

Creado con ❤️ para automatizar el seguimiento de pagos de tu academia.
