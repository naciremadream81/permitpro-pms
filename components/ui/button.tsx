/**
 * Button — primary actions with semantic tokens and dark-mode parity.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80",
      secondary:
        "bg-muted text-foreground shadow-sm hover:bg-muted/80 active:bg-muted/70",
      outline:
        "border border-input bg-card text-foreground shadow-sm hover:bg-muted/60 active:bg-muted/80",
      ghost: "text-foreground hover:bg-muted/80 active:bg-muted",
      destructive:
        "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      link: "text-primary underline-offset-4 hover:underline shadow-none",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
