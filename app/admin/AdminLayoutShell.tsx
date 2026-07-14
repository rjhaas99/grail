"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminPageByRoute } from "../lib/adminRegistry";

export default function AdminLayoutShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";
  const currentPage = getAdminPageByRoute(pathname);

  return (
    <div className="admin-layout-root">
      <style>{layoutStyles}</style>
      <div className="admin-layout-bar">
        <div>
          <span>GRAIL Admin</span>
          <strong>{isDashboard ? "Admin Dashboard" : currentPage?.title || "Admin Tool"}</strong>
          <em>{isDashboard ? "Control Center" : `Admin / ${currentPage?.category || "Tool"}`}</em>
        </div>
        {!isDashboard ? (
          <Link href="/admin">Back to Admin Dashboard</Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const layoutStyles = `
  .admin-layout-root {
    background: transparent;
  }
  .admin-layout-bar {
    width: min(1240px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 14px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    color: #fff;
    font-family: Arial, Helvetica, sans-serif;
  }
  .admin-layout-bar span {
    display: block;
    color: #C9CDD3;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .admin-layout-bar strong {
    display: block;
    margin-top: 4px;
    color: #fff;
    font-size: 15px;
    line-height: 19px;
    font-weight: 900;
  }
  .admin-layout-bar em {
    display: block;
    margin-top: 2px;
    color: #85858f;
    font-size: 11px;
    line-height: 14px;
    font-style: normal;
    font-weight: 800;
  }
  .admin-layout-bar a {
    min-height: 34px;
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    text-decoration: none;
    font-size: 12px;
    line-height: 15px;
    font-weight: 900;
    white-space: nowrap;
  }
  @media (max-width: 720px) {
    .admin-layout-bar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;
