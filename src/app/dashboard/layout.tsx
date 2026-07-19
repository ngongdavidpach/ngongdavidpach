import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/repositories";
import { Sidebar, MobileNav } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin");

  const user = await getUserById(session.id);
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          fullName={user.fullName}
          email={user.email}
          walletBalanceCents={user.walletBalanceCents}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
