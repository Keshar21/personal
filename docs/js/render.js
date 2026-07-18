// Fetches JSON from ../data/*.json and renders it into the page.
// Uses DOM APIs (not innerHTML) so admin-entered text can never be
// interpreted as HTML/script when it's rendered back on public pages.

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    }
  }
  (children || []).forEach((child) => {
    if (child) node.appendChild(child);
  });
  return node;
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load " + path);
  return res.json();
}

function packageCard(pkg, { compact } = {}) {
  const media = el("div", { class: "card-media", text: pkg.icon });
  const tag = el("span", { class: "tag", text: [pkg.duration, ...(pkg.tags || [])].filter(Boolean).join(" · ") });
  const title = el("h3", { text: pkg.title });
  const desc = el("p", { text: pkg.desc });
  const price = el("span", { class: "price", text: pkg.price });
  const link = el("a", { href: "packages.html", class: "btn btn-primary", text: compact ? "View" : "View Details" });
  const meta = el("div", { class: "card-meta" }, [price, link]);
  const body = el("div", { class: "card-body" }, [tag, title, desc, meta]);
  return el("div", { class: "card" }, [media, body]);
}

function destinationCard(dest) {
  const media = el("div", { class: "card-media", text: dest.icon });
  const tag = el("span", { class: "tag", text: dest.tag });
  const title = el("h3", { text: dest.title });
  const desc = el("p", { text: dest.desc });
  const price = el("span", { class: "price", text: dest.featured ? "Must-see" : "Off the beaten path" });
  const link = el("a", { href: "packages.html", class: "btn btn-primary", text: "See Packages" });
  const meta = el("div", { class: "card-meta" }, [price, link]);
  const body = el("div", { class: "card-body" }, [tag, title, desc, meta]);
  return el("div", { class: "card" }, [media, body]);
}

function fullPackageCard(pkg) {
  const media = el("div", { class: "package-media", text: pkg.icon });

  const priceBlock = el("div", { class: "package-price" }, [
    el("span", { class: "price", text: pkg.price }),
    el("span", { class: "per", text: "per person" }),
  ]);
  const top = el("div", { class: "package-top" }, [el("h3", { text: pkg.title }), priceBlock]);

  const pills = [el("span", { class: "pill", text: pkg.duration })];
  if (pkg.difficulty) pills.push(el("span", { class: "pill", text: pkg.difficulty }));
  (pkg.tags || []).forEach((t) => pills.push(el("span", { class: "pill accent", text: t })));
  const meta = el("div", { class: "package-meta" }, pills);

  const desc = el("p", { class: "desc", text: pkg.desc });

  const highlights = el(
    "ul",
    { class: "package-highlights" },
    (pkg.highlights || []).map((h) => el("li", { text: h }))
  );

  const actions = el("div", { class: "package-actions" }, [
    el("a", { href: "itineraries.html#" + pkg.id, class: "btn btn-secondary btn-sm", text: "View Itinerary" }),
    el("a", { href: "contact.html", class: "btn btn-primary btn-sm", text: "Book Now" }),
  ]);

  const body = el("div", { class: "package-body" }, [top, meta, desc, highlights, actions]);
  return el("div", { class: "package-card" }, [media, body]);
}

function itineraryBlock(itin) {
  const header = el("div", { class: "itinerary-header" }, [
    el("h2", { text: itin.title }),
    el("span", { class: "pill", text: itin.duration }),
  ]);

  const dayItems = (itin.days || []).map((d) =>
    el("li", { class: "day-item" }, [
      el("span", { class: "day-label", text: d.day }),
      el("h4", { text: d.title }),
      el("p", { text: d.desc }),
    ])
  );
  const list = el("ul", { class: "day-list" }, dayItems);

  return el("div", { id: itin.id, class: "itinerary-block" }, [header, list]);
}

async function renderPackages(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const packages = await loadJSON("../data/packages.json");
  container.innerHTML = "";
  packages.forEach((pkg) => container.appendChild(fullPackageCard(pkg)));
}

async function renderItinerarySelect(selectId) {
  const container = document.getElementById(selectId);
  if (!container) return;
  const itineraries = await loadJSON("../data/itineraries.json");
  container.innerHTML = "";
  itineraries.forEach((itin) => {
    container.appendChild(el("a", { href: "#" + itin.id, text: itin.title }));
  });
}

async function renderItineraries(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const itineraries = await loadJSON("../data/itineraries.json");
  container.innerHTML = "";
  itineraries.forEach((itin) => container.appendChild(itineraryBlock(itin)));
}

async function renderDestinations(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const destinations = await loadJSON("../data/destinations.json");
  container.innerHTML = "";
  destinations.forEach((dest) => container.appendChild(destinationCard(dest)));
}

async function renderHomeFeatured({ destinationsId, packagesId }) {
  const [destinations, packages] = await Promise.all([
    loadJSON("../data/destinations.json"),
    loadJSON("../data/packages.json"),
  ]);

  const destContainer = document.getElementById(destinationsId);
  if (destContainer) {
    destContainer.innerHTML = "";
    destinations
      .filter((d) => d.featured)
      .forEach((dest) => destContainer.appendChild(destinationCard(dest)));
  }

  const pkgContainer = document.getElementById(packagesId);
  if (pkgContainer) {
    pkgContainer.innerHTML = "";
    packages
      .filter((p) => p.featured)
      .forEach((pkg) => pkgContainer.appendChild(packageCard(pkg, { compact: true })));
  }
}

async function renderHomeHero({ titleId, textId }) {
  const site = await loadJSON("../data/site.json");
  const titleEl = document.getElementById(titleId);
  const textEl = document.getElementById(textId);
  if (titleEl) titleEl.textContent = site.home.heroTitle;
  if (textEl) textEl.textContent = site.home.heroText;
}

async function renderAbout({ headingId, paragraphsId, statsId, valuesId }) {
  const site = await loadJSON("../data/site.json");
  const about = site.about;

  const headingEl = document.getElementById(headingId);
  if (headingEl) headingEl.textContent = about.heading;

  const paraContainer = document.getElementById(paragraphsId);
  if (paraContainer) {
    paraContainer.innerHTML = "";
    about.paragraphs.forEach((p) => {
      paraContainer.appendChild(el("p", { style: "color: var(--gray); margin-bottom: 16px;", text: p }));
    });
  }

  const statsContainer = document.getElementById(statsId);
  if (statsContainer) {
    statsContainer.innerHTML = "";
    about.stats.forEach((s) => {
      statsContainer.appendChild(
        el("div", { class: "stat" }, [el("strong", { text: s.value }), el("span", { text: s.label })])
      );
    });
  }

  const valuesContainer = document.getElementById(valuesId);
  if (valuesContainer) {
    valuesContainer.innerHTML = "";
    about.values.forEach((v) => {
      valuesContainer.appendChild(
        el("div", { class: "card" }, [
          el("div", { class: "card-body" }, [el("h3", { text: v.title }), el("p", { text: v.desc })]),
        ])
      );
    });
  }
}

async function renderPackageOptions(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const packages = await loadJSON("../data/packages.json");
  packages.forEach((pkg) => {
    select.appendChild(el("option", { value: pkg.id, text: pkg.title + " (" + pkg.duration + ")" }));
  });
  select.appendChild(el("option", { value: "custom", text: "Custom Itinerary" }));
}

async function renderContact(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const site = await loadJSON("../data/site.json");
  const contact = site.contact;
  container.innerHTML = "";

  const rows = [
    { icon: "@", label: "Email", value: contact.email },
    { icon: "☎", label: "Phone", value: contact.phone },
    { icon: "📍", label: "Office", value: contact.address },
    { icon: "🕐", label: "Hours", value: contact.hours },
  ];

  rows.forEach((row) => {
    container.appendChild(
      el("div", { class: "item" }, [
        el("div", { class: "icon", text: row.icon }),
        el("div", {}, [el("h4", { text: row.label }), el("p", { text: row.value })]),
      ])
    );
  });
}
