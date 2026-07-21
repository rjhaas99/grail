"use client";

import type { CSSProperties, ReactNode } from "react";
import Header from "./Header";

const homepageBackground =
  "radial-gradient(circle at 59% 120px, rgba(255,255,255,0.06), transparent 28%), linear-gradient(180deg,#000 0%,#030303 58%,#000 100%)";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  shellClassName?: string;
  styles?: string;
  mainStyle?: CSSProperties;
  shellStyle?: CSSProperties;
};

export default function PageShell({
  children,
  className,
  shellClassName,
  styles,
  mainStyle,
  shellStyle,
}: PageShellProps) {
  return (
    <main
      className={className}
      style={{
        minHeight: "100vh",
        minWidth: "1280px",
        overflowX: "auto",
        background: homepageBackground,
        color: "#fafafa",
        fontFamily: "Arial, Helvetica, sans-serif",
        ...mainStyle,
      }}
    >
      {styles ? <style>{styles}</style> : null}
      <div
        className={shellClassName}
        style={{
          width: "1240px",
          margin: "0 auto",
          padding: "8px 0 38px",
          ...shellStyle,
        }}
      >
        <Header />
        {children}
      </div>
    </main>
  );
}
