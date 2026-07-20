"use client";

type ConfirmSubmitButtonProps = {
  label: string;
  className: string;
  confirmText: string;
};

export function ConfirmSubmitButton({ label, className, confirmText }: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
