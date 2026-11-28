import type { ComponentProps } from "react";
import u from "./ui.module.css";

type Variant =
  /** Yellow, ink border and an offset shadow; presses in when clicked. */
  | { variant: "primary" }
  /** A line box in the colours of the surface it sits on. */
  | { variant: "outlined" }
  /** A square glyph button; the aria-label is its only name. */
  | { variant: "icon"; "aria-label": string }
  /** No look of its own beyond the focus ring: the caller styles it whole. */
  | { variant?: undefined };

export type ButtonProps = Omit<ComponentProps<"button">, "type"> & {
  /** Only a form's submit button sets this; everything else is an action. */
  type?: "button" | "submit";
} & Variant;

/**
 * A button's classes, for a link that looks like one (a way back to the
 * title screen next to real buttons) and for Button itself.
 */
export function buttonClass(className?: string, variant?: ButtonProps["variant"]) {
  return `${u.button} ${variant ? u[variant] : ""} ${className ?? ""}`;
}

/** The one button every screen uses. Size and place come from the caller's class. */
export function Button({ variant, type = "button", className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(className, variant)} {...props} />;
}
