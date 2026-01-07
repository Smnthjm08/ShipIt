import { ComponentExample } from "@/components/component-example";
import { prisma } from "@repo/db";

export default async function Page() {
  const user = await prisma.user?.findMany();
  console.log(">>>>>>>>>>", user);

  return <ComponentExample />;
}
