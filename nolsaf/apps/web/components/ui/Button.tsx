"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

/**
 * NOTE: Our base visual tokens live in CSS:
 * .btn, .btn-brand, .btn-info, .btn-success, .btn-danger, .btn-outline, .btn-ghost, .btn-solid, .spinner
 * (See globals.css you already wired).
 * We keep Tailwind classes minimal here because we use the "tw-" prefix in the project.
 */

const buttonVariants = cva("btn", {
  variants: {
    variant: {
      brand: "btn-brand",
      info: "btn-info",
      success: "btn-success",
      danger: "btn-danger",
      outline: "btn-outline",
      ghost: "btn-ghost",
      solid: "btn-solid",
    },
    size: {
      sm: "tw-text-sm tw-px-3 tw-py-1.5",
      md: "",
      lg: "tw-text-base tw-px-5 tw-py-2.5",
      icon:
        "tw-h-10 tw-w-10 tw-p-2.5 tw-rounded-full tw-inline-flex tw-items-center tw-justify-center",
    },
    block: {
      true: "tw-w-full",
      false: "",
    },
  },
  defaultVariants: {
    variant: "brand",
    size: "md",
    block: false,
  },
});

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

type NativeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never;
};

type Shared = {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & VariantProps<typeof buttonVariants>;

export type ButtonProps = (AnchorProps | NativeButtonProps) & Shared;

export const Button = React.forwardRef<HTMLButtonElement & HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      className,
      variant,
      size,
      block,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...rest
    } = props as any;

    const isAnchor = typeof (rest as AnchorProps).href === "string";
    const isDisabled = Boolean(disabled || loading);

    const classes = twMerge(
      buttonVariants({ variant, size, block }),
      isDisabled && (isAnchor ? "tw-pointer-events-none tw-opacity-60" : "tw-opacity-60 tw-cursor-not-allowed"),
      className
    );

    if (isAnchor) {
      const { href, target, rel, ...anchorRest } = rest as AnchorProps;
      return (
        <a
          ref={ref as any}
          href={href}
          target={target}
          rel={target === "_blank" ? (rel ? `${rel} noopener noreferrer` : "noopener noreferrer") : rel}
          
          data-variant={variant}
          data-size={size}
          className={classes}
          {...anchorRest}
        >
          {loading && (
            <span aria-hidden className="dot-spinner dot-sm tw-mr-2 tw-inline-block tw-align-middle" aria-live="polite">
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </span>
          )}
          {leftIcon && <span aria-hidden className="tw-inline-flex tw-mr-2 tw-items-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span aria-hidden className="tw-inline-flex tw-ml-2 tw-items-center">{rightIcon}</span>}
        </a>
      );
    }

    const { type, ...buttonRest } = rest as NativeButtonProps;

    return (
      <button
        ref={ref as any}
        type={type ?? "button"} // ✅ safe default
        disabled={isDisabled}
        
        data-variant={variant}
        data-size={size}
        className={classes}
        {...buttonRest}
      >
        {loading && (
          <span aria-hidden className="dot-spinner dot-sm tw-mr-2 tw-inline-block tw-align-middle" aria-live="polite">
            <span className="dot dot-blue" />
            <span className="dot dot-black" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </span>
        )}
        {leftIcon && <span aria-hidden className="tw-inline-flex tw-mr-2 tw-items-center">{leftIcon}</span>}
        <span>{children}</span>
        {rightIcon && <span aria-hidden className="tw-inline-flex tw-ml-2 tw-items-center">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
export default Button;
                