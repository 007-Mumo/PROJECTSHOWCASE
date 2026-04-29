import { useRef, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const layers = [
  {
    num: "01", label: "Cloud & IT Services", sub: "Infrastructure Foundation",
    tech: "Ubuntu · UniFi · DNS · Netlify", icon: "⬡",
    color: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/20",
    desc: "The physical and virtual foundation everything else depends on. This layer is intentionally stateless — the router enforces rules mechanically, with zero knowledge of payment state, user identity, or session data.",
    detail: "Ubuntu Server hosts the control plane. UniFi manages the wireless network and gateway. DNS and DHCP run at the edge, assigning addresses and routing unauthenticated clients toward the captive portal.",
    tags: ["Ubuntu Server", "UniFi AP", "DHCP", "DNS", "NAT", "Netlify"],
    role: "Network initialization · Traffic control · Availability",
  },
  {
    num: "02", label: "Service Orchestration", sub: "Control Plane",
    tech: "Supabase Edge · Node/Express", icon: "⟳",
    color: "from-purple-500 to-indigo-500", glow: "shadow-purple-500/20",
    desc: "The central nervous system. Manages all state transitions across the system — from unauthenticated through payment pending to authorized and expired. Stateless per request, event-driven via callbacks, fully replaceable.",
    detail: "Four endpoints: /pay triggers STK push, /callback receives Safaricom webhook, /status lets the frontend poll, /grant-access calls UniFi API to open internet for the authenticated MAC address.",
    tags: ["Edge Functions", "/pay", "/callback", "/status", "/grant-access", "Idempotency"],
    role: "Event coordination · State management · External system control",
  },
  {
    num: "03", label: "Monetization Layer", sub: "Revenue Engine",
    tech: "MPESA · STK Push", icon: "₦",
    color: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/20",
    desc: "Fully abstracted payment processing. Switching between PayHero and Daraja requires changes in one module only, with zero impact on upstream or downstream layers.",
    detail: "STK Push initiates from the backend, triggers a PIN prompt on the user's Safaricom handset, and receives an async webhook on completion. Idempotency keys prevent duplicate processing on retries.",
    tags: ["PayHero", "Daraja API", "STK Push", "Webhooks", "Retry-safe", "M-Pesa"],
    role: "Payment initiation · Verification · Transaction finalization",
  },
  {
    num: "04", label: "Data & Intelligence", sub: "Persistence + Insight",
    tech: "Supabase PostgreSQL", icon: "◫",
    color: "from-orange-500 to-amber-500", glow: "shadow-orange-500/20",
    desc: "The data backbone. Transactions and sessions are stored in separate tables by design — this separation allows retries without corrupting session state and produces clean billing reconciliations.",
    detail: "Four core tables: users (identity), transactions (payment lifecycle), sessions (access grants), and webhook_logs (full audit trail). Every state change is written before it is acted upon.",
    tags: ["PostgreSQL", "users", "transactions", "sessions", "webhook_logs"],
    role: "State persistence · Auditability · Analytics foundation",
  },
  {
    num: "05", label: "Captive Portal", sub: "Access Enforcement Bridge",
    tech: "UniFi Guest Portal · Netlify", icon: "◉",
    color: "from-pink-500 to-rose-500", glow: "shadow-pink-500/20",
    desc: "The Policy Enforcement Point (PEP) bridging infrastructure and application. Infrastructure mechanically enforces who can pass traffic; the backend makes the authorization decision. These responsibilities never cross.",
    detail: "UniFi intercepts all HTTP requests from unauthenticated clients via DNS redirect. Once the backend grants access, UniFi updates the client's firewall rule in real time.",
    tags: ["UniFi Guest Portal", "PEP", "HTTP Redirect", "MAC-based ACL"],
    role: "Traffic interception · Portal redirect · Access gating",
  },
  {
    num: "06", label: "Frontend Layer", sub: "User Interaction",
    tech: "React (Vite) · Tailwind CSS", icon: "▣",
    color: "from-indigo-500 to-purple-500", glow: "shadow-indigo-500/20",
    desc: "The only user-visible layer, but deliberately logic-free. The frontend holds no critical state and makes no authorization decisions. The backend is always the source of truth.",
    detail: "Three screens: phone number entry, payment pending with real-time status polling, and success/error state. Designed to complete in under 30 seconds on a first visit.",
    tags: ["React (Vite)", "Tailwind CSS", "Stateless UI", "Status Polling"],
    role: "Minimal-friction UX · Real-time feedback · Zero local state",
  },
];

const stateFlow = [
  { label: "Unauth'd", active: false },
  { label: "Pending", active: false },
  { label: "Paid", active: true },
  { label: "Authorized", active: false },
  { label: "Expired", active: false },
];

const protocols = [
  {
    group: "Network Layer", color: "from-cyan-500 to-blue-500", dot: "bg-cyan-400", icon: "◈",
    intro: "Foundation protocols handling physical addressing, IP assignment, and LAN-level communication. These operate entirely below the application layer.",
    items: [
      { name: "DHCP", full: "Dynamic Host Configuration Protocol", info: "Every client receives an IP address, subnet mask, gateway, and DNS server via DHCP lease. This is the first protocol a device uses — it must have a valid IP before it can reach the captive portal." },
      { name: "DNS", full: "Domain Name System", info: "Resolves prototype.kesltd.co.ke and app.kesltd.co.ke to Netlify's CDN edge nodes via CNAME records. For unauthenticated clients, UniFi intercepts DNS responses to redirect all queries to the captive portal IP." },
      { name: "ARP", full: "Address Resolution Protocol", info: "Maps IP addresses to MAC addresses within the LAN. UniFi uses MAC addresses as the unique identifier for granting or revoking individual client access after payment." },
    ],
  },
  {
    group: "Transport & Application", color: "from-purple-500 to-indigo-500", dot: "bg-purple-400", icon: "⟳",
    intro: "The protocols that carry application data reliably across the network and define how the system's components communicate with each other and with external services.",
    items: [
      { name: "TCP / TLS", full: "Transmission Control Protocol + Transport Layer Security", info: "TCP provides reliable, ordered delivery for all API requests, payment callbacks, and database connections. TLS 1.3 encrypts every connection end-to-end. No sensitive data ever travels in plaintext." },
      { name: "REST + Webhooks", full: "Representational State Transfer + Async Event Delivery", info: "REST defines the synchronous request/response contract (JSON over HTTPS). Webhooks handle the async half — Safaricom POSTs a signed callback to /callback on payment confirmation." },
      { name: "Captive Portal Flow", full: "HTTP Interception → Redirect → External App", info: "Unauthenticated clients send any HTTP request; the gateway returns a 302 redirect to the portal URL. The portal is served from Netlify's global CDN, ensuring fast load before paid access is granted." },
    ],
  },
  {
    group: "Auth & Payment", color: "from-emerald-500 to-teal-500", dot: "bg-emerald-400", icon: "₦",
    intro: "Protocols and flows handling identity verification, secure payment authorization, and M-Pesa mobile money integration.",
    items: [
      { name: "STK Push", full: "SIM Toolkit Push — M-Pesa Payment Flow", info: "The backend sends a push request to Daraja/PayHero, which forwards it to Safaricom's core network. Safaricom delivers a PIN prompt directly to the user's SIM toolkit — no app required." },
      { name: "RADIUS (Planned)", full: "Remote Authentication Dial-In User Service", info: "Standard AAA protocol for enterprise WiFi. Planned for a future iteration to centralize credential management across multiple APs and enable per-user bandwidth accounting." },
      { name: "HTTPS APIs", full: "Daraja / PayHero Secure API Communication", info: "All payment provider communication uses HTTPS with mutual TLS. API keys are stored as Edge Function environment secrets — never in source code. Request signatures validate callback origin." },
    ],
  },
];

const deployEnvs = [
  { sub: "docs.kesltd.co.ke", purpose: "Architecture documentation & system showcase. Always accessible without touching the live portal.", dns: "CNAME → Netlify", badge: "Docs", badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25", href: "https://docs.kesltd.co.ke" },
  { sub: "prototype.kesltd.co.ke", purpose: "Staging environment for controlled feature testing before promotion to production.", dns: "CNAME → Netlify", badge: "Staging", badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/25", href: "https://prototype.kesltd.co.ke" },
  { sub: "app.kesltd.co.ke", purpose: "Production — live user-facing WiFi portal. Receives only validated, promoted builds.", dns: "CNAME → Netlify", badge: "Production", badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", href: "https://app.kesltd.co.ke" },
];

const roadmap = [
  { icon: "⬡", title: "RADIUS + AAA Integration", body: "Centralized authentication and accounting for enterprise multi-AP deployments and ISP subscriber management." },
  { icon: "⟳", title: "Real-Time Session Control", body: "WebSocket-based live session management, bandwidth throttling, and instant access revocation without polling." },
  { icon: "⬗", title: "Multi-Tenant ISP Model", body: "Isolate subscriber groups across physical locations under a single orchestration layer with per-tenant billing." },
  { icon: "◈", title: "AI Bandwidth Allocation", body: "ML on usage patterns for dynamic QoS, predictive pricing, and anomaly-based fraud detection." },
];

const insights = [
  { title: "Infrastructure is policy-driven, not logic-driven", body: "The router enforces access rules mechanically — no knowledge of payment state, user identity, or session data. Business logic lives exclusively in the backend.", border: "border-l-cyan-400" },
  { title: "Payments are inherently asynchronous", body: "STK Push is fire-and-forget. The system bridges this with webhook confirmation, idempotency keys for retry safety, and frontend status polling — three mechanisms that together make async payments reliable.", border: "border-l-purple-400" },
  { title: "Transactions and sessions are intentionally separate", body: "Separate tables allow the system to retry a failed payment without corrupting an existing session, enable accurate billing reconciliation, and produce clean audit trails independent of internet access state.", border: "border-l-emerald-400" },
  { title: "Every layer is independently replaceable", body: "Supabase ↔ Flask ↔ Node. PayHero ↔ Daraja. UniFi ↔ OpenWrt. No business logic leaks between layers — defined interface contracts at each boundary mean any component can be swapped without cascading changes.", border: "border-l-orange-400" },
];

const featureCards = [
  { icon: "⬡", color: "from-cyan-500 to-blue-500", title: "Network Infrastructure", desc: "Ubuntu Server + UniFi create a carrier-grade access network. Policy-driven, not logic-driven — infrastructure enforces rules without knowing why." },
  { icon: "₦", color: "from-emerald-500 to-teal-500", title: "M-Pesa Payments", desc: "STK Push via PayHero and Daraja. Fully abstracted — switching providers is a single-module change with zero platform impact." },
  { icon: "◫", color: "from-orange-500 to-amber-500", title: "Data & Audit Layer", desc: "Every transaction, session, and webhook persisted before acting on it. Separated by design for clean billing, retry safety, and full audit trails." },
  { icon: "▣", color: "from-indigo-500 to-purple-500", title: "Zero-Friction Portal", desc: "Phone number in, STK Push out, internet on — in under 30 seconds. A stateless React UI that reflects backend truth without holding any critical local state." },
];

const navItems = [
  { label: "Architecture", id: "architecture" },
  { label: "Protocols", id: "protocols" },
  { label: "Deployment", id: "deployment" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function GradientBtn({ href, children, className = "", onClick }: { href?: string; children: React.ReactNode; className?: string; onClick?: () => void }) {
  const inner = (
    <span className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-opacity px-4 py-2 text-sm ${className}`}>
      {children}
    </span>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer">{inner}</a>;
  return <button onClick={onClick} className="bg-transparent border-0 p-0">{inner}</button>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-xs text-primary tracking-widest uppercase flex items-center gap-2 mb-4">
      <span className="w-5 h-px bg-primary inline-block" />
      {children}
    </div>
  );
}

function HeroIcon({ icon, color, className = "" }: { icon: string; color: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/5 flex items-center justify-center ${className}`}
      style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.08))" }}>
      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-4xl shadow-2xl`}>
        {icon}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Index() {
  const architectureRef = useRef<HTMLElement>(null);
  const protocolsRef = useRef<HTMLElement>(null);
  const deploymentRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("architecture");

  const refs: Record<string, React.RefObject<HTMLElement>> = {
    architecture: architectureRef, protocols: protocolsRef, deployment: deploymentRef,
  };

  const scrollTo = (id: string) => {
    refs[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
    setActiveSection(id);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection((e.target as HTMLElement).dataset.section || "architecture");
        });
      },
      { rootMargin: "-50% 0px -45% 0px" }
    );
    Object.entries(refs).forEach(([id, ref]) => {
      if (ref.current) {
        ref.current.dataset.section = id;
        observer.observe(ref.current);
      }
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    document.title = "GPON BILLING SYSTEM · WiFi Portal System Architecture";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Layered, telecom-inspired WiFi portal platform: Ubuntu, UniFi, M-Pesa STK Push, and Supabase. Ericsson-aligned architecture documentation.";
    if (meta) meta.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.name = "description"; m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen text-foreground">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[10%] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,hsl(var(--primary)),transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle,hsl(var(--primary-glow)),transparent 70%)" }} />
      </div>

      {/* DESKTOP NAV */}
      <nav className="hidden sm:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 md:px-8 h-14 border-b border-border"
        style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" style={{ animation: "pulse-dot 2s infinite" }} />
          <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">GPON.BILLING.SYSTEM</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          {navItems.map(({ label, id }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={`font-mono text-[11px] tracking-widest uppercase transition-colors bg-transparent border-0 cursor-pointer ${activeSection === id ? "text-foreground" : "text-foreground/45 hover:text-foreground/80"}`}>
              {label}
            </button>
          ))}
          <GradientBtn href="https://app.kesltd.co.ke" className="text-xs">Live Portal ↗</GradientBtn>
        </div>
      </nav>

      {/* MOBILE TOP BAR */}
      <div className="flex sm:hidden fixed top-0 left-0 right-0 z-50 items-center justify-between px-4 h-14 border-b border-border"
        style={{ background: "hsl(var(--background) / 0.9)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" style={{ animation: "pulse-dot 2s infinite" }} />
          <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">GPON.BILLING.SYSTEM</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-white/5"
          aria-label="Menu">
          <span className={`block w-5 h-px bg-foreground transition-all duration-300 origin-center ${menuOpen ? "rotate-45 translate-y-[5px]" : ""}`} />
          <span className={`block w-5 h-px bg-foreground transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-px bg-foreground transition-all duration-300 origin-center ${menuOpen ? "-rotate-45 -translate-y-[5px]" : ""}`} />
        </button>
      </div>

      {/* MOBILE DRAWER */}
      <div className={`sm:hidden fixed inset-0 z-40 transition-all duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div className={`absolute top-14 left-0 right-0 border-b border-border transition-transform duration-300 ${menuOpen ? "translate-y-0" : "-translate-y-4"}`}
          style={{ background: "hsl(var(--background) / 0.97)", backdropFilter: "blur(20px)" }}>
          <div className="px-4 py-6 flex flex-col gap-2">
            {navItems.map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className={`w-full text-left px-4 py-3.5 rounded-xl font-mono text-sm tracking-widest uppercase transition-colors border ${activeSection === id ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-white/5 text-foreground/60 hover:bg-white/10 hover:text-foreground"}`}>
                {label}
              </button>
            ))}
            <div className="pt-2 border-t border-border mt-1">
              <GradientBtn href="https://app.kesltd.co.ke" className="w-full justify-center text-sm py-3">
                Live Portal ↗
              </GradientBtn>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border grid grid-cols-4"
        style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(16px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {navItems.map(({ label, id }) => (
          <button key={id} onClick={() => scrollTo(id)}
            className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeSection === id ? "text-primary" : "text-foreground/35"}`}>
            <span className="text-base">{id === "architecture" ? "⬡" : id === "protocols" ? "◈" : "⬗"}</span>
            <span className="font-mono text-[9px] tracking-wider uppercase">{label}</span>
          </button>
        ))}
        <a href="https://app.kesltd.co.ke" target="_blank" rel="noreferrer"
          className="flex flex-col items-center justify-center gap-1 py-3 text-primary">
          <span className="text-base">↗</span>
          <span className="font-mono text-[9px] tracking-wider uppercase">Portal</span>
        </a>
      </div>

      {/* PAGE BODY */}
      <div className="relative z-10 pt-14 pb-16 sm:pb-0">
        {/* HERO */}
        <section className="px-4 sm:px-6 md:px-8 py-12 sm:py-20 md:py-28 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div>
              <Badge className="mb-5 bg-primary/15 text-primary border border-primary/25 rounded-full px-3 py-1 text-[10px] sm:text-xs font-mono tracking-widest uppercase hover:bg-primary/20">
                System Architecture Documentation
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mb-5 sm:mb-7">
                WiFi Portal System
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))]">
                  Ericsson-Aligned Platform
                </span>
              </h1>
              <p className="text-foreground/65 text-base sm:text-lg leading-relaxed mb-4 sm:mb-5">
                A layered, telecom-inspired network service platform built on Ubuntu Server, UniFi infrastructure,
                M-Pesa payment integration, and Supabase — designed for real-world ISP scalability.
              </p>
              <p className="text-foreground/40 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 hidden sm:block">
                Rather than a simple web application, this is a{" "}
                <span className="text-foreground/65 font-semibold">network service platform</span> where connectivity,
                identity, payment, and access control operate as independent but coordinated layers — mirroring
                the Ericsson model of Cloud &amp; IT → Service Orchestration → Monetization → Data &amp; Intelligence.
              </p>
              <div className="flex flex-wrap gap-3">
                <GradientBtn href="https://prototype.kesltd.co.ke" className="text-xs sm:text-sm px-5 sm:px-6 py-2.5">
                  View Prototype ↗
                </GradientBtn>
                <button onClick={() => scrollTo("architecture")}
                  className="rounded-xl border border-border bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-foreground text-xs sm:text-sm px-5 sm:px-6 py-2.5 transition-colors">
                  Explore Architecture
                </button>
              </div>
            </div>

            <div className="hidden lg:block">
              <HeroIcon icon="⬡" color="from-primary to-[hsl(var(--primary-glow))]"
                className="rounded-2xl border border-border aspect-[4/3] shadow-2xl shadow-primary/20" />
            </div>
          </div>

          <div className="flex gap-6 sm:gap-8 pt-6 mt-6 sm:pt-8 sm:mt-8 border-t border-border font-mono text-[10px] sm:text-xs text-foreground/35 uppercase tracking-widest overflow-x-auto pb-1">
            {[["Stack", "React + Supabase"], ["Network", "UniFi + Ubuntu"], ["Payments", "PayHero / Daraja"], ["Layers", "5 Architectural"], ["Model", "Ericsson-Aligned"]].map(([k, v]) => (
              <span key={k} className="flex-shrink-0">{k} <span className="text-primary font-bold normal-case tracking-normal">{v}</span></span>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20 border-t border-border"
          style={{ background: "hsl(var(--foreground) / 0.015)" }}>
          <div className="max-w-6xl mx-auto">
            <SectionLabel>Platform Capabilities</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">Built for Production</h2>
            <p className="text-foreground/60 text-base sm:text-lg max-w-2xl mb-10 sm:mb-14 leading-relaxed">
              Four core capabilities that make this a real-world network service platform, not just a web app.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {featureCards.map((card) => (
                <div key={card.title}
                  className="group rounded-2xl border border-border bg-white/5 overflow-hidden hover:bg-white/[0.08] hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-primary/15 transition-all duration-300"
                  style={{ backdropFilter: "blur(12px)" }}>
                  <div className="relative h-36 sm:h-40">
                    <HeroIcon icon={card.icon} color={card.color}
                      className="h-36 sm:h-40 opacity-90 group-hover:opacity-100 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">{card.title}</h3>
                    <p className="text-sm sm:text-base text-foreground/55 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ARCHITECTURE */}
        <section ref={architectureRef} className="px-4 sm:px-6 md:px-8 py-14 sm:py-20 md:py-24"
          style={{ scrollMarginTop: "56px" }}>
          <div className="max-w-6xl mx-auto">
            <SectionLabel>System Layers</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-5">System Architecture</h2>
            <p className="text-foreground/65 text-base sm:text-lg md:text-xl max-w-3xl mb-4 sm:mb-5 leading-relaxed">
              Each layer operates independently, communicates through defined interfaces, and can be replaced without
              collapsing the system — mirroring real-world telecom and ISP design.
            </p>
            <p className="text-foreground/40 text-sm sm:text-base max-w-2xl mb-10 sm:mb-14 leading-relaxed hidden sm:block">
              Infrastructure is never aware of business logic; business logic is never aware of how infrastructure
              enforces its decisions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10 sm:mb-16">
              {layers.map((l) => (
                <Card key={l.num}
                  className={`border border-border bg-white/5 shadow-lg ${l.glow} hover:bg-white/[0.09] hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 overflow-hidden`}
                  style={{ backdropFilter: "blur(12px)" }}>
                  <CardHeader className="p-5 sm:p-7 pb-3 sm:pb-4">
                    <div className="font-mono text-[10px] sm:text-[11px] text-foreground/30 tracking-widest mb-2 sm:mb-3">
                      {l.num} · {l.sub}
                    </div>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${l.color} flex items-center justify-center text-lg sm:text-xl mb-3 sm:mb-4 shadow-lg`}>
                      {l.icon}
                    </div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground">{l.label}</CardTitle>
                    <p className="font-mono text-[10px] sm:text-xs text-foreground/30 mt-1">{l.tech}</p>
                  </CardHeader>
                  <CardContent className="px-5 sm:px-7 pb-5 sm:pb-7">
                    <p className="text-sm sm:text-base text-foreground/60 leading-relaxed mb-3 sm:mb-4">{l.desc}</p>
                    <p className="hidden sm:block text-xs sm:text-sm text-foreground/40 leading-relaxed mb-4 sm:mb-5 border-l-2 border-border pl-3 sm:pl-4 italic">{l.detail}</p>
                    <p className="font-mono text-[10px] text-foreground/25 tracking-wide mb-3 sm:mb-4">{l.role}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {l.tags.map((t) => (
                        <span key={t} className="font-mono text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded border border-border text-foreground/40 bg-white/5">{t}</span>
                      ))}
                    </div>
                    <div className={`mt-4 sm:mt-5 h-px rounded-full bg-gradient-to-r ${l.color} opacity-40`} />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* State lifecycle */}
            <div className="rounded-2xl border border-border bg-white/5 p-5 sm:p-8 mb-8 sm:mb-10"
              style={{ backdropFilter: "blur(12px)" }}>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">Session State Lifecycle</h3>
              <p className="text-foreground/55 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl leading-relaxed">
                The orchestration layer manages deterministic state transitions triggered by payment callbacks,
                API calls, or timer expiry.
              </p>
              <div className="flex items-center overflow-x-auto pb-2 gap-0 -mx-1">
                {stateFlow.map((s, i) => (
                  <div key={s.label} className="flex items-center flex-shrink-0 px-1">
                    <div className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-mono border whitespace-nowrap ${
                      s.active ? "border-primary/60 bg-primary/20 text-primary shadow-lg shadow-primary/25" : "border-border bg-white/5 text-foreground/45"}`}>
                      {s.label}
                    </div>
                    {i < stateFlow.length - 1 && (
                      <div className="flex items-center mx-1 flex-shrink-0">
                        <div className="w-4 sm:w-8 h-px bg-foreground/15" />
                        <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[4px] border-l-foreground/15" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {insights.map(({ title, body, border }) => (
                <div key={title}
                  className={`p-5 sm:p-7 rounded-2xl border border-border bg-white/5 border-l-4 ${border} hover:bg-white/[0.07] transition-colors`}
                  style={{ backdropFilter: "blur(8px)" }}>
                  <h4 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-2 sm:mb-3">{title}</h4>
                  <p className="text-sm sm:text-base text-foreground/55 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROTOCOLS */}
        <section ref={protocolsRef}
          className="px-4 sm:px-6 md:px-8 py-14 sm:py-20 md:py-24 border-t border-border"
          style={{ background: "hsl(var(--foreground) / 0.018)", scrollMarginTop: "56px" }}>
          <div className="max-w-6xl mx-auto">
            <SectionLabel>Network Engineering</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-5">Protocol Stack</h2>
            <p className="text-foreground/65 text-base sm:text-lg md:text-xl max-w-3xl mb-4 sm:mb-5 leading-relaxed">
              A multi-protocol network service platform where each OSI layer plays a defined, non-overlapping role.
            </p>
            <p className="text-foreground/40 text-sm sm:text-base max-w-2xl mb-10 sm:mb-16 leading-relaxed hidden sm:block">
              Network protocols handle connectivity. Application protocols handle business logic. Payment protocols
              handle monetization. Each group is independent — making the system resilient to change at any single layer.
            </p>

            <div className="flex flex-col gap-6 sm:gap-10">
              {protocols.map((pg) => (
                <div key={pg.group}
                  className="rounded-2xl border border-border bg-white/5 overflow-hidden shadow-lg shadow-primary/5"
                  style={{ backdropFilter: "blur(12px)" }}>
                  <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-border flex items-start sm:items-center gap-4 sm:gap-5"
                    style={{ background: "hsl(var(--foreground) / 0.025)" }}>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${pg.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg flex-shrink-0`}>
                      {pg.icon}
                    </div>
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">{pg.group}</h3>
                      <p className="text-sm sm:text-base text-foreground/50 leading-relaxed mt-1 max-w-2xl">{pg.intro}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {pg.items.map((item) => (
                      <div key={item.name}
                        className="px-5 sm:px-8 py-6 sm:py-8 sm:flex gap-6 md:gap-10 hover:bg-white/[0.03] transition-colors">
                        <div className="sm:w-48 md:w-64 flex-shrink-0 mb-3 sm:mb-0">
                          <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5 sm:mb-2">
                            <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${pg.dot} flex-shrink-0`} />
                            <span className="text-xl sm:text-2xl font-bold text-foreground">{item.name}</span>
                          </div>
                          <p className="font-mono text-[10px] sm:text-[11px] text-foreground/30 leading-snug pl-[18px] sm:pl-[22px]">{item.full}</p>
                        </div>
                        <div className="flex-1 sm:border-l sm:border-border sm:pl-8 md:pl-10">
                          <p className="text-sm sm:text-base md:text-lg text-foreground/60 leading-relaxed">{item.info}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEPLOYMENT */}
        <section ref={deploymentRef}
          className="px-4 sm:px-6 md:px-8 py-14 sm:py-20 md:py-24 border-t border-border"
          style={{ scrollMarginTop: "56px" }}>
          <div className="max-w-6xl mx-auto">
            <SectionLabel>Infrastructure</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-5">Deployment Architecture</h2>
            <p className="text-foreground/65 text-base sm:text-lg md:text-xl max-w-3xl mb-4 sm:mb-5 leading-relaxed">
              Three-environment DNS strategy separating documentation, staging, and production into isolated
              subdomains — enabling safe iteration without touching the live user environment.
            </p>
            <p className="text-foreground/40 text-sm sm:text-base max-w-2xl mb-10 sm:mb-14 leading-relaxed hidden sm:block">
              All three subdomains resolve via CNAME to Netlify's global CDN edge. DNS changes propagate
              independently per environment — a staging deployment never risks the production portal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-10 sm:mb-12">
              {deployEnvs.map((env) => (
                <div key={env.sub}
                  className="rounded-2xl border border-border bg-white/5 p-6 sm:p-8 flex flex-col gap-4 sm:gap-5 hover:bg-white/[0.08] hover:-translate-y-1 sm:hover:-translate-y-1.5 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
                  style={{ backdropFilter: "blur(12px)" }}>
                  <Badge className={`${env.badgeClass} border rounded-full text-[10px] font-mono tracking-wide w-fit hover:opacity-90`}>
                    {env.badge}
                  </Badge>
                  <div>
                    <p className="font-mono text-xs sm:text-sm text-primary mb-2 sm:mb-3 break-all">{env.sub}</p>
                    <p className="text-sm sm:text-base text-foreground/55 leading-relaxed">{env.purpose}</p>
                  </div>
                  <div className="mt-auto pt-4 sm:pt-5 border-t border-border flex items-center justify-between">
                    <span className="font-mono text-[11px] text-foreground/25">{env.dns}</span>
                    <GradientBtn href={env.href} className="text-xs">Visit ↗</GradientBtn>
                  </div>
                </div>
              ))}
            </div>

            {/* Roadmap */}
            <div className="rounded-2xl border border-border bg-white/5 p-6 sm:p-10 shadow-lg shadow-primary/10"
              style={{ backdropFilter: "blur(12px)" }}>
              <div className="font-mono text-[11px] text-foreground/25 tracking-widest uppercase mb-2">Roadmap</div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3 tracking-tight">Future Direction</h3>
              <p className="text-sm sm:text-base text-foreground/45 mb-8 sm:mb-10 max-w-2xl leading-relaxed">
                The platform's modular layer design allows these capabilities to be added as independent services
                without restructuring the core system.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                {roadmap.map((r) => (
                  <div key={r.title} className="flex gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-border flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                      {r.icon}
                    </div>
                    <div>
                      <h5 className="text-base sm:text-lg md:text-xl font-bold text-foreground/90 mb-1 sm:mb-1.5">{r.title}</h5>
                      <p className="text-sm sm:text-base text-foreground/50 leading-relaxed">{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-border px-4 sm:px-8 py-8 sm:py-10 text-center">
          <p className="font-mono text-[10px] sm:text-[11px] text-foreground/25 tracking-widest uppercase mb-4">
            GPON BILLING SYSTEM  ·
          </p>
          <div className="flex justify-center gap-4 sm:gap-6 flex-nowrap sm:flex-wrap overflow-x-auto mb-5 sm:mb-6 pb-1">
            {deployEnvs.map((env) => (
              <a key={env.sub} href={env.href} target="_blank" rel="noreferrer"
                className="font-mono text-[10px] sm:text-xs text-primary hover:opacity-80 transition-opacity flex-shrink-0">
                {env.sub}
              </a>
            ))}
          </div>
          <GradientBtn href="https://app.kesltd.co.ke" className="text-xs sm:text-sm px-6 sm:px-8 py-2.5">
            Launch Live Portal ↗
          </GradientBtn>
        </footer>
      </div>
    </div>
  );
}
