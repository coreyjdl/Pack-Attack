import type { ButtonHTMLAttributes } from "react";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
}

export function DeleteIconButton({ label, className, type = "button", ...props }: Props): JSX.Element {
  return (
    <button
      type={type}
      className={["delete-icon-btn", className ?? ""].filter(Boolean).join(" ")}
      title={props.title ?? label}
      aria-label={label}
      {...props}
    >
      🗑
    </button>
  );
}
