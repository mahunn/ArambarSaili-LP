"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/login/actions";

const initialState: { error?: string } = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-semibold">অ্যাডমিন লগইন</h1>
      <p className="text-sm text-slate-600">আপনার অ্যাডমিন আইডি ও পাসওয়ার্ড দিয়ে লগইন করুন।</p>

      <div className="space-y-2">
        <label htmlFor="adminId" className="block text-sm font-medium text-slate-700">
          অ্যাডমিন আইডি
        </label>
        <input
          id="adminId"
          name="adminId"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-600 focus:ring-2"
          placeholder="admin"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          পাসওয়ার্ড
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-600 focus:ring-2"
          placeholder="********"
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
        {pending ? "প্রবেশ করা হচ্ছে..." : "লগইন করুন"}
      </button>
    </form>
  );
}
