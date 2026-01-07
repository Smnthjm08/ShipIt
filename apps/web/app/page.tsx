import { getUsers } from "@/actions/user";
import { ComponentExample } from "@/components/component-example";

export const dynamic = "force-dynamic";

export default async function Home() {
  const users = await getUsers();
  console.log("=======\n", users);
  return (
    <div>
      <ComponentExample />
    </div>
  );
}
