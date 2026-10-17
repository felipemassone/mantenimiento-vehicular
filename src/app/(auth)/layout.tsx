import { Logo } from "@/components/logo";

export default function LayoutCuenta({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 pb-10 pt-6">
      <Logo />
      {/* Pantalla 23: la bajada, debajo del logo. Es la misma description del layout raíz y del manifest. */}
      <p className="mt-3 text-sm text-muted-foreground">Sabé qué le toca a tu auto, y cuándo.</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}
