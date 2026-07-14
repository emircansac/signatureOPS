import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-zinc-200 bg-white p-6 shadow-sm", className)}>
      {children}
    </div>
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
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        variant === "primary" && "bg-[#0066cc] text-white hover:bg-blue-700",
        variant === "secondary" && "border border-zinc-300 bg-white hover:bg-zinc-50",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "hover:bg-zinc-100",
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
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-zinc-100 text-zinc-700",
        variant === "success" && "bg-green-100 text-green-800",
        variant === "warning" && "bg-yellow-100 text-yellow-800",
        variant === "error" && "bg-red-100 text-red-800",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-zinc-700">
      {children}
    </label>
  );
}
