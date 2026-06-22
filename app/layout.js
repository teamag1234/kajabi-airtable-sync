export const metadata = {
  title: 'Kajabi-Airtable Sync',
  description: 'Sistema automático de sincronización de pagos',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
