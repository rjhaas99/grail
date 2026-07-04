"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";

type NotificationType = "All" | "Offers" | "Messages" | "Orders" | "Market" | "Seller";

type Notification = {
  id: string;
  type: Exclude<NotificationType, "All">;
  title: string;
  description: string;
  timestamp: string;
  href: string;
  action: string;
  unread: boolean;
  source?: "mock" | "supabase";
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string | null;
};

const tabs: NotificationType[] = ["All", "Offers", "Messages", "Orders", "Market", "Seller"];

const initialNotifications: Notification[] = [
  {
    id: "n1",
    type: "Offers",
    title: "Offer received",
    description: "MasonVault offered $485 for Obsidian Field Captain.",
    timestamp: "2 minutes ago",
    href: "/offers",
    action: "View Offer",
    unread: true,
  },
  {
    id: "n2",
    type: "Offers",
    title: "Offer accepted",
    description: "Your offer on Midnight Arc Holo was accepted.",
    timestamp: "18 minutes ago",
    href: "/offers",
    action: "View Offer",
    unread: true,
  },
  {
    id: "n3",
    type: "Messages",
    title: "New message from seller",
    description: "VaultRunner replied about shipping and extra photos.",
    timestamp: "34 minutes ago",
    href: "/messages",
    action: "Open Message",
    unread: true,
  },
  {
    id: "n4",
    type: "Market",
    title: "Watched card price changed",
    description: "Emerald Archive Guardian moved +4.8% over the last 30 days.",
    timestamp: "Today",
    href: "/cards/browse-7",
    action: "View Card",
    unread: false,
  },
  {
    id: "n5",
    type: "Orders",
    title: "Order shipped",
    description: "Your Midnight Arc Holo order has tracking available.",
    timestamp: "Today",
    href: "/orders",
    action: "View Order",
    unread: false,
  },
  {
    id: "n6",
    type: "Seller",
    title: "Seller reward level progress",
    description: "You are 76% of the way to Level 5 Seller.",
    timestamp: "Yesterday",
    href: "/seller-rewards",
    action: "View Rewards",
    unread: false,
  },
  {
    id: "n7",
    type: "Market",
    title: "Hot card alert",
    description: "Crimson Court Rookie is trending with increased watch activity.",
    timestamp: "Yesterday",
    href: "/cards/browse-1",
    action: "View Card",
    unread: true,
  },
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

function getNotificationType(row: NotificationRow): Exclude<NotificationType, "All"> {
  const text = `${row.title} ${row.body} ${row.type || ""}`.toLowerCase();

  if (text.includes("offer")) return "Offers";
  if (text.includes("message") || text.includes("information")) return "Messages";
  if (text.includes("order") || text.includes("refund") || text.includes("shipped")) return "Orders";
  if (text.includes("market")) return "Market";

  return "Seller";
}

function getActionLabel(type: Exclude<NotificationType, "All">) {
  if (type === "Offers") return "View Offer";
  if (type === "Messages") return "Open Message";
  if (type === "Orders") return "View Order";
  if (type === "Market") return "View Card";

  return "Open";
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationType>("All");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notice, setNotice] = useState("Demo notifications");

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Notifications auth error:", sessionError);
      }

      if (!session?.user.id) {
        if (isMounted) {
          setNotifications(initialNotifications);
          setNotice("Sign in to view real notifications. Showing demo notifications.");
        }
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, type, link_url, read_at, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Notifications fetch unavailable, using demo notifications:", error);

        if (isMounted) {
          setNotifications(initialNotifications);
          setNotice("Real notifications unavailable. Showing demo notifications.");
        }
        return;
      }

      const rows = (data || []) as NotificationRow[];

      if (!isMounted) {
        return;
      }

      if (rows.length === 0) {
        setNotifications([]);
        setNotice("No notifications yet.");
        return;
      }

      setNotifications(
        rows.map((row) => {
          const type = getNotificationType(row);

          return {
            id: row.id,
            type,
            title: row.title,
            description: row.body,
            timestamp: formatTimestamp(row.created_at),
            href: row.link_url || "/notifications",
            action: getActionLabel(type),
            unread: !row.read_at,
            source: "supabase",
          };
        }),
      );
      setNotice("Live GRAIL Admin notifications");
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleNotifications = useMemo(() => {
    if (activeTab === "All") {
      return notifications;
    }

    return notifications.filter((notification) => notification.type === activeTab);
  }, [activeTab, notifications]);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  async function markRead(id: string) {
    setNotifications((items) =>
      items.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification,
      ),
    );

    const notification = notifications.find((item) => item.id === id);

    if (notification?.source !== "supabase") {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.warn("Notification read update failed:", error);
    }
  }

  async function markAllRead() {
    setNotifications((items) =>
      items.map((notification) => ({ ...notification, unread: false })),
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .is("read_at", null);

    if (error) {
      console.warn("Notification bulk read update failed:", error);
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
            <p>Track offers, messages, orders, seller activity, and market alerts.</p>
          </div>
          <button
            type="button"
            className="mark-read-button"
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

        <section className="notification-list">
          {visibleNotifications.map((notification) => (
            <article
              key={notification.id}
              className={`notification-row panel ${notification.unread ? "unread" : ""}`}
              onClick={() => markRead(notification.id)}
            >
              <div className="notification-icon">
                <span>{notification.type.slice(0, 1)}</span>
              </div>
              <div>
                <div className="notification-title-row">
                  <h2>{notification.title}</h2>
                  <span>{notification.type}</span>
                </div>
                <p>{notification.description}</p>
                <small>{notification.timestamp}</small>
              </div>
              <div className="notification-action">
                <span className={notification.unread ? "dot unread-dot" : "dot"} />
                <Link href={notification.href} onClick={(event) => event.stopPropagation()}>
                  {notification.action}
                </Link>
              </div>
            </article>
          ))}
          {visibleNotifications.length === 0 ? (
            <article className="notification-row panel">
              <div className="notification-icon">
                <span>G</span>
              </div>
              <div>
                <div className="notification-title-row">
                  <h2>No notifications.</h2>
                </div>
                <p>Official GRAIL Admin updates will appear here.</p>
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
    background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }
  .account-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }
  .page-heading { margin-top: 18px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
  .page-heading span {
    color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .notification-row p, .notification-row small, .notification-notice {
    color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800;
  }
  .notification-notice { margin: 14px 0 0; border: 1px solid rgba(201,205,211,0.16); border-radius: 10px; background: rgba(201,205,211,0.045); padding: 10px 12px; }
  .mark-read-button, .tabs button, .notification-action a {
    border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055);
    color: #fff; min-height: 38px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center;
    text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer;
  }
  .mark-read-button:hover, .tabs button.active, .tabs button:hover, .notification-action a:hover {
    border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }
  .tabs { margin-top: 18px; padding: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .tabs span { margin-left: auto; color: #C9CDD3; font-size: 12px; font-weight: 900; }
  .notification-list { margin-top: 14px; display: grid; gap: 10px; }
  .notification-row {
    padding: 14px; display: grid; grid-template-columns: 44px 1fr auto; gap: 14px; align-items: center; cursor: pointer;
  }
  .notification-row.unread { border-color: rgba(231,222,208,0.28); background: linear-gradient(180deg, rgba(231,222,208,0.045), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); }
  .notification-icon {
    width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(201,205,211,0.22); background: rgba(231,222,208,0.055);
    color: #E7DED0; display: flex; align-items: center; justify-content: center; font-weight: 900;
  }
  .notification-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .notification-title-row h2 { margin: 0; color: #fff; font-size: 17px; line-height: 21px; font-weight: 900; }
  .notification-title-row span {
    border: 1px solid rgba(231,222,208,0.22); border-radius: 999px; color: #E7DED0; padding: 4px 8px; font-size: 10px; font-weight: 900;
  }
  .notification-action { display: flex; align-items: center; gap: 12px; }
  .dot { width: 8px; height: 8px; border-radius: 999px; background: #3f3f46; display: inline-block; }
  .unread-dot { background: #E7DED0; box-shadow: 0 0 14px rgba(231,222,208,0.4); }
  @media (max-width: 1100px) {
    .account-shell { width: calc(100vw - 32px); }
    .page-heading, .notification-row { grid-template-columns: 1fr; display: grid; align-items: start; }
    .tabs span { margin-left: 0; }
    .notification-action { justify-content: space-between; }
  }
`;
