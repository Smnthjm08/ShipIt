import Link from "next/link";
import { Button } from "./ui/button";

export default function LandingPage() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center gap-2 pt-20">
            <h1 className="font-extrabold text-5xl">ShipIt</h1>
            <Button asChild>
                <Link href={"/connect-github"}>Connect Github</Link>
            </Button>
        </main>
    );
}