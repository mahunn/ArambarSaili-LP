"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
    >
      Print
    </button>
  );
}
