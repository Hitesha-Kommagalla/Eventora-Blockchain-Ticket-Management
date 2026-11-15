
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  Ticket, CalendarDays, MapPin, Wallet, Search, Plus,
  ShieldCheck, Sparkles, ArrowRight, Clock, CheckCircle2,
  LayoutGrid, UserRound, Menu, X, RefreshCw
} from "lucide-react";
import contractArtifact from "./blockchain/contract.json";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import "./App.css";

// Existing deployed contract address
const CONTRACT_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
const ABI = contractArtifact.abi;

const sampleImages = [
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85",
];

const categories = ["All Events", "Music", "Technology", "Workshop", "Festival"];

function formatDate(timestamp) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("Explore Events");
  const [category, setCategory] = useState("All Events");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [verification, setVerification] = useState(null);

  const [withdrawableBalance, setWithdrawableBalance] = useState("0");

  const [form, setForm] = useState({
    name: "",
    venue: "",
    date: "",
    price: "0.01",
    quantity: "100",
  });

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });


  const saveProfile = () => {
    if (!account) {
      setError("Please connect your wallet first.");
      return;
    }

    if (!profile.name.trim() || !profile.email.trim()) {
      setError("Please enter your name and email.");
      return;
    }

    localStorage.setItem(
      `eventora_profile_${account.toLowerCase()}`,
      JSON.stringify(profile)
    );

    setError("");
    setNotice("Profile saved successfully!");
  };

  // Update form
  const [editingEvent, setEditingEvent] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    venue: "",
    date: "",
    price: "",
    quantity: "",
  });

  // Connect MetaMask
  const connectWallet = async () => {
    try {
      setError("");

      if (!window.ethereum) {
        setError("Please install MetaMask to connect your wallet.");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      if (network.chainId !== 31337n) {
        setError("Please switch MetaMask to the Localhost 8545 network (Chain ID 31337).");
        return;
      }

      if (
        !CONTRACT_ADDRESS.startsWith("0x") ||
        CONTRACT_ADDRESS.length !== 42
      ) {
        setError("Add your deployed contract address in App.jsx first.");
        return;
      }

      const instance = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      setAccount(accounts[0]);
      setContract(instance);

      await loadWithdrawableBalance(instance, accounts[0]);

      setNotice("Wallet connected successfully!");
    } catch (e) {
      setError(e.shortMessage || e.message || "Unable to connect wallet.");
    }
  };

  // Load all events
  const loadEvents = useCallback(async (instance) => {
    if (!instance) return;

    try {
      const count = Number(await instance.eventCount());
      const list = [];

      for (let i = 1; i <= count; i++) {
        const e = await instance.getFunction("getEvent")(i);

        list.push({
          id: Number(e.id),
          name: e.name,
          venue: e.venue,
          date: Number(e.eventDate),
          price: e.ticketPrice,
          total: Number(e.totalTickets),
          sold: Number(e.ticketsSold),
          organizer: e.organizer,
          active: e.active,
        });
      }

      setEvents(list.reverse());
    } catch (e) {
      setError("Could not load events. Check your network and contract address.");
    }
  }, []);

  // Load tickets belonging to connected wallet
  const loadTickets = useCallback(async (instance) => {
    if (!instance) return;

    try {
      const ids = await instance.getMyTickets();
      const list = [];

      for (const id of ids) {
        const ticketId = Number(id);

        const [ticket, status] = await Promise.all([
          instance.tickets(ticketId),
          instance.verifyTicket(ticketId),
        ]);

        const e = await instance.getFunction("getEvent")(ticket.eventId);

        list.push({
          id: ticketId,
          eventId: Number(ticket.eventId),
          owner: ticket.owner,
          used: ticket.used,
          valid: status.valid,
          eventName: e.name,
          venue: e.venue,
          date: Number(e.eventDate),
        });
      }

      setMyTickets(list.reverse());
    } catch (e) {
      setError("Could not load your tickets.");
    }
  }, []);

  const loadWithdrawableBalance = useCallback(async (instance, wallet) => {
    if (!instance || !wallet) return;

    try {
      const balance = await instance.pendingWithdrawals(wallet);

      setWithdrawableBalance(ethers.formatEther(balance));
    } catch (e) {
      console.error("Could not load withdrawal balance:", e);
    }
  }, []);


  useEffect(() => {
    if (!account) {
      setProfile({ name: "", email: "" });
      return;
    }

    const savedProfile = localStorage.getItem(
      `eventora_profile_${account.toLowerCase()}`
    );

    setProfile(
      savedProfile
        ? JSON.parse(savedProfile)
        : { name: "", email: "" }
    );
  }, [account]);


  useEffect(() => {
    if (contract) {
      loadEvents(contract);
      loadTickets(contract);
    }
  }, [contract, loadEvents, loadTickets]);

  // Handle MetaMask account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = () => {
      setAccount("");
      setContract(null);
      setMyTickets([]);
    };

    const onChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  // Create event
  const createEvent = async (e) => {
    e.preventDefault();

    if (!contract) return setError("Connect your wallet first.");

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const timestamp = Math.floor(new Date(form.date).getTime() / 1000);

      if (!Number.isFinite(timestamp) || timestamp <= Date.now() / 1000) {
        throw new Error("Please select a future date and time.");
      }

      if (Number(form.quantity) < 1 || Number(form.price) < 0) {
        throw new Error("Enter a valid ticket price and quantity.");
      }

      const tx = await contract.createEvent(
        form.name.trim(),
        form.venue.trim(),
        timestamp,
        ethers.parseEther(form.price || "0"),
        BigInt(form.quantity)
      );

      setNotice("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      setNotice("Your event has been created on the blockchain!");

      setForm({
        name: "",
        venue: "",
        date: "",
        price: "0.01",
        quantity: "100",
      });

      await loadEvents(contract);
      setActiveTab("Explore Events");
    } catch (e) {
      setError(e.shortMessage || e.reason || e.message || "Could not create event.");
    } finally {
      setLoading(false);
    }
  };

  // Buy ticket
  const buyTicket = async (event) => {
    if (!contract) return setError("Connect MetaMask before booking.");

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const tx = await contract.buyTicket(event.id, {
        value: event.price,
      });

      setNotice("Purchase submitted. Confirming on the blockchain...");
      await tx.wait();

      setNotice("Ticket purchased successfully!");

      await Promise.all([
        loadEvents(contract),
        loadTickets(contract),
      ]);

      setActiveTab("My Tickets");
    } catch (e) {
      setError(e.shortMessage || e.reason || e.message || "Ticket purchase failed.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel event
  const cancelEvent = async (eventId) => {
    if (!contract) {
      return setError("Connect your wallet first.");
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this event? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const tx = await contract.cancelEvent(eventId);

      setNotice("Cancellation submitted. Waiting for confirmation...");
      await tx.wait();

      setNotice("Event cancelled successfully!");

      await loadEvents(contract);
    } catch (e) {
      setError(
        e.shortMessage || e.reason || e.message || "Could not cancel event."
      );
    } finally {
      setLoading(false);
    }
  };


  // Open event editing form
  const startEditing = (event) => {
    const localDate = new Date(
      event.date * 1000 -
      new Date().getTimezoneOffset() * 60000
    ).toISOString().slice(0, 16);

    setEditingEvent(event.id);

    setEditForm({
      name: event.name,
      venue: event.venue,
      date: localDate,
      price: ethers.formatEther(event.price),
      quantity: String(event.total),
    });

    setActiveTab("Edit Event");
  };

  // Update event on blockchain
  const updateEvent = async (e) => {
    e.preventDefault();

    if (!contract || !editingEvent) {
      return setError("Unable to edit this event.");
    }

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const timestamp = Math.floor(
        new Date(editForm.date).getTime() / 1000
      );

      if (!Number.isFinite(timestamp) || timestamp <= Date.now() / 1000) {
        throw new Error("Please select a future date and time.");
      }

      if (
        !editForm.name.trim() ||
        !editForm.venue.trim() ||
        Number(editForm.price) <= 0 ||
        Number(editForm.quantity) < 1
      ) {
        throw new Error("Please enter valid event details.");
      }

      const tx = await contract.updateEvent(
        editingEvent,
        editForm.name.trim(),
        editForm.venue.trim(),
        timestamp,
        ethers.parseEther(editForm.price),
        BigInt(editForm.quantity)
      );

      setNotice("Update submitted. Waiting for confirmation...");
      await tx.wait();

      setNotice("Event updated successfully!");

      setEditingEvent(null);

      await loadEvents(contract);

      setActiveTab("Explore Events");
    } catch (e) {
      setError(
        e.shortMessage || e.reason || e.message || "Could not update event."
      );
    } finally {
      setLoading(false);
    }
  };

  // Withdraw organizer funds
  const withdrawFunds = async () => {
    if (!contract || !account) {
      return setError("Connect your organizer wallet first.");
    }

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const balance = await contract.pendingWithdrawals(account);

      if (balance === 0n) {
        setError("You have no funds available to withdraw.");
        return;
      }

      const tx = await contract.withdrawFunds();

      setNotice("Withdrawal submitted. Waiting for confirmation...");
      await tx.wait();

      setNotice("Funds withdrawn successfully!");

      await loadWithdrawableBalance(contract, account);
    } catch (e) {
      setError(
        e.shortMessage || e.reason || e.message || "Withdrawal failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify ticket
  const verifyMyTicket = async (id) => {
    if (!contract) return setError("Connect your wallet first.");

    try {
      setError("");

      const result = await contract.verifyTicket(id);

      setVerification({
        id,
        valid: result.valid,
        owner: result.ticketOwner,
        eventId: Number(result.eventId),
        used: result.used,
      });
    } catch (e) {
      setError(e.shortMessage || e.message || "Verification failed.");
    }
  };

  const openTicketVerification = async (id) => {
    setTicketId(String(id));
    await verifyMyTicket(id);
    setActiveTab("Verify Ticket");
  };


  const downloadTicket = (ticket) => {
    const pdf = new jsPDF();

    pdf.setFontSize(22);
    pdf.setTextColor(112, 69, 181);
    pdf.text("EVENTORA", 20, 25);

    pdf.setFontSize(18);
    pdf.setTextColor(40, 40, 40);
    pdf.text("Event Ticket", 20, 45);

    pdf.setFontSize(12);
    pdf.text(`Ticket ID: ${ticket.id}`, 20, 65);
    pdf.text(`Event: ${ticket.eventName}`, 20, 80);
    pdf.text(`Venue: ${ticket.venue}`, 20, 95);
    pdf.text(`Date: ${formatDate(ticket.date)}`, 20, 110);
    const ownerName =
      profile.name.trim() || "Eventora User";

    pdf.text(`Name: ${ownerName}`, 20, 125);
    pdf.setFontSize(9);
    pdf.text(`Wallet: ${ticket.owner}`, 20, 135);
    const qrCanvas = document.querySelector(
      `.ticket-qr-${ticket.id} canvas`
    );

    if (qrCanvas) {
      const qrImage = qrCanvas.toDataURL("image/png");
      pdf.addImage(qrImage, "PNG", 20, 150, 55, 55);
    }

    pdf.setFontSize(10);
    pdf.text("Verified through Eventora blockchain ticket records.", 20, 210);

    pdf.save(`Eventora-Ticket-${ticket.id}.pdf`);
  };

  // Mark ticket as used
  const markTicketUsed = async (id) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError("");

      const tx = await contract.useTicket(id);
      await tx.wait();

      setNotice(`Ticket #${id} marked as used.`);

      await Promise.all([
        loadTickets(contract),
        loadEvents(contract),
      ]);

      await verifyMyTicket(id);
    } catch (e) {
      setError(
        e.shortMessage || e.reason || e.message ||
        "Could not mark ticket as used. Only the event organizer can do this."
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(search.toLowerCase()) ||
      event.venue.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All Events" ||
      event.name.toLowerCase().includes(category.toLowerCase());

    return matchesSearch && matchesCategory && event.active;
  });

  const money = (price) => `${ethers.formatEther(price)} ETH`;

  const navItems = [
    { label: "Explore Events", icon: LayoutGrid },
    { label: "My Tickets", icon: Ticket },
    { label: "Create Event", icon: Plus },
    { label: "Verify Ticket", icon: ShieldCheck },
    { label: "Withdraw Funds", icon: Wallet },
    { label: "My Profile", icon: UserRound },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#home"
          onClick={() => setActiveTab("Explore Events")}
        >
          <span className="brand-icon"><Ticket size={22} /></span>
          <span>eventora<span className="brand-dot">.</span></span>
        </a>

        <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${activeTab === label ? "nav-active" : ""}`}
              onClick={() => {
                setActiveTab(label);
                setMenuOpen(false);
                setError("");
              }}
            >
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          <span className="network-indicator">
            <span className="online-dot" /> Local blockchain
          </span>

          <button className="wallet-button" onClick={connectWallet}>
            <Wallet size={17} />
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>

          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main className="main-content" id="home">
        {notice && (
          <div className="notice success-notice">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
            <button onClick={() => setNotice("")}><X size={16} /></button>
          </div>
        )}

        {error && (
          <div className="notice error-notice">
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={16} /></button>
          </div>
        )}

        {/* EXPLORE EVENTS */}
        {activeTab === "Explore Events" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <Sparkles size={15} /> EXPERIENCES WORTH REMEMBERING
                </div>

                <h1>
                  Make room for<br />
                  your next <span>big moment.</span>
                </h1>

                <p>
                  Discover events, meet your people, and book your next
                  experience. Every ticket, secured on the blockchain.
                </p>

                <button
                  className="primary-button"
                  onClick={() =>
                    document.getElementById("events-section")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  Explore events <ArrowRight size={18} />
                </button>

                <div className="hero-trust">
                  <ShieldCheck size={16} />
                  Transparent bookings · Blockchain secured
                </div>
              </div>

              <div className="hero-art">
                <div className="hero-orbit orbit-one" />
                <div className="hero-orbit orbit-two" />

                <div className="hero-ticket">
                  <div className="ticket-sparkle"><Sparkles size={23} /></div>
                  <div className="ticket-label">YOUR NEXT ADVENTURE</div>
                  <div className="ticket-title">
                    Good times.<br />Great people.
                  </div>
                  <div className="ticket-stub">
                    <Ticket size={32} />
                    <span>YOUR SEAT<br />IS WAITING</span>
                  </div>
                </div>

                <div className="floating-chip chip-top">
                  <CalendarDays size={17} /> New experiences
                </div>
                <div className="floating-chip chip-bottom">
                  <ShieldCheck size={17} /> Verified on-chain
                </div>
              </div>
            </section>

            <section className="stats-row">
              <div className="stat-item">
                <span className="stat-icon lavender"><CalendarDays /></span>
                <div>
                  <strong>{events.length}</strong>
                  <span>Listed events</span>
                </div>
              </div>

              <div className="stat-item">
                <span className="stat-icon peach"><Ticket /></span>
                <div>
                  <strong>{events.reduce((sum, e) => sum + e.sold, 0)}</strong>
                  <span>Tickets booked</span>
                </div>
              </div>

              <div className="stat-item">
                <span className="stat-icon mint"><ShieldCheck /></span>
                <div>
                  <strong>On-chain</strong>
                  <span>Ticket verification</span>
                </div>
              </div>
            </section>

            <section id="events-section" className="events-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">FIND YOUR PEOPLE</div>
                  <h2>Explore experiences</h2>
                  <p>Something wonderful is happening near you.</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => contract && loadEvents(contract)}
                >
                  <RefreshCw size={15} /> Refresh events
                </button>
              </div>

              <div className="search-row">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search events or venues..."
                  />
                </div>

                <div className="category-list">
                  {categories.map((c) => (
                    <button
                      key={c}
                      className={`category-pill ${category === c ? "category-selected" : ""
                        }`}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><CalendarDays size={29} /></div>
                  <h3>No events to show just yet</h3>
                  <p>Create the first event or try a different search.</p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveTab("Create Event")}
                  >
                    <Plus size={17} /> Create an event
                  </button>
                </div>
              ) : (
                <div className="event-grid">
                  {filteredEvents.map((event, i) => {
                    const remaining = event.total - event.sold;

                    const isOrganizer =
                      account &&
                      event.organizer.toLowerCase() === account.toLowerCase();

                    return (
                      <article className="event-card" key={event.id}>
                        <div className="event-image-wrap">
                          <img
                            src={sampleImages[(event.id - 1) % sampleImages.length]}
                            alt={event.name}
                            className="event-image"
                          />

                          <span className="event-category">
                            {i % 2 === 0 ? "FEATURED EVENT" : "DON'T MISS OUT"}
                          </span>

                          <span className="event-number">
                            #{event.id.toString().padStart(3, "0")}
                          </span>
                        </div>

                        <div className="event-card-body">
                          <div className="event-date">
                            <CalendarDays size={15} /> {formatDate(event.date)}
                          </div>

                          <h3>{event.name}</h3>

                          <div className="event-venue">
                            <MapPin size={15} /> {event.venue}
                          </div>

                          <div className="event-availability">
                            <span>{remaining} tickets left</span>
                            <span>{event.sold}/{event.total} booked</span>
                          </div>

                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (event.sold / event.total) * 100
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="event-card-footer">
                            <div className="event-price">
                              <small>Ticket price</small>
                              <strong>{money(event.price)}</strong>
                            </div>

                            <div className="event-actions">
                              <button
                                className="outline-button"
                                disabled={!isOrganizer || loading}
                                title={
                                  isOrganizer
                                    ? "Edit this event"
                                    : "Only the event organizer can edit it"
                                }
                                onClick={() => startEditing(event)}
                              >
                                Edit Event
                              </button>
                              <button
                                className="outline-button"
                                disabled={!isOrganizer || loading}
                                title={
                                  isOrganizer
                                    ? "Cancel this event"
                                    : "Only the event organizer can cancel it"
                                }
                                onClick={() => cancelEvent(event.id)}
                              >
                                {isOrganizer ? "Cancel Event" : "Organizer Only"}
                              </button>

                              <button
                                className="book-button"
                                disabled={
                                  loading ||
                                  remaining <= 0 ||
                                  event.date <= Date.now() / 1000
                                }
                                onClick={() => buyTicket(event)}
                              >
                                {remaining <= 0 ? "Sold out" : "Book ticket"}
                                <ArrowRight size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}


        {/* EDIT EVENT */}
        {activeTab === "Edit Event" && (
          <section className="form-page">
            <div className="page-heading">
              <div className="eyebrow">UPDATE YOUR EXPERIENCE</div>
              <h1>Edit event<span>.</span></h1>
              <p>Make changes to your event details.</p>
            </div>

            <form className="event-form" onSubmit={updateEvent}>
              <div className="form-section-title">
                <span className="form-icon"><CalendarDays /></span>
                <div>
                  <h3>Update event details</h3>
                  <p>Modify the information below.</p>
                </div>
              </div>

              <label>
                Event name
                <input
                  required
                  maxLength={100}
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </label>

              <label>
                Venue or location
                <input
                  required
                  maxLength={150}
                  value={editForm.venue}
                  onChange={(e) =>
                    setEditForm({ ...editForm, venue: e.target.value })
                  }
                />
              </label>

              <label>
                Event date and time
                <input
                  required
                  type="datetime-local"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                />
              </label>

              <div className="form-two-columns">
                <label>
                  Ticket price (ETH)
                  <input
                    required
                    type="number"
                    min="0.000000000000000001"
                    step="any"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: e.target.value })
                    }
                  />
                </label>

                <label>
                  Total tickets
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm({ ...editForm, quantity: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-note">
                <ShieldCheck size={18} />
                <span>
                  Only the original organizer can update this event.
                  Total tickets cannot be reduced below tickets already sold.
                </span>
              </div>

              <button
                className="primary-button form-submit"
                disabled={loading}
                type="submit"
              >
                {loading ? "Updating..." : "Save Changes"}
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setEditingEvent(null);
                  setActiveTab("Explore Events");
                }}
              >
                Cancel editing
              </button>
            </form>
          </section>
        )}

        {/* CREATE EVENT */}
        {activeTab === "Create Event" && (
          <section className="form-page">
            <div className="page-heading">
              <div className="eyebrow">BRING PEOPLE TOGETHER</div>
              <h1>Create your event<span>.</span></h1>
              <p>
                Set up an experience and let blockchain handle your ticket records.
              </p>
            </div>

            <form className="event-form" onSubmit={createEvent}>
              <div className="form-section-title">
                <span className="form-icon"><CalendarDays /></span>
                <div>
                  <h3>Event details</h3>
                  <p>Tell everyone what you're planning.</p>
                </div>
              </div>

              <label>
                Event name
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mumbai Tech & Innovation Summit"
                />
              </label>

              <label>
                Venue or location
                <input
                  required
                  maxLength={150}
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="e.g. VESIT Auditorium, Mumbai"
                />
              </label>

              <label>
                Event date and time
                <input
                  required
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>

              <div className="form-two-columns">
                <label>
                  Ticket price (ETH)
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </label>

                <label>
                  Total tickets
                  <input
                    required
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-note">
                <ShieldCheck size={18} />
                <span>
                  Creating this event sends a transaction to your connected
                  blockchain account. Only the organizer can cancel the event
                  or mark its tickets as used.
                </span>
              </div>

              <button
                className="primary-button form-submit"
                disabled={loading}
                type="submit"
              >
                {loading ? "Please wait..." : "Publish event on blockchain"}
                <ArrowRight size={18} />
              </button>
            </form>
          </section>
        )}

        {/* MY TICKETS */}
        {activeTab === "My Tickets" && (
          <section className="tickets-page">
            <div className="page-heading">
              <div className="eyebrow">YOUR EXPERIENCES</div>
              <h1>My tickets<span>.</span></h1>
              <p>Your bookings, recorded on the blockchain.</p>
            </div>

            {!account ? (
              <div className="empty-state">
                <div className="empty-icon"><Wallet /></div>
                <h3>Connect your wallet</h3>
                <p>Connect the wallet you used to purchase tickets.</p>
                <button className="primary-button" onClick={connectWallet}>
                  Connect wallet
                </button>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Ticket /></div>
                <h3>Your next experience awaits</h3>
                <p>You haven't purchased any tickets with this account.</p>
                <button
                  className="primary-button"
                  onClick={() => setActiveTab("Explore Events")}
                >
                  Explore events <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <div className="my-ticket-list">
                {myTickets.map((ticket) => (
                  <article className="my-ticket" key={ticket.id}>
                    <div className="my-ticket-icon"><Ticket size={25} /></div>
                    <div className={`ticket-qr ticket-qr-${ticket.id}`}>
                      <QRCodeCanvas
                        value={JSON.stringify({
                          ticketId: ticket.id,
                          eventId: ticket.eventId,
                          owner: ticket.owner,
                        })}
                        size={120}
                        level="H"
                      />
                      <span>Ticket QR Code</span>
                    </div>

                    <div className="my-ticket-info">
                      <span className="ticket-id">TICKET #{ticket.id}</span>
                      <h3>{ticket.eventName}</h3>
                      <p>
                        <CalendarDays size={14} /> {formatDate(ticket.date)}
                        <MapPin size={14} /> {ticket.venue}
                      </p>
                    </div>

                    <div
                      className={`ticket-status ${ticket.used
                        ? "status-used"
                        : ticket.valid
                          ? "status-valid"
                          : "status-invalid"
                        }`}
                    >
                      {ticket.used
                        ? "Used"
                        : ticket.valid
                          ? "Valid"
                          : "Inactive"}
                    </div>

                    <button
                      className="outline-button"
                      onClick={() => openTicketVerification(ticket.id)}
                    >
                      Verify
                    </button>
                    <button
                      className="outline-button"
                      onClick={() => downloadTicket(ticket)}
                    >
                      Download PDF
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* VERIFY TICKET */}
        {activeTab === "Verify Ticket" && (
          <section className="verify-page">
            <div className="page-heading">
              <div className="eyebrow">TRUST EVERY TICKET</div>
              <h1>Ticket verification<span>.</span></h1>
              <p>Check a ticket's on-chain status before allowing entry.</p>
            </div>

            <div className="verify-panel">
              <div className="verify-art"><ShieldCheck size={48} /></div>

              <h2>Is this ticket authentic?</h2>
              <p>
                Enter a ticket ID to look up its owner, event, and current
                status on the blockchain.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyMyTicket(Number(ticketId));
                }}
                className="verify-form"
              >
                <label>
                  Ticket ID
                  <input
                    type="number"
                    min="1"
                    required
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="e.g. 1"
                  />
                </label>

                <button className="primary-button" disabled={!contract}>
                  Verify ticket <ShieldCheck size={17} />
                </button>
              </form>

              {verification && (
                <div
                  className={`verification-result ${verification.valid ? "result-valid" : "result-invalid"
                    }`}
                >
                  {verification.valid ? (
                    <CheckCircle2 size={26} />
                  ) : (
                    <X size={26} />
                  )}

                  <div>
                    <h3>
                      {verification.valid
                        ? "Ticket is valid"
                        : verification.used
                          ? "Ticket already used"
                          : "Ticket is invalid or inactive"}
                    </h3>

                    <p>
                      Ticket #{verification.id} · Event #{verification.eventId}
                    </p>

                    <p className="owner-address">
                      Owner: {verification.owner}
                    </p>
                  </div>

                  {verification.valid && (
                    <button
                      className="outline-button"
                      disabled={loading}
                      onClick={() => markTicketUsed(verification.id)}
                    >
                      Mark used
                    </button>
                  )}
                </div>
              )}

              <p className="verify-footnote">
                <ShieldCheck size={15} />
                Ticket status is read from the deployed smart contract.
              </p>
            </div>
          </section>
        )}

        {/* WITHDRAW FUNDS */}
        {activeTab === "Withdraw Funds" && (
          <section className="form-page">
            <div className="page-heading">
              <div className="eyebrow">ORGANIZER DASHBOARD</div>
              <h1>Withdraw funds<span>.</span></h1>
              <p>Manage the ETH earned from your event ticket bookings.</p>
            </div>

            {!account ? (
              <div className="empty-state">
                <div className="empty-icon"><Wallet /></div>
                <h3>Connect your wallet</h3>
                <p>Connect your organizer wallet to view available funds.</p>
                <button className="primary-button" onClick={connectWallet}>
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="event-form withdrawal-panel">
                <div className="form-section-title">
                  <span className="form-icon"><Wallet /></span>
                  <div>
                    <h3>Available balance</h3>
                    <p>Your earnings from ticket purchases.</p>
                  </div>
                </div>

                <div className="withdrawal-balance">
                  <strong>{withdrawableBalance} ETH</strong>
                  <span>Available to withdraw</span>
                </div>

                <button
                  className="primary-button form-submit"
                  disabled={loading || Number(withdrawableBalance) <= 0}
                  onClick={withdrawFunds}
                >
                  {loading ? "Processing..." : "Withdraw Funds"}
                  <ArrowRight size={18} />
                </button>

                <button
                  className="text-button"
                  onClick={() => loadWithdrawableBalance(contract, account)}
                >
                  <RefreshCw size={15} /> Refresh balance
                </button>

                <div className="form-note">
                  <ShieldCheck size={18} />
                  <span>
                    Only the event organizer can withdraw the funds.
                    MetaMask will ask you to confirm the transaction.
                  </span>
                </div>
              </div>
            )}
          </section>
        )}


        {/* USER PROFILE */}
        {activeTab === "My Profile" && (
          <section className="form-page">
            <div className="page-heading">
              <div className="eyebrow">YOUR EVENTORA ACCOUNT</div>
              <h1>My profile<span>.</span></h1>
              <p>Manage your personal information.</p>
            </div>

            {!account ? (
              <div className="empty-state">
                <h3>Connect your wallet</h3>
                <button className="primary-button" onClick={connectWallet}>
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="event-form">
                <div className="form-section-title">
                  <span className="form-icon"><UserRound /></span>
                  <div>
                    <h3>Personal details</h3>
                    <p>Update your Eventora profile.</p>
                  </div>
                </div>

                <label>
                  Full name
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="Enter your full name"
                  />
                </label>

                <label>
                  Email address
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    placeholder="Enter your email"
                  />
                </label>

                <label>
                  Connected wallet
                  <input value={account} readOnly />
                </label>

                <div className="form-note">
                  <ShieldCheck size={18} />
                  <span>
                    Profile information is saved locally in this browser.
                  </span>
                </div>

                <button
                  className="primary-button form-submit"
                  onClick={saveProfile}
                >
                  Save Profile
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </section>
        )}

      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon"><Ticket size={19} /></span>
          <span>eventora<span className="brand-dot">.</span></span>
        </a>

        <span>Experiences worth remembering. Tickets secured on-chain.</span>

        <span className="footer-powered">
          <span className="online-dot" /> Powered by blockchain
        </span>
      </footer>
    </div>
  );
}

export default App;
