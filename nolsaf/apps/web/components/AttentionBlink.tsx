"use client";

import React, { useEffect } from "react";

type Props = {
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export default function AttentionBlink({ active = false, className = '', children }: Props) {
  useEffect(() => {
    const id = 'nolsaf-attention-blink-style';
    if (!document.getElementById(id)) {
      const css = `
        .nolsaf-attention-blink { animation: nolsaf-attention-blink 800ms linear infinite; }
        @keyframes nolsaf-attention-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.18; } }
      `;
      const el = document.createElement('style');
      el.id = id;
      el.textContent = css;
      document.head.appendChild(el);
    }
  }, []);

  const cls = `${active ? 'nolsaf-attention-blink' : ''} ${className}`.trim();
  return <span className={cls}>{children}</span>;
}
