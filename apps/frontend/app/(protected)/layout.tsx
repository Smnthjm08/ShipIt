import { Appbar } from "@/components/appbar";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <Appbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
