"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const message = searchParams.get("notice");
  const tone = searchParams.get("tone") ?? "ok";

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const id = setTimeout(() => {
      setVisible(false);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("notice");
      params.delete("tone");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname);
    }, 2400);
    return () => clearTimeout(id);
  }, [message, pathname, router, searchParams]);

  const classes = useMemo(() => {
    if (tone === "error") return "bg-red-600";
    return "bg-success-600";
  }, [tone]);

  if (!message || !visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <div className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${classes}`}>{message}</div>
    </div>
  );
}
