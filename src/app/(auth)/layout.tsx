import { Logo } from "@/components/logo";

export default function LayoutCuenta({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 pb-10 pt-6">
      <Logo />
      <div className="mt-8">{children}</div>
    </main>
  );
}
