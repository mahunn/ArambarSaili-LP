"use client";

import { useState } from "react";

type OrderCopyButtonsProps = {
  singleText?: string;
  allIncompleteText?: string;
};

export function OrderCopyButtons({ singleText, allIncompleteText }: OrderCopyButtonsProps) {
  const [singleCopied, setSingleCopied] = useState(false);
  const [allCopied, setAllCopied] = useState(false);

  async function copySingle() {
    if (!singleText) return;
    await navigator.clipboard.writeText(singleText);
    setSingleCopied(true);
    setTimeout(() => setSingleCopied(false), 1500);
  }

  async function copyAll() {
    if (!allIncompleteText) return;
    await navigator.clipboard.writeText(allIncompleteText);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 1500);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {singleText ? (
        <button
          type="button"
          onClick={copySingle}
          className="min-h-12 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          {singleCopied ? "কপি হয়েছে" : "কপি ডিটেইল"}
        </button>
      ) : null}
      {allIncompleteText ? (
        <button
          type="button"
          onClick={copyAll}
          className="min-h-12 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          {allCopied ? "সব কপি হয়েছে" : "অসম্পূর্ণ অর্ডার কপি"}
        </button>
      ) : null}
    </div>
  );
}
