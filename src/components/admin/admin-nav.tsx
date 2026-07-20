"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "ড্যাশবোর্ড" },
  { href: "/admin/product", label: "পণ্য সেটিংস" },
  { href: "/admin/orders", label: "অর্ডার তালিকা" },
  { href: "/admin/cms", label: "CMS/FAQ" },
  { href: "/admin/ads", label: "বিজ্ঞাপন" }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      {navItems.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            className={`min-h-12 rounded-2xl px-4 py-3 font-medium transition ${
              active
                ? "bg-emerald-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.3)]"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
