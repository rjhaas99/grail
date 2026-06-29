import Link from "next/link";

const cards = [
  ["1986 Fleer", "Michael Jordan #57", "$4,500", "▲ 12.5%"],
  ["2003 Topps Chrome", "LeBron James #111", "$2,850", "▲ 8.3%"],
  ["1952 Topps", "Mickey Mantle #311", "$1,250", "▲ 6.1%"],
  ["2018 Panini Prizm", "Luka Doncic #280", "$950", "▲ 9.7%"],
  ["2017 Prizm", "Patrick Mahomes II #269", "$775", "▲ 11.2%"],
  ["1997 Metal Universe", "Kobe Bryant #81", "$620", "▲ 7.4%"],
  ["1991 Topps Update", "Mike Trout #US175", "$580", "▲ 5.2%"],
  ["2020 Panini Prizm", "Zion Williamson #248", "$540", "▲ 10.8%"],
];

const sellers = [
  ["1", "CardKing23", "$128,450"],
  ["2", "GoatBreaks", "$97,230"],
  ["3", "PrimeCollector", "$78,910"],
  ["4", "LegacySports", "$64,220"],
  ["5", "EliteFlips", "$51,340"],
];

export default function BrowsePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        overflowX: "auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "1180px",
          margin: "0 auto",
          padding: "16px",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            height: "58px",
            display: "grid",
            gridTemplateColumns: "220px 1fr 330px",
            alignItems: "center",
            borderBottom: "1px solid #18181b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <button style={{ fontSize: "28px", color: "white" }}>☰</button>
            <Link
              href="/"
              style={{
                color: "white",
                textDecoration: "none",
                fontSize: "30px",
                fontWeight: 900,
              }}
            >
              GRAIL
            </Link>
          </div>

          <div
            style={{
              width: "520px",
              height: "42px",
              border: "1px solid #27272a",
              borderRadius: "16px",
              background: "#09090b",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              color: "#71717a",
              fontSize: "14px",
            }}
          >
            🔎&nbsp;&nbsp; Search cards, players, teams...
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "14px",
            }}
          >
            <span style={{ fontSize: "20px" }}>☾</span>
            <span style={{ fontSize: "20px" }}>♧</span>
            <button
              style={{
                height: "38px",
                padding: "0 22px",
                border: "1px solid #27272a",
                borderRadius: "12px",
                color: "white",
              }}
            >
              Sign In
            </button>
            <button
              style={{
                height: "38px",
                padding: "0 22px",
                borderRadius: "12px",
                background: "white",
                color: "black",
                fontWeight: 800,
              }}
            >
              Get Started
            </button>
          </div>
        </header>

        <div
          style={{
            marginTop: "16px",
            border: "1px solid rgba(234,179,8,0.25)",
            borderRadius: "28px",
            overflow: "hidden",
            background: "#050505",
          }}
        >
          {/* HERO */}
          <section
            style={{
              position: "relative",
              height: "270px",
              borderBottom: "1px solid rgba(234,179,8,0.22)",
              background:
                "radial-gradient(circle at center, rgba(255,255,255,0.12), transparent 28%), radial-gradient(circle at right, rgba(245,158,11,0.35), transparent 32%), linear-gradient(90deg,#050505,#090909,#050505)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(112deg, transparent 0%, rgba(245,158,11,0.22) 68%, transparent 90%)",
              }}
            />

            <button
              style={{
                position: "absolute",
                left: "24px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "42px",
                height: "42px",
                borderRadius: "999px",
                border: "1px solid #27272a",
                color: "#d4d4d8",
                fontSize: "28px",
                zIndex: 5,
              }}
            >
              ‹
            </button>

            <button
              style={{
                position: "absolute",
                right: "24px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "42px",
                height: "42px",
                borderRadius: "999px",
                border: "1px solid #27272a",
                color: "#d4d4d8",
                fontSize: "28px",
                zIndex: 5,
              }}
            >
              ›
            </button>

            <div
              style={{
                position: "relative",
                zIndex: 2,
                height: "100%",
                display: "grid",
                gridTemplateColumns: "390px 300px 340px",
                alignItems: "center",
                padding: "0 70px",
                gap: "22px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    border: "1px solid rgba(234,179,8,0.45)",
                    background: "rgba(234,179,8,0.12)",
                    color: "#facc15",
                    padding: "6px 12px",
                    borderRadius: "7px",
                    fontSize: "11px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  Featured Card
                </div>

                <h1
                  style={{
                    marginTop: "16px",
                    fontSize: "42px",
                    lineHeight: "44px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  1986 Fleer
                  <br />
                  Michael Jordan
                </h1>

                <p
                  style={{
                    marginTop: "4px",
                    color: "#facc15",
                    fontWeight: 900,
                    fontSize: "19px",
                    textTransform: "uppercase",
                  }}
                >
                  Rookie Card #57
                </p>

                <p
                  style={{
                    marginTop: "14px",
                    width: "320px",
                    color: "#a1a1aa",
                    fontSize: "14px",
                    lineHeight: "21px",
                  }}
                >
                  The most iconic rookie card in basketball history. A true
                  grail for serious collectors.
                </p>

                <button
                  style={{
                    marginTop: "18px",
                    height: "44px",
                    padding: "0 24px",
                    borderRadius: "12px",
                    border: "1px solid rgba(234,179,8,0.75)",
                    background: "rgba(234,179,8,0.12)",
                    color: "white",
                    fontWeight: 800,
                    boxShadow: "0 0 22px rgba(245,158,11,0.25)",
                  }}
                >
                  View Featured Card →
                </button>
              </div>

              <div
                style={{
                  position: "relative",
                  height: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "280px",
                    height: "42px",
                    borderRadius: "999px",
                    background: "#18181b",
                    boxShadow: "0 0 45px rgba(255,255,255,0.18)",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    marginBottom: "12px",
                    height: "230px",
                    width: "170px",
                    borderRadius: "18px",
                    border: "1px solid #3f3f46",
                    background: "#18181b",
                    padding: "12px",
                    boxShadow: "0 0 55px rgba(255,255,255,0.2)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: "100%",
                      border: "2px solid #a1a1aa",
                      borderRadius: "12px",
                      background: "linear-gradient(160deg,#1f2937,#050505)",
                    }}
                  />
                </div>
              </div>

              <div style={{ paddingLeft: "28px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    border: "1px solid #3f3f46",
                    borderRadius: "7px",
                    padding: "5px 10px",
                    color: "#d4d4d8",
                    fontSize: "12px",
                  }}
                >
                  PSA 9
                </div>

                <h2
                  style={{
                    marginTop: "18px",
                    fontSize: "48px",
                    fontWeight: 900,
                  }}
                >
                  $4,500
                </h2>

                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    gap: "12px",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "#71717a" }}>Market Price</span>
                  <span style={{ color: "#4ade80", fontWeight: 800 }}>
                    ▲ 12.5% (7D)
                  </span>
                </div>

                <button
                  style={{
                    marginTop: "22px",
                    height: "44px",
                    padding: "0 30px",
                    borderRadius: "12px",
                    border: "1px solid rgba(234,179,8,0.75)",
                    background: "rgba(234,179,8,0.12)",
                    color: "white",
                    fontWeight: 800,
                    boxShadow: "0 0 22px rgba(245,158,11,0.25)",
                  }}
                >
                  View Card Details
                </button>
              </div>
            </div>
          </section>

          {/* BODY */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "175px 635px 330px",
              gap: "14px",
              padding: "14px",
            }}
          >
            {/* FILTERS */}
            <aside
              style={{
                height: "430px",
                border: "1px solid #18181b",
                borderRadius: "18px",
                background: "#000",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "13px", fontWeight: 900 }}>FILTERS</h2>
                <button style={{ fontSize: "11px", color: "#71717a" }}>
                  Reset
                </button>
              </div>

              <div style={{ marginTop: "16px", display: "grid", gap: "11px" }}>
                {["Sport", "Category", "Year", "Grading Company", "Grade"].map(
                  (label) => (
                    <label key={label}>
                      <span style={{ fontSize: "11px", color: "#71717a" }}>
                        {label}
                      </span>
                      <select
                        style={{
                          marginTop: "5px",
                          width: "100%",
                          height: "32px",
                          border: "1px solid #27272a",
                          borderRadius: "8px",
                          background: "#09090b",
                          color: "white",
                          fontSize: "11px",
                          padding: "0 8px",
                        }}
                      >
                        <option>
                          {label === "Sport"
                            ? "All Sports"
                            : label === "Category"
                            ? "All Categories"
                            : label === "Year"
                            ? "All Years"
                            : label === "Grade"
                            ? "All Grades"
                            : "All Companies"}
                        </option>
                      </select>
                    </label>
                  )
                )}

                <button
                  style={{
                    height: "36px",
                    border: "1px solid #27272a",
                    borderRadius: "9px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  More Filters
                </button>

                <button
                  style={{
                    height: "36px",
                    border: "1px solid #27272a",
                    borderRadius: "9px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  Save Search
                </button>
              </div>
            </aside>

            {/* CARDS */}
            <section
              style={{
                height: "430px",
                border: "1px solid #18181b",
                borderRadius: "18px",
                background: "#000",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: "12px", color: "#a1a1aa" }}>
                  342,123 cards found
                </p>

                <select
                  style={{
                    height: "30px",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    background: "#09090b",
                    color: "white",
                    fontSize: "11px",
                  }}
                >
                  <option>Sort: Featured</option>
                </select>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                }}
              >
                {cards.map((card) => (
                  <div
                    key={card[0] + card[1]}
                    style={{
                      height: "170px",
                      border: "1px solid #18181b",
                      borderRadius: "13px",
                      background: "#09090b",
                      padding: "8px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        height: "78px",
                        borderRadius: "9px",
                        background: "#000",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "42px",
                          height: "62px",
                          border: "1px solid #71717a",
                          borderRadius: "5px",
                          background: "#18181b",
                        }}
                      />
                    </div>

                    <p
                      style={{
                        marginTop: "7px",
                        height: "28px",
                        overflow: "hidden",
                        fontSize: "11px",
                        lineHeight: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {card[0]}
                      <br />
                      {card[1]}
                    </p>

                    <p style={{ marginTop: "3px", fontSize: "10px", color: "#71717a" }}>
                      PSA 9
                    </p>

                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "end",
                      }}
                    >
                      <p style={{ fontSize: "15px", fontWeight: 900 }}>
                        {card[2]}
                      </p>
                      <p style={{ fontSize: "10px", fontWeight: 800, color: "#4ade80" }}>
                        {card[3]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* RIGHT */}
            <aside style={{ height: "430px", display: "grid", gap: "14px" }}>
              <div
                style={{
                  height: "150px",
                  border: "1px solid #18181b",
                  borderRadius: "18px",
                  background: "#000",
                  padding: "16px",
                }}
              >
                <h2 style={{ fontSize: "13px", fontWeight: 900 }}>
                  MARKET OVERVIEW
                </h2>
                <div
                  style={{
                    marginTop: "14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "11px", color: "#71717a" }}>Total Sales</p>
                    <p style={{ fontSize: "22px", fontWeight: 900 }}>$28.4M</p>
                    <p style={{ fontSize: "11px", color: "#4ade80" }}>▲ 12.5%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: "#71717a" }}>Total Listings</p>
                    <p style={{ fontSize: "22px", fontWeight: 900 }}>342K</p>
                    <p style={{ fontSize: "11px", color: "#4ade80" }}>▲ 8.3%</p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  height: "150px",
                  border: "1px solid #18181b",
                  borderRadius: "18px",
                  background: "#000",
                  padding: "16px",
                }}
              >
                <h2 style={{ fontSize: "13px", fontWeight: 900 }}>TOP SELLERS</h2>
                <div style={{ marginTop: "12px", display: "grid", gap: "7px" }}>
                  {sellers.map((seller) => (
                    <div
                      key={seller[0]}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "11px",
                      }}
                    >
                      <span>{seller[0]} · {seller[1]}</span>
                      <span>{seller[2]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  height: "116px",
                  border: "1px solid rgba(234,179,8,0.22)",
                  borderRadius: "18px",
                  background: "radial-gradient(circle at right,rgba(245,158,11,0.18),transparent 45%),#050505",
                  padding: "16px",
                }}
              >
                <h2 style={{ fontSize: "22px", fontWeight: 900 }}>
                  Sell Your Cards
                </h2>
                <p style={{ marginTop: "8px", fontSize: "12px", color: "#a1a1aa" }}>
                  List your cards in minutes and reach collectors.
                </p>
              </div>
            </aside>
          </section>

          {/* BOTTOM BAR */}
          <section
            style={{
              height: "82px",
              borderTop: "1px solid #18181b",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
            }}
          >
            {[
              ["♢", "Secure & Trusted", "All transactions protected"],
              ["✓", "Authenticity Guaranteed", "Verified cards only"],
              ["▣", "Fast & Insured Shipping", "Track every order"],
              ["☎", "24/7 Customer Support", "We’re here to help"],
            ].map((item, index) => (
              <div
                key={item[1]}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  borderRight: index === 3 ? "none" : "1px solid #18181b",
                }}
              >
                <span style={{ fontSize: "22px" }}>{item[0]}</span>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 800 }}>{item[1]}</p>
                  <p style={{ fontSize: "12px", color: "#71717a" }}>{item[2]}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}