"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate } from "@/lib/auth";

const loginSchema = z.object({
  adminId: z.string().min(1),
  password: z.string().min(1)
});

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    adminId: formData.get("adminId"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: "Admin ID and password are required." };
  }

  const ok = await authenticate(parsed.data.adminId, parsed.data.password);
  if (!ok) {
    return { error: "Invalid Admin ID or password." };
  }

  redirect("/admin");
}
