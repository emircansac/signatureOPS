import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn("border border-rule bg-paper p-6", className)}>{children}</div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center px-4 py-2 text-sm font-medium disabled:opacity-50",
        variant === "primary" && "bg-seal text-paper",
        variant === "secondary" && "border border-rule bg-paper text-ink hover:border-ink",
        variant === "destructive" && "border border-rule bg-paper text-ink hover:border-ink",
        variant === "ghost" && "text-lead hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex border border-rule px-2 py-0.5 text-xs",
        variant === "default" && "text-lead",
        variant === "success" && "text-ink",
        variant === "warning" && "text-lead",
        variant === "error" && "text-seal",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
      {children}
    </label>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-medium text-ink">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-lead">{subtitle}</p> : null}
    </div>
  );
}
