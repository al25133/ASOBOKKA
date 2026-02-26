"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface PasscodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  className?: string;
}

export function PasscodeInput({ value, onChange, length = 5, className }: PasscodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => value.padEnd(length, "").slice(0, length).split(""), [length, value]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  const updateDigit = (index: number, nextChar: string) => {
    const sanitized = nextChar.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = sanitized;
    const nextValue = nextDigits.join("").replace(/\s/g, "").slice(0, length);
    onChange(nextValue);
    if (sanitized && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          value={digit}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
          onPaste={onPaste}
          className="h-12 w-12 rounded-xl border border-zinc-300 text-center text-lg font-semibold outline-none focus:border-foreground"
          aria-label={`${index + 1}桁目`}
        />
      ))}
    </div>
  );
}
