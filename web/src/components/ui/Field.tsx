import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function FieldWrapper({ label, hint, error, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-900">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-bad">{error}</p>
      ) : hint ? (
        <p className="text-sm text-mist-400">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-ink-950 placeholder:text-mist-400 outline-none transition-shadow focus:ring-2 focus:ring-brass-400/40 focus:border-brass-400";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        className={clsx(inputBase, error ? "border-bad" : "border-mist-200", className)}
        {...rest}
      />
    </FieldWrapper>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} htmlFor={id}>
      <textarea ref={ref} id={id} className={clsx(inputBase, "min-h-[96px] resize-y", error ? "border-bad" : "border-mist-200", className)} {...rest} />
    </FieldWrapper>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, id, className, children, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} htmlFor={id}>
      <select ref={ref} id={id} className={clsx(inputBase, "bg-white", error ? "border-bad" : "border-mist-200", className)} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
});
