import { signOut } from "@/auth";
import { requireAuth } from "@/lib/auth";

export default async function ParentDashboardPage() {
  const session = await requireAuth("PARENT");

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Parent Dashboard</h1>
      <p>Role: {session.user.role}</p>
      <p>User: {session.user.name}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="rounded-md border px-3 py-2 text-sm" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
