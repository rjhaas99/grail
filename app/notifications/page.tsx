import Link from "next/link";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

const notifications = [
  {
    id: 1,
    type: "Offer",
    title: "New offer received",
    message: "A buyer offered $4,100 for your Michael Jordan Rookie.",
    time: "2 minutes ago",
    href: "/offers",
    unread: true,
  },
  {
    id: 2,
    type: "Message",
    title: "New message from buyer",
    message: "Buyer asked if you can send more photos of the Tom Brady Auto.",
    time: "18 minutes ago",
    href: "/messages",
    unread: true,
  },
  {
    id: 3,
    type: "Sale",
    title: "Purchase completed",
    message: "Michael Jordan Rookie sale completed. Seller payout is being prepared.",
    time: "Today",
    href: "/orders",
    unread: false,
  },
  {
    id: 4,
    type: "Listing",
    title: "Listing is live",
    message: "Your LeBron James Rookie listing is now visible on GRAIL.",
    time: "Yesterday",
    href: "/portfolio",
    unread: false,
  },
  {
    id: 5,
    type: "Account",
    title: "Email confirmed",
    message: "Your GRAIL account email has been verified successfully.",
    time: "Yesterday",
    href: "/profile",
    unread: false,
  },
];

export default function NotificationsPage() {
  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                Notifications
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight">
                Activity Center
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-400">
                Track offers, messages, purchases, listings, and important account updates.
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 px-5 py-3 text-sm text-zinc-300">
              {unreadCount} unread
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Unread</p>
              <h2 className="mt-3 text-4xl font-semibold">{unreadCount}</h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Total Alerts</p>
              <h2 className="mt-3 text-4xl font-semibold">
                {notifications.length}
              </h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-sm text-zinc-500">Priority</p>
              <h2 className="mt-3 text-4xl font-semibold">2</h2>
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between px-2 py-3">
              <h2 className="text-2xl font-semibold">
                Recent Notifications
              </h2>

              <button className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white">
                Mark all read
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className={`block rounded-2xl border p-5 transition hover:border-zinc-700 hover:bg-zinc-900 ${
                    notification.unread
                      ? "border-zinc-700 bg-black"
                      : "border-zinc-900 bg-black/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex gap-4">
                      <div
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                          notification.unread ? "bg-white" : "bg-zinc-700"
                        }`}
                      />

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold">
                            {notification.title}
                          </p>

                          <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
                            {notification.type}
                          </span>
                        </div>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-right text-xs text-zinc-500">
                      {notification.time}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}