import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center flex-1">
      <Button variant={"defaultlink"} asChild>
        <Link href="/connect-github">Connect Github</Link>
      </Button>
    </main>
  );
}
