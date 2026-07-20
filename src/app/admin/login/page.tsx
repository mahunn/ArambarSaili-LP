import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { isAuthenticated } from "@/lib/auth";

export default async function AdminLoginPage() {
  const authed = await isAuthenticated();
  if (authed) redirect("/admin");

  return (
    <main className="container-page flex min-h-screen items-center justify-center py-10 text-slate-800">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
