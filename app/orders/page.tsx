"use client";

import Link from "next/link";
import Header from "../components/Header";
import { mockOrders } from "../lib/mockData";

const orders = mockOrders;

export default function OrdersPage() {
  return (
    <main className="orders-page">
      <style>{pageStyles}</style>
      <div className="orders-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Orders</span>
            <h1>Orders</h1>
            <p>Mock order history for card purchases and shipping status.</p>
          </div>
          <Link href="/browse">Browse Cards</Link>
        </section>

        <section className="orders-list panel">
          {orders.map((order) => (
            <article key={order.id} className="order-row">
              <div>
                <span>{order.id}</span>
                <h2>{order.cardTitle}</h2>
                <p>Seller: {order.seller}</p>
              </div>
              <strong className={`status status-${order.status.toLowerCase()}`}>
                {order.status}
              </strong>
              <strong>{order.totalDisplay}</strong>
              <Link href={order.href}>View Card</Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .orders-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .orders-shell {
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

  .page-heading span,
  .order-row span {
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
  .order-row p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .page-heading a,
  .order-row a {
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
  }

  .orders-list {
    margin-top: 18px;
    padding: 10px;
    display: grid;
    gap: 10px;
  }

  .order-row {
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.76);
    padding: 14px;
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 16px;
    align-items: center;
  }

  .order-row h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .order-row > strong {
    color: #fff;
    font-size: 16px;
    font-weight: 900;
  }

  .status {
    border: 1px solid rgba(201,205,211,0.28);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 10px;
    line-height: 12px;
    text-transform: uppercase;
  }

  .status-processing {
    color: #C9CDD3;
    background: rgba(201,205,211,0.08);
  }

  .status-shipped {
    color: #93c5fd;
    background: rgba(96,165,250,0.08);
    border-color: rgba(96,165,250,0.24);
  }

  .status-delivered {
    color: #86efac;
    background: rgba(52,211,153,0.08);
    border-color: rgba(52,211,153,0.24);
  }

  @media (max-width: 1100px) {
    .orders-shell {
      width: calc(100vw - 32px);
    }

    .page-heading,
    .order-row {
      grid-template-columns: 1fr;
    }

    .page-heading {
      display: grid;
      align-items: start;
    }
  }
`;
