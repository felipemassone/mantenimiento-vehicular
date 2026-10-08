/**
 * Origen público de la aplicación, para los enlaces de los correos. Nunca sale de la
 * solicitud (inyección del encabezado Host): APP_ORIGIN en local y en producción;
 * en las vistas previas, la URL estable de la rama, que la pone Vercel.
 */
export function origenDeLaApp(env: Record<string, string | undefined> = process.env): string {
  if (env.APP_ORIGIN) return env.APP_ORIGIN;
  if (env.VERCEL_BRANCH_URL) return `https://${env.VERCEL_BRANCH_URL}`;
  return "http://localhost:3000";
}
