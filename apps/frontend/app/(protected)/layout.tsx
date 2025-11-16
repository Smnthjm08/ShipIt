import { Appbar } from "@/components/appbar";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
      <Appbar />
      {children}
    </main>
  );
}
