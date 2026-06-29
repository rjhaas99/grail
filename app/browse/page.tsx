import Link from "next/link";
import Header from "../components/Header";

const cards = [
  {
    set: "1986 Fleer",
    name: "Michael Jordan #57",
    title: "1986 Fleer Michael Jordan #57",
    grade: "PSA 9",
    price: "$4,500",
    gain: "+12.5%",
    accent: "#c93222",
  },
  {
    set: "2003 Topps Chrome",
    name: "LeBron James #111",
    title: "2003 Topps Chrome LeBron James #111",
    grade: "PSA 10",
    price: "$2,850",
    gain: "+8.3%",
    accent: "#cf9a30",
  },
  {
    set: "1952 Topps",
    name: "Mickey Mantle #311",
    title: "1952 Topps Mickey Mantle #311",
    grade: "PSA 8",
    price: "$1,250",
    gain: "+6.1%",
    accent: "#3f7eb7",
  },
  {
    set: "2018 Panini Prizm",
    name: "Luka Doncic #280",
    title: "2018 Panini Prizm Luka Doncic #280",
    grade: "PSA 10",
    price: "$950",
    gain: "+9.7%",
    accent: "#2f5fbf",
  },
  {
    set: "2017 Prizm",
    name: "Patrick Mahomes II #269",
    title: "2017 Prizm Patrick Mahomes II #269",
    grade: "PSA 10",
    price: "$775",
    gain: "+11.2%",
    accent: "#bf3336",
  },
  {
    set: "1997 Metal Universe",
    name: "Kobe Bryant #81",
    title: "1997 Metal Universe Kobe Bryant #81",
    grade: "PSA 9",
    price: "$620",
    gain: "+7.4%",
    accent: "#6d4bc0",
  },
  {
    set: "1991 Topps Update",
    name: "Mike Trout #US175",
    title: "1991 Topps Update Mike Trout #US175",
    grade: "PSA 9",
    price: "$580",
    gain: "+5.2%",
    accent: "#bd4938",
  },
  {
    set: "2020 Panini Prizm",
    name: "Zion Williamson #248",
    title: "2020 Panini Prizm Zion Williamson #248",
    grade: "PSA 10",
    price: "$540",
    gain: "+10.8%",
    accent: "#26715b",
  },
];

const sellers = [
  ["1", "CardKing23", "$128,450"],
  ["2", "GoatBreaks", "$97,230"],
  ["3", "PrimeCollector", "$78,910"],
  ["4", "LegacySports", "$64,220"],
  ["5", "EliteFlips", "$51,340"],
];

const filterGroups = [
  ["Sport", "All Sports"],
  ["Category", "All Categories"],
  ["Year", "All Years"],
  ["Grading Company", "All Companies"],
  ["Grade", "All Grades"],
];

function CardArtwork({
  accent,
  label,
  large = false,
  size,
}: {
  accent: string;
  label: string;
  large?: boolean;
  size?: "grid" | "side" | "center";
}) {
  const artworkSize = size ?? (large ? "center" : "grid");
  const isCenter = artworkSize === "center";
  const isSide = artworkSize === "side";
  const isGrid = artworkSize === "grid";

  return (
    <div
      style={{
        width: isCenter ? "168px" : isSide ? "118px" : "58px",
        height: isCenter ? "226px" : isSide ? "158px" : "80px",
        borderRadius: isCenter ? "12px" : isSide ? "9px" : "6px",
        border: "1px solid rgba(244,244,245,0.48)",
        background:
          "linear-gradient(180deg,#e8e8ea 0%,#f7f7f8 16%,#b91c1c 17%,#f8fafc 18%,#18181b 100%)",
        boxShadow: isCenter
          ? "0 0 48px rgba(255,255,255,0.26), 0 22px 44px rgba(0,0,0,0.72)"
          : isSide
            ? "0 0 24px rgba(255,255,255,0.13), 0 15px 28px rgba(0,0,0,0.62)"
            : "0 9px 18px rgba(0,0,0,0.48)",
        padding: isCenter ? "10px" : isSide ? "7px" : "5px",
        position: "relative",
      }}
    >
      <div
        style={{
          height: isCenter ? "28px" : isSide ? "19px" : "12px",
          borderRadius: isGrid ? "3px" : "5px",
          background: "#f8fafc",
          color: "#111827",
          fontSize: isCenter ? "8px" : isSide ? "6px" : "5px",
          fontWeight: 900,
          lineHeight: isCenter ? "12px" : isSide ? "8px" : "6px",
          padding: isCenter ? "3px 5px" : isSide ? "2px 4px" : "1px 2px",
          overflow: "hidden",
          textTransform: "uppercase",
        }}
      >
        {isGrid ? "GRAIL" : label}
      </div>
      <div
        style={{
          marginTop: isCenter ? "8px" : isSide ? "6px" : "4px",
          height: isCenter ? "151px" : isSide ? "104px" : "50px",
          borderRadius: isCenter ? "8px" : isSide ? "6px" : "4px",
          border: "1px solid rgba(255,255,255,0.32)",
          background: `radial-gradient(circle at 52% 35%, rgba(255,255,255,0.32), transparent 11%), linear-gradient(145deg, ${accent}, #111827 58%, #020617)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: isCenter ? "50px" : isSide ? "35px" : "17px",
            top: isCenter ? "34px" : isSide ? "27px" : "12px",
            width: isCenter ? "54px" : isSide ? "36px" : "17px",
            height: isCenter ? "88px" : isSide ? "60px" : "28px",
            borderRadius: isGrid ? "999px" : "999px 999px 10px 10px",
            background: "rgba(255,255,255,0.84)",
            opacity: 0.84,
            transform: "skew(-8deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: isCenter ? "-32px" : isSide ? "-24px" : "-12px",
            bottom: isCenter ? "-15px" : isSide ? "-12px" : "-6px",
            width: isCenter ? "116px" : isSide ? "78px" : "38px",
            height: isCenter ? "90px" : isSide ? "62px" : "30px",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        />
      </div>
      <div
        style={{
          marginTop: isCenter ? "8px" : isSide ? "6px" : "4px",
          height: isCenter ? "11px" : isSide ? "8px" : "5px",
          borderRadius: "999px",
          background: accent,
        }}
      />
    </div>
  );
}

function SelectRow({ label, value }: { label: string; value: string }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          color: "#85858f",
          fontSize: "9px",
          lineHeight: "10px",
        }}
      >
        {label}
      </span>
      <select
        defaultValue={value}
        style={{
          marginTop: "3px",
          width: "100%",
          height: "23px",
          border: "1px solid #202026",
          borderRadius: "6px",
          background: "#08080a",
          color: "#e4e4e7",
          fontSize: "10px",
          padding: "0 8px",
          outline: "none",
        }}
      >
        <option>{value}</option>
      </select>
    </label>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "22px",
        border: "1px solid #2f2f36",
        borderRadius: "5px",
        color: "#d4d4d8",
        fontSize: "10px",
        fontWeight: 800,
        padding: "0 8px",
        background: "rgba(9,9,11,0.74)",
      }}
    >
      {children}
    </span>
  );
}

export default function BrowsePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        minWidth: "1280px",
        background:
          "radial-gradient(circle at 50% -80px, rgba(234,179,8,0.08), transparent 36%), #000",
        color: "#fafafa",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "auto",
      }}
    >
      <div style={{ width: "1240px", margin: "0 auto", padding: "8px 0 12px" }}>
        <Header />

        <section
          style={{
            height: "250px",
            marginTop: "10px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            background:
              "radial-gradient(circle at 51% 44%, rgba(255,255,255,0.16), transparent 22%), radial-gradient(circle at 72% 50%, rgba(255,255,255,0.05), transparent 28%), linear-gradient(90deg,#020202 0%,#080808 50%,#020202 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {[0, 1, 2].map((line) => (
            <span
              key={line}
              style={{
                position: "absolute",
                right: line === 0 ? "44px" : line === 1 ? "122px" : "286px",
                top: line === 0 ? "112px" : line === 1 ? "143px" : "163px",
                width: line === 2 ? "390px" : "330px",
                height: "2px",
                borderRadius: "999px",
                background:
                  "linear-gradient(90deg, transparent, rgba(217,119,6,0.32), transparent)",
                boxShadow: "0 0 12px rgba(245,158,11,0.18)",
                transform: line === 1 ? "rotate(-13deg)" : "rotate(-18deg)",
                opacity: line === 2 ? 0.16 : 0.26,
              }}
            />
          ))}

          <button
            type="button"
            aria-label="Previous featured card"
            style={{
              position: "absolute",
              left: "17px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "31px",
              height: "31px",
              borderRadius: "999px",
              border: "1px solid #26262d",
              background: "rgba(5,5,6,0.78)",
              color: "#d4d4d8",
              fontSize: "18px",
              lineHeight: "26px",
              zIndex: 3,
            }}
          >
            &lt;
          </button>
          <button
            type="button"
            aria-label="Next featured card"
            style={{
              position: "absolute",
              right: "17px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "31px",
              height: "31px",
              borderRadius: "999px",
              border: "1px solid #26262d",
              background: "rgba(5,5,6,0.78)",
              color: "#d4d4d8",
              fontSize: "18px",
              lineHeight: "26px",
              zIndex: 3,
            }}
          >
            &gt;
          </button>

          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "grid",
              gridTemplateColumns: "330px 460px 250px",
              alignItems: "center",
              gap: "26px",
              padding: "0 72px",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "40px",
                  lineHeight: "43px",
                  fontWeight: 900,
                  letterSpacing: "0",
                  whiteSpace: "nowrap",
                }}
              >
                BROWSE GRAILS
              </h1>
              <p
                style={{
                  margin: "13px 0 0",
                  color: "#d4d4d8",
                  fontSize: "16px",
                  lineHeight: "21px",
                  fontWeight: 700,
                }}
              >
                Elite cards. Serious collectors.
              </p>
              <Link
                href="#browse-listings"
                style={{
                  marginTop: "28px",
                  width: "206px",
                  height: "48px",
                  borderRadius: "8px",
                  border: "1px solid #34343b",
                  background: "rgba(9,9,11,0.72)",
                  color: "#fff",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "13px",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                Browse Listings <span aria-hidden="true">&darr;</span>
              </Link>
            </div>

            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "260px",
                  height: "230px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.28), rgba(255,255,255,0.09) 42%, transparent 72%)",
                  filter: "blur(2px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "8px",
                  top: "54%",
                  width: "150px",
                  height: "130px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.1), transparent 66%)",
                  filter: "blur(2px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "54%",
                  width: "150px",
                  height: "130px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.1), transparent 66%)",
                  filter: "blur(2px)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: "420px",
                  height: "226px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "18px",
                }}
              >
                <div style={{ transform: "translateY(18px)", opacity: 0.84 }}>
                  <CardArtwork
                    accent={cards[1].accent}
                    label="2003 Topps Chrome LeBron James #111"
                    size="side"
                  />
                </div>
                <div style={{ position: "relative", zIndex: 3 }}>
                  <CardArtwork
                    accent={cards[0].accent}
                    label="1986 Fleer Michael Jordan #57"
                    size="center"
                  />
                </div>
                <div style={{ transform: "translateY(18px)", opacity: 0.84 }}>
                  <CardArtwork
                    accent={cards[4].accent}
                    label="2017 Panini Prizm Patrick Mahomes II #269"
                    size="side"
                  />
                </div>
              </div>
            </div>

            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "24px",
                  border: "1px solid rgba(251,191,36,0.24)",
                  borderRadius: "6px",
                  color: "#e8c06f",
                  background: "rgba(180,83,9,0.08)",
                  padding: "0 10px",
                  fontSize: "10px",
                  fontWeight: 900,
                }}
              >
                FEATURED CARD
              </span>
              <h2
                style={{
                  margin: "12px 0 0",
                  color: "#fff",
                  fontSize: "20px",
                  lineHeight: "25px",
                  fontWeight: 900,
                }}
              >
                1986 Fleer
                <br />
                Michael Jordan
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#d4d4d8",
                  fontSize: "15px",
                  lineHeight: "18px",
                  fontWeight: 700,
                }}
              >
                Rookie Card #57
              </p>
              <div style={{ marginTop: "12px" }}>
                <StatPill>PSA 9</StatPill>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "34px",
                  lineHeight: "36px",
                  fontWeight: 900,
                }}
              >
                $4,500
              </p>
              <Link
                href="/cards/michael-jordan-57"
                style={{
                  marginTop: "10px",
                  height: "38px",
                  width: "158px",
                  borderRadius: "8px",
                  border: "1px solid rgba(251,191,36,0.38)",
                  background:
                    "linear-gradient(180deg,rgba(255,255,255,0.08),rgba(146,64,14,0.12))",
                  color: "#fff",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 900,
                  boxShadow: "0 0 16px rgba(255,255,255,0.08)",
                }}
              >
                View Card
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            height: "390px",
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: "168px 752px 296px",
            gap: "12px",
            minHeight: 0,
          }}
        >
          <aside
            style={{
              height: "390px",
              minHeight: 0,
              boxSizing: "border-box",
              border: "1px solid #1d1d22",
              borderRadius: "8px",
              background: "#050506",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 900 }}>
                FILTERS
              </h2>
              <button
                type="button"
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#85858f",
                  fontSize: "10px",
                  padding: 0,
                }}
              >
                Reset
              </button>
            </div>

            <div style={{ display: "grid", gap: "7px", marginTop: "10px" }}>
              {filterGroups.map(([label, value]) => (
                <SelectRow key={label} label={label} value={value} />
              ))}
              <div>
                <span
                  style={{
                    display: "block",
                    color: "#85858f",
                    fontSize: "9px",
                    lineHeight: "10px",
                  }}
                >
                  Price Range
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                    marginTop: "3px",
                  }}
                >
                  {["$ Min", "$ Max"].map((value) => (
                    <div
                      key={value}
                      style={{
                        height: "23px",
                        border: "1px solid #202026",
                        borderRadius: "6px",
                        background: "#08080a",
                        color: "#666671",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 8px",
                        fontSize: "9px",
                      }}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                style={{
                  height: "27px",
                  border: "1px solid #26262d",
                  borderRadius: "6px",
                  background: "#070708",
                  color: "#f4f4f5",
                  fontSize: "10px",
                  fontWeight: 900,
                }}
              >
                More Filters
              </button>
              <button
                type="button"
                style={{
                  height: "27px",
                  border: "1px solid rgba(251,191,36,0.3)",
                  borderRadius: "6px",
                  background: "rgba(180,83,9,0.12)",
                  color: "#f4f4f5",
                  fontSize: "10px",
                  fontWeight: 900,
                }}
              >
                Save Search
              </button>
            </div>
          </aside>

          <section
            id="browse-listings"
            style={{
              height: "390px",
              boxSizing: "border-box",
              border: "1px solid #1d1d22",
              borderRadius: "8px",
              background: "#050506",
              padding: "12px",
            }}
          >
            <div
              style={{
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p style={{ margin: 0, color: "#a1a1aa", fontSize: "12px" }}>
                342,123 cards found
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link
                  href="/list"
                  style={{
                    height: "28px",
                    width: "90px",
                    borderRadius: "6px",
                    border: "1px solid rgba(251,191,36,0.46)",
                    background: "rgba(180,83,9,0.15)",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  List a Card
                </Link>
                <select
                  defaultValue="Sort: Featured"
                  style={{
                    width: "112px",
                    height: "28px",
                    border: "1px solid #202026",
                    borderRadius: "6px",
                    background: "#08080a",
                    color: "#d4d4d8",
                    fontSize: "10px",
                    padding: "0 7px",
                  }}
                >
                  <option>Sort: Featured</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
                marginTop: "10px",
              }}
            >
              {cards.map((card) => (
                <article
                  key={card.title}
                  style={{
                    height: "158px",
                    border: "1px solid #202026",
                    borderRadius: "8px",
                    background:
                      "linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0)), #09090b",
                    padding: "9px",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Save ${card.title}`}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "8px",
                      width: "21px",
                      height: "21px",
                      border: "1px solid #2d2d34",
                      borderRadius: "999px",
                      background: "rgba(0,0,0,0.58)",
                      color: "#d4d4d8",
                      fontSize: "13px",
                      lineHeight: "18px",
                      padding: 0,
                      zIndex: 2,
                    }}
                  >
                    &#9825;
                  </button>
                  <div
                    style={{
                      height: "70px",
                      borderRadius: "7px",
                      background:
                        "radial-gradient(circle at 50% 8%, rgba(251,191,36,0.1), transparent 46%), #030304",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <CardArtwork accent={card.accent} label={card.set} />
                  </div>
                  <p
                    style={{
                      height: "32px",
                      margin: "7px 0 0",
                      color: "#f4f4f5",
                      fontSize: "11px",
                      lineHeight: "14px",
                      fontWeight: 900,
                      overflow: "hidden",
                    }}
                  >
                    {card.set}
                    <br />
                    {card.name}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      color: "#7b7b85",
                      fontSize: "9px",
                      lineHeight: "11px",
                      fontWeight: 800,
                    }}
                  >
                    {card.grade}
                  </p>
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      gap: "6px",
                    }}
                  >
                    <strong
                      style={{
                        color: "#fff",
                        fontSize: "15px",
                        lineHeight: "16px",
                        fontWeight: 900,
                      }}
                    >
                      {card.price}
                    </strong>
                    <span
                      style={{
                        color: "#4ade80",
                        fontSize: "10px",
                        lineHeight: "12px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {card.gain}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside
            style={{
              height: "390px",
              display: "grid",
              gridTemplateRows: "190px 188px",
              gap: "12px",
            }}
          >
            <section
              style={{
                border: "1px solid #1d1d22",
                borderRadius: "8px",
                background: "#050506",
                padding: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 900 }}>
                  MARKET OVERVIEW
                </h2>
                <StatPill>7D</StatPill>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  marginTop: "13px",
                }}
              >
                <div>
                  <p style={{ margin: 0, color: "#85858f", fontSize: "10px" }}>
                    Total Sales
                  </p>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "3px",
                      fontSize: "22px",
                      lineHeight: "24px",
                    }}
                  >
                    $28.4M
                  </strong>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#4ade80",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    +12.5%
                  </p>
                </div>
                <div style={{ borderLeft: "1px solid #1d1d22", paddingLeft: "14px" }}>
                  <p style={{ margin: 0, color: "#85858f", fontSize: "10px" }}>
                    Total Listings
                  </p>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "3px",
                      fontSize: "22px",
                      lineHeight: "24px",
                    }}
                  >
                    342K
                  </strong>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#4ade80",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    +8.3%
                  </p>
                </div>
              </div>
              <svg
                role="img"
                aria-label="Seven day market trend"
                viewBox="0 0 260 70"
                style={{ width: "100%", height: "74px", marginTop: "8px" }}
              >
                <path
                  d="M0 58 C27 55 36 36 64 33 C88 31 95 45 122 41 C150 37 158 22 187 29 C216 35 226 25 260 15 L260 70 L0 70 Z"
                  fill="rgba(74,222,128,0.22)"
                />
                <path
                  d="M0 58 C27 55 36 36 64 33 C88 31 95 45 122 41 C150 37 158 22 187 29 C216 35 226 25 260 15"
                  fill="none"
                  stroke="#72d66d"
                  strokeWidth="3"
                />
                <line x1="0" y1="59" x2="260" y2="59" stroke="#1f2937" />
              </svg>
            </section>

            <section
              style={{
                border: "1px solid #1d1d22",
                borderRadius: "8px",
                background: "#050506",
                padding: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 900 }}>
                  TOP SELLERS
                </h2>
                <button
                  type="button"
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#85858f",
                    fontSize: "10px",
                    padding: 0,
                  }}
                >
                  View All
                </button>
              </div>
              <div style={{ display: "grid", gap: "5px" }}>
                {sellers.map(([rank, seller, sales]) => (
                  <div
                    key={seller}
                    style={{
                      height: "20px",
                      display: "grid",
                      gridTemplateColumns: "18px 23px 1fr auto",
                      alignItems: "center",
                      gap: "7px",
                      color: "#e4e4e7",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#f4f4f5", fontWeight: 900 }}>{rank}</span>
                    <span
                      style={{
                        width: "21px",
                        height: "21px",
                        borderRadius: "999px",
                        background:
                          "linear-gradient(135deg, rgba(251,191,36,0.34), rgba(39,39,42,1))",
                        border: "1px solid #303037",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "8px",
                        fontWeight: 900,
                      }}
                    >
                      {seller.slice(0, 1)}
                    </span>
                    <strong style={{ fontSize: "11px" }}>{seller}</strong>
                    <span style={{ color: "#d4d4d8", fontWeight: 900 }}>{sales}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
