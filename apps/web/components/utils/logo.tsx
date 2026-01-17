import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
      <Image src={"/logo.svg"} alt="logo" width={24} height={24} />
      <span>ShipIt</span>
    </Link>
  );
}
