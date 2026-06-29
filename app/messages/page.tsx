"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import Header from "../components/Header";
import {
  type MockConversation,
  mockConversations,
} from "../lib/mockData";

type Conversation = MockConversation;
const initialConversations: Conversation[] = mockConversations;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function CardArtwork({ accent }: { accent: string }) {
  return (
    <div className="card-art">
      <div
        className="card-face"
        style={{
          background: `radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), linear-gradient(145deg, ${accent}, #111827 54%, #030304)`,
        }}
      >
        <span />
        <strong />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterFor, setCounterFor] = useState("");

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sortedConversations = [...conversations].sort((first, second) => {
      if (first.unread !== second.unread) {
        return first.unread ? -1 : 1;
      }

      return second.sortRank - first.sortRank;
    });

    if (!query) {
      return sortedConversations;
    }

    return sortedConversations.filter((conversation) =>
      [
        conversation.person,
        conversation.cardTitle,
        conversation.lastSnippet,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [conversations, searchQuery]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ||
    conversations[0];

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = draft.trim();

    if (!body) {
      return;
    }

    setConversations((items) =>
      items.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              unread: false,
              lastSnippet: body,
              timestamp: "now",
              sortRank: Date.now(),
              messages: [
                ...conversation.messages,
                {
                  id: `local-${conversation.messages.length + 1}`,
                  sender: "buyer",
                  body,
                  time: "Now",
                },
              ],
            }
          : conversation,
      ),
    );
    setDraft("");
  }

  function updateOffer(status: "Accepted" | "Countered" | "Declined") {
    setConversations((items) =>
      items.map((conversation) =>
        conversation.id === activeConversation.id && conversation.offer
          ? {
              ...conversation,
              offer: {
                amount:
                  status === "Countered" && counterAmount
                    ? Number(counterAmount)
                    : conversation.offer.amount,
                status,
              },
            }
          : conversation,
      ),
    );
    setCounterFor("");
    setCounterAmount("");
  }

  return (
    <main className="messages-page">
      <style>{pageStyles}</style>
      <div className="messages-shell">
        <Header />

        <section className="page-heading">
          <span>Messages</span>
          <h1>Messages</h1>
          <p>Buyer and seller conversations for cards, offers, and shipping.</p>
        </section>

        <section className="messages-layout">
          <aside className="conversation-list panel">
            <label className="message-search">
              <span aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search messages"
                aria-label="Search messages"
              />
            </label>

            <div className="conversation-rows">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={conversation.id === activeConversation.id ? "active" : ""}
                  onClick={() => {
                    setActiveId(conversation.id);
                    setConversations((items) =>
                      items.map((item) =>
                        item.id === conversation.id ? { ...item, unread: false } : item,
                      ),
                    );
                  }}
                >
                  <span className="unread-slot" aria-hidden="true">
                    {conversation.unread ? <span className="unread-dot" /> : null}
                  </span>
                  <div>
                    <strong>
                      {conversation.isActive ? <span className="online-dot" aria-hidden="true" /> : null}
                      {conversation.person}
                    </strong>
                    <span>{conversation.cardTitle}</span>
                    <p>{conversation.lastSnippet}</p>
                  </div>
                  <div className="conversation-meta">
                    <span>{conversation.timestamp}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="thread-panel panel">
            <header className="thread-header">
              <div>
                <h2>{activeConversation.person}</h2>
                <p>
                  {activeConversation.isActive ? <span className="online-dot" aria-hidden="true" /> : null}
                  {activeConversation.badge} · {activeConversation.cardTitle}
                </p>
              </div>
              <Link href={activeConversation.cardHref}>View Card</Link>
            </header>

            <Link className="card-preview" href={activeConversation.cardHref}>
              <CardArtwork accent={activeConversation.accent} />
              <div>
                <h3>{activeConversation.cardTitle}</h3>
                <p>{formatCurrency(activeConversation.price)}</p>
                {activeConversation.currentOffer ? (
                  <span>
                    Current offer {formatCurrency(activeConversation.currentOffer)}
                  </span>
                ) : null}
              </div>
              <strong>View Card</strong>
            </Link>

            {activeConversation.offer ? (
              <div className="offer-card">
                <div>
                  <span>Offer</span>
                  <strong>{formatCurrency(activeConversation.offer.amount)}</strong>
                  <p>Status: {activeConversation.offer.status}</p>
                </div>
                <div className="offer-actions">
                  <button type="button" onClick={() => updateOffer("Accepted")}>
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounterFor(activeConversation.id)}
                  >
                    Counter
                  </button>
                  <button type="button" onClick={() => updateOffer("Declined")}>
                    Decline
                  </button>
                </div>
                {counterFor === activeConversation.id ? (
                  <div className="counter-row">
                    <input
                      type="number"
                      value={counterAmount}
                      onChange={(event) => setCounterAmount(event.target.value)}
                      placeholder="Counter amount"
                    />
                    <button type="button" onClick={() => updateOffer("Countered")}>
                      Send
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="message-thread">
              {activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-bubble ${message.sender}`}
                >
                  <p>{message.body}</p>
                  <span>{message.time}</span>
                </div>
              ))}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a message..."
                aria-label="Write a message"
              />
              <button type="submit">Send</button>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .messages-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .messages-shell {
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
  .thread-header p,
  .card-preview p,
  .card-preview span,
  .offer-card p {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .messages-layout {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 16px;
    min-height: 680px;
  }

  .conversation-list,
  .thread-panel {
    padding: 14px;
  }

  .message-search {
    height: 38px;
    border: 1px solid #24242a;
    border-radius: 9px;
    background: #08080a;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
  }

  .message-search span {
    width: 12px;
    height: 12px;
    border: 2px solid #777985;
    border-radius: 999px;
    box-sizing: border-box;
  }

  .message-search input,
  .composer input,
  .counter-row input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #f4f4f5;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }

  .conversation-rows {
    margin-top: 12px;
    display: grid;
    gap: 8px;
  }

  .conversation-rows button {
    position: relative;
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    color: inherit;
    padding: 12px;
    display: grid;
    grid-template-columns: 14px 1fr auto;
    gap: 10px;
    align-items: center;
    text-align: left;
    cursor: pointer;
  }

  .unread-slot {
    width: 14px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 10px rgba(255,255,255,0.28);
  }

  .conversation-rows button.active,
  .conversation-rows button:hover {
    border-color: rgba(231,222,208,0.44);
    background: rgba(231,222,208,0.07);
  }

  .conversation-rows strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .online-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #34d399;
    box-shadow: 0 0 10px rgba(52,211,153,0.28);
    display: inline-flex;
    margin-right: 7px;
    vertical-align: 1px;
  }

  .conversation-rows span,
  .conversation-rows p,
  .conversation-meta {
    color: #a1a1aa;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }

  .conversation-meta {
    text-align: right;
  }

  .thread-panel {
    display: grid;
    grid-template-rows: auto auto auto 1fr auto;
    gap: 12px;
  }

  .thread-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .thread-header h2,
  .card-preview h3 {
    margin: 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }

  .thread-header a,
  .card-preview strong,
  .offer-actions button,
  .counter-row button,
  .composer button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 36px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .thread-header a:hover,
  .card-preview:hover strong,
  .offer-actions button:hover,
  .counter-row button:hover,
  .composer button:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .card-preview {
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.76);
    padding: 12px;
    display: grid;
    grid-template-columns: 86px 1fr auto;
    gap: 12px;
    align-items: center;
    color: inherit;
    text-decoration: none;
  }

  .card-art {
    width: 74px;
    height: 96px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 9px;
    background: #030304;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-face {
    width: 54px;
    height: 76px;
    border: 1px solid rgba(244,244,245,0.48);
    border-radius: 7px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 12px 22px rgba(0,0,0,0.55);
  }

  .card-face span {
    position: absolute;
    left: 13px;
    top: 18px;
    width: 28px;
    height: 28px;
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 50%;
  }

  .card-face strong {
    position: absolute;
    left: 23px;
    top: 24px;
    width: 14px;
    height: 30px;
    border-radius: 999px 999px 8px 8px;
    background: rgba(255,255,255,0.75);
  }

  .offer-card {
    border: 1px solid rgba(52,211,153,0.18);
    border-radius: 12px;
    background: rgba(52,211,153,0.055);
    padding: 12px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
  }

  .offer-card span {
    color: #86efac;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .offer-card strong {
    display: block;
    margin-top: 5px;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .offer-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .counter-row {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
  }

  .counter-row input {
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    padding: 0 12px;
    min-height: 38px;
  }

  .message-thread {
    min-height: 280px;
    overflow-y: auto;
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.52);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-bubble {
    max-width: 70%;
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(5,5,6,0.9);
    padding: 10px;
  }

  .message-bubble.buyer {
    align-self: flex-end;
    border-color: rgba(231,222,208,0.26);
    background: rgba(231,222,208,0.07);
  }

  .message-bubble p {
    margin: 0;
    color: #fff;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .message-bubble span {
    display: block;
    margin-top: 6px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 800;
  }

  .composer {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    min-height: 46px;
  }

  .composer input {
    height: 42px;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    padding: 0 12px;
  }

  .composer button {
    height: 42px;
  }

  .composer input {
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    padding: 0 12px;
    min-height: 42px;
  }

  @media (max-width: 1100px) {
    .messages-shell {
      width: calc(100vw - 32px);
    }

    .messages-layout,
    .card-preview,
    .offer-card {
      grid-template-columns: 1fr;
    }

    .thread-panel {
      grid-template-rows: auto;
    }
  }
`;
