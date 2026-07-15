"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";

type NotificationCategory =
  | "Auctions"
  | "Offers"
  | "Messages"
  | "Orders"
  | "Rewards"
  | "Market"
  | "Trust"
  | "Seller"
  | "System";
type NotificationType = "All" | NotificationCategory;

type Notification = {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string | null;
  readAt: string | null;
  href: string;
  action: string;
  unread: boolean;
};

type NotificationsResponse = {
  notifications?: Notification[];
  unreadCount?: number;
  error?: string;
};

const tabs: NotificationType[] = [
  "All",
  "Auctions",
  "Offers",
  "Messages",
  "Orders",
  "Rewards",
  "Market",
  "Seller",
  "Trust",
];

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getGroupLabel(value?: string | null) {
  if (!value) {
    return "Earlier";
  }

  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return "Earlier";
}

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Notifications auth error:", error);
  }

  return session?.access_token || "";
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationType>("All");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      setIsLoading(true);
      const accessToken = await getAccessToken();

      if (!accessToken) {
        if (isMounted) {
          setNotifications([]);
          setNotice("Sign in to view real GRAIL notifications.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as NotificationsResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Notifications could not be loaded.");
        }

        if (isMounted) {
          setNotifications(payload.notifications || []);
          setNotice("");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Notifications fetch error:", error);

        if (isMounted) {
          setNotifications([]);
          setNotice(
            error instanceof Error
              ? error.message
              : "Real notifications could not be loaded.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    const refreshOnFocus = () => {
      void loadNotifications();
    };
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, []);

  const visibleNotifications = useMemo(() => {
    if (activeTab === "All") {
      return notifications;
    }

    return notifications.filter((notification) => notification.category === activeTab);
  }, [activeTab, notifications]);

  const groupedNotifications = useMemo(() => {
    const groupOrder = ["Today", "Yesterday", "Earlier"];

    return groupOrder
      .map((label) => ({
        label,
        items: visibleNotifications.filter(
          (notification) => getGroupLabel(notification.createdAt) === label,
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleNotifications]);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  async function markRead(id: string) {
    const target = notifications.find((notification) => notification.id === id);

    if (!target?.unread) {
      return;
    }

    setNotifications((items) =>
      items.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification,
      ),
    );

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return;
    }

    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ notificationId: id }),
    });

    if (!response.ok) {
      console.warn("Notification read update failed:", await response.text());
    }
  }

  async function markAllRead() {
    setNotifications((items) =>
      items.map((notification) => ({ ...notification, unread: false })),
    );

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return;
    }

    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ markAllRead: true }),
    });

    if (!response.ok) {
      console.warn("Notification bulk read update failed:", await response.text());
    }
  }

  return (
    <main className="account-page">
      <style>{pageStyles}</style>
      <div className="account-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Activity</span>
            <h1>Notifications</h1>
            <p>Permanent GRAIL updates for auctions, orders, offers, rewards, and trust.</p>
          </div>
          <button
            type="button"
            className="mark-read-button"
            disabled={notifications.length === 0 || unreadCount === 0}
            onClick={markAllRead}
          >
            Mark all as read
          </button>
        </section>

        {notice ? <p className="notification-notice">{notice}</p> : null}

        <section className="tabs panel" aria-label="Notification filters">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <span>{unreadCount} unread</span>
        </section>

        <section className="notification-list" aria-live="polite">
          {isLoading ? (
            <article className="notification-row panel">
              <div className="notification-icon">
                <span>G</span>
              </div>
              <div>
                <div className="notification-title-row">
                  <h2>Loading notifications.</h2>
                </div>
                <p>Checking your permanent GRAIL inbox.</p>
              </div>
            </article>
          ) : null}

          {!isLoading && groupedNotifications.map((group) => (
            <section key={group.label} className="notification-group" aria-label={group.label}>
              <h2>{group.label}</h2>
              <div className="notification-group-list">
                {group.items.map((notification) => (
                  <article
                    key={notification.id}
                    className={`notification-row panel ${notification.unread ? "unread" : ""}`}
                    onClick={() => markRead(notification.id)}
                  >
                    <div className="notification-icon">
                      <span>{notification.category.slice(0, 1)}</span>
                    </div>
                    <div>
                      <div className="notification-title-row">
                        <h3>{notification.title}</h3>
                        <span>{notification.category}</span>
                      </div>
                      <p>{notification.description}</p>
                      <small>{formatTimestamp(notification.createdAt)}</small>
                    </div>
                    <div className="notification-action">
                      <span className={notification.unread ? "dot unread-dot" : "dot"} />
                      <Link
                        href={notification.href}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {notification.action}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {!isLoading && visibleNotifications.length === 0 ? (
            <article className="notification-row panel">
              <div className="notification-icon">
                <span>G</span>
              </div>
              <div>
                <div className="notification-title-row">
                  <h3>No notifications.</h3>
                </div>
                <p>Real GRAIL marketplace updates will appear here as they happen.</p>
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .account-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .account-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 38px;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .page-heading {
    margin-top: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }

  .page-heading span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .page-heading h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
  }

  .page-heading p,
  .notification-row p,
  .notification-row small,
  .notification-notice {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .notification-notice {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 10px 12px;
  }

  .mark-read-button,
  .tabs button,
  .notification-action a {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .mark-read-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .mark-read-button:not(:disabled):hover,
  .tabs button.active,
  .tabs button:hover,
  .notification-action a:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .tabs {
    margin-top: 18px;
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tabs span {
    margin-left: auto;
    color: #C9CDD3;
    font-size: 12px;
    font-weight: 900;
  }

  .notification-list {
    margin-top: 14px;
    display: grid;
    gap: 18px;
  }

  .notification-group {
    display: grid;
    gap: 10px;
  }

  .notification-group > h2 {
    margin: 0;
    color: #E7DED0;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .notification-group-list {
    display: grid;
    gap: 10px;
  }

  .notification-row {
    padding: 14px;
    display: grid;
    grid-template-columns: 44px 1fr auto;
    gap: 14px;
    align-items: center;
    cursor: pointer;
  }

  .notification-row.unread {
    border-color: rgba(231,222,208,0.28);
    background:
      linear-gradient(180deg, rgba(231,222,208,0.045), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
  }

  .notification-icon {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(201,205,211,0.22);
    background: rgba(231,222,208,0.055);
    color: #E7DED0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
  }

  .notification-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .notification-title-row h3 {
    margin: 0;
    color: #fff;
    font-size: 17px;
    line-height: 21px;
    font-weight: 900;
  }

  .notification-title-row span {
    border: 1px solid rgba(231,222,208,0.22);
    border-radius: 999px;
    color: #E7DED0;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 900;
  }

  .notification-action {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #3f3f46;
    display: inline-block;
  }

  .unread-dot {
    background: #E7DED0;
    box-shadow: 0 0 14px rgba(231,222,208,0.4);
  }

  @media (max-width: 1100px) {
    .account-shell {
      width: calc(100vw - 32px);
    }

    .page-heading,
    .notification-row {
      grid-template-columns: 1fr;
      display: grid;
      align-items: start;
    }

    .tabs span {
      margin-left: 0;
    }

    .notification-action {
      justify-content: space-between;
    }
  }
`;
