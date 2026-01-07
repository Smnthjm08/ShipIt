import { getUsers } from "@/actions/user";
import { ComponentExample } from "@/components/component-example";

export default async function Home() {
  const result = await getUsers();

  if (!result.ok) {
    return <div className="text-red-600">{result.error}</div>;
  }

  console.log(result.data);

  return <ComponentExample />;
}
