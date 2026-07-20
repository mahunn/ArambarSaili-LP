import Link from "next/link";
import { Suspense } from "react";
import { AdminToast } from "@/components/admin/admin-toast";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm text-slate-500">Arambar Saili</p>
            <h1 className="text-lg font-semibold text-slate-900">Admin Panel</h1>
          </div>
          <AdminNav />
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-slate-600 hover:text-slate-900" href="/">
              সাইট দেখুন
            </Link>
            <form action="/admin/logout" method="post">
              <button className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-[0_4px_16px_rgb(0,0,0,0.04)] hover:bg-slate-50">
                লগআউট
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container-page py-4 md:py-6">{children}</main>
      <Suspense fallback={null}>
        <AdminToast />
      </Suspense>
    </div>
  );
}
