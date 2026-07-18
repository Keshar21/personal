// Admin dashboard: edits data/*.json in the GitHub repo directly via the
// GitHub Contents API, using a token the admin pastes in once (see setup
// screen for the security tradeoffs of that approach).

const CONFIG_KEY = "esr_admin_config";
const API = "https://api.github.com";
// Contents API paths are always relative to the repo root, not to wherever
// GitHub Pages serves from — this site lives under /docs in the repo.
const DATA_DIR = "docs/data";

// Cosmetic front door only — there's no server to check this against, so
// it lives in plain sight in this file. It's not real security; the actual
// safeguard is the GitHub token below and keeping this page's link private.
const ADMIN_PHONE = "+975 17 91 69 09";
const ADMIN_PASSWORD = "elohim$ignettravels@26#";
const LOGIN_SESSION_KEY = "esr_admin_logged_in";

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY));
  } catch {
    return null;
  }
}

function setConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ===== GitHub Contents API =====

async function ghGetFile(path) {
  const cfg = getConfig();
  const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  const data = await res.json();
  const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  return { value: JSON.parse(decoded), sha: data.sha };
}

async function ghPutFile(path, value, sha, message) {
  const cfg = getConfig();
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(value, null, 2) + "\n"))),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Could not save ${path} (${res.status})`);
  }
  const result = await res.json();
  return result.content.sha;
}

// ===== Toast =====

function toast(message, isError) {
  const node = el("div", { class: "toast" + (isError ? " error" : ""), text: message });
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 4000);
}

// ===== Modal =====

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
  document.getElementById("modal-content").innerHTML = "";
}

function openModal(titleText, formNode) {
  const content = document.getElementById("modal-content");
  content.innerHTML = "";
  content.appendChild(el("h3", { text: titleText }));
  content.appendChild(formNode);
  document.getElementById("modal-overlay").classList.remove("hidden");
}

document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target.id === "modal-overlay") closeModal();
});

// ===== Form field helpers =====

function formGroup(labelText, inputNode) {
  return el("div", { class: "form-group" }, [el("label", { text: labelText }), inputNode]);
}

function textInput(value) {
  const input = el("input", { type: "text" });
  input.value = value || "";
  return input;
}

function textareaInput(value) {
  const input = el("textarea", {});
  input.value = value || "";
  return input;
}

function checkboxRow(labelText, checked) {
  const input = el("input", { type: "checkbox" });
  input.checked = !!checked;
  return el("div", { class: "form-group checkbox-row" }, [input, el("label", { text: labelText })]);
}

// checkboxRow puts the input first; helper to read it back
function checkboxValue(groupNode) {
  return groupNode.querySelector("input").checked;
}
function inputValue(groupNode) {
  return groupNode.querySelector("input, textarea").value;
}

// ===== State =====

let state = { packages: null, itineraries: null, destinations: null, site: null };

// ===== Tabs =====

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ===== Packages =====

async function loadPackages() {
  const container = document.getElementById("packages-list");
  try {
    state.packages = await ghGetFile(`${DATA_DIR}/packages.json`);
    renderPackagesList();
  } catch (e) {
    container.innerHTML = "";
    container.appendChild(el("p", { class: "empty-text", text: e.message }));
  }
}

function renderPackagesList() {
  const container = document.getElementById("packages-list");
  container.innerHTML = "";
  const items = state.packages.value;
  if (!items.length) {
    container.appendChild(el("p", { class: "empty-text", text: "No packages yet." }));
    return;
  }
  items.forEach((pkg) => {
    const info = el("div", { class: "row-info" }, [
      el("h4", { text: `${pkg.icon || ""} ${pkg.title}` }),
      el("p", { text: `${pkg.duration} · ${pkg.price}${pkg.featured ? " · Featured on Home" : ""}` }),
    ]);
    const editBtn = el("button", { class: "icon-btn edit", text: "Edit" });
    editBtn.addEventListener("click", () => openPackageForm(pkg));
    const delBtn = el("button", { class: "icon-btn delete", text: "Delete" });
    delBtn.addEventListener("click", () => deletePackage(pkg.id));
    const actions = el("div", { class: "row-actions" }, [editBtn, delBtn]);
    container.appendChild(el("div", { class: "admin-row" }, [info, actions]));
  });
}

function openPackageForm(pkg) {
  const isNew = !pkg;
  const titleInput = textInput(pkg?.title);
  const iconInput = textInput(pkg?.icon || "🏔️");
  const durationInput = textInput(pkg?.duration || "5 Days / 4 Nights");
  const difficultyInput = textInput(pkg?.difficulty || "Easy");
  const priceInput = textInput(pkg?.price || "$1,000");
  const tagsInput = textInput((pkg?.tags || []).join(", "));
  const descInput = textareaInput(pkg?.desc);
  const highlightsInput = textareaInput((pkg?.highlights || []).join("\n"));
  const featuredGroup = checkboxRow("Show on Home page as featured", pkg?.featured);

  const form = el("form", {}, [
    formGroup("Title", titleInput),
    formGroup("Icon (emoji)", iconInput),
    formGroup("Duration", durationInput),
    formGroup("Difficulty", difficultyInput),
    formGroup("Price", priceInput),
    formGroup("Tags (comma-separated)", tagsInput),
    formGroup("Short description", descInput),
    formGroup("Highlights (one per line)", highlightsInput),
    featuredGroup,
  ]);

  const saveBtn = el("button", { type: "submit", class: "btn btn-primary", text: "Save" });
  const cancelBtn = el("button", { type: "button", class: "btn btn-secondary", text: "Cancel" });
  cancelBtn.addEventListener("click", closeModal);
  form.appendChild(el("div", { class: "modal-actions" }, [cancelBtn, saveBtn]));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    const updated = {
      id: pkg?.id || slugify(title),
      title,
      icon: iconInput.value.trim(),
      duration: durationInput.value.trim(),
      difficulty: difficultyInput.value.trim(),
      price: priceInput.value.trim(),
      tags: tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean),
      desc: descInput.value.trim(),
      highlights: highlightsInput.value.split("\n").map((h) => h.trim()).filter(Boolean),
      featured: checkboxValue(featuredGroup),
    };

    const list = state.packages.value.slice();
    const idx = list.findIndex((p) => p.id === updated.id);
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);

    await savePackages(list, isNew ? `Add package: ${title}` : `Update package: ${title}`);
    closeModal();
  });

  openModal(isNew ? "Add Package" : "Edit Package", form);
}

async function deletePackage(id) {
  if (!confirm("Delete this package? This can't be undone.")) return;
  const list = state.packages.value.filter((p) => p.id !== id);
  await savePackages(list, `Delete package: ${id}`);
}

async function savePackages(list, message) {
  try {
    const sha = await ghPutFile(`${DATA_DIR}/packages.json`, list, state.packages.sha, message);
    state.packages = { value: list, sha };
    renderPackagesList();
    toast("Saved. GitHub Pages will redeploy shortly.");
  } catch (e) {
    toast(e.message, true);
  }
}

// ===== Destinations =====

async function loadDestinations() {
  const container = document.getElementById("destinations-list");
  try {
    state.destinations = await ghGetFile(`${DATA_DIR}/destinations.json`);
    renderDestinationsList();
  } catch (e) {
    container.innerHTML = "";
    container.appendChild(el("p", { class: "empty-text", text: e.message }));
  }
}

function renderDestinationsList() {
  const container = document.getElementById("destinations-list");
  container.innerHTML = "";
  const items = state.destinations.value;
  if (!items.length) {
    container.appendChild(el("p", { class: "empty-text", text: "No destinations yet." }));
    return;
  }
  items.forEach((dest) => {
    const info = el("div", { class: "row-info" }, [
      el("h4", { text: `${dest.icon || ""} ${dest.title}` }),
      el("p", { text: `${dest.tag}${dest.featured ? " · Featured on Home" : ""}` }),
    ]);
    const editBtn = el("button", { class: "icon-btn edit", text: "Edit" });
    editBtn.addEventListener("click", () => openDestinationForm(dest));
    const delBtn = el("button", { class: "icon-btn delete", text: "Delete" });
    delBtn.addEventListener("click", () => deleteDestination(dest.id));
    const actions = el("div", { class: "row-actions" }, [editBtn, delBtn]);
    container.appendChild(el("div", { class: "admin-row" }, [info, actions]));
  });
}

function openDestinationForm(dest) {
  const isNew = !dest;
  const titleInput = textInput(dest?.title);
  const iconInput = textInput(dest?.icon || "🏔️");
  const tagInput = textInput(dest?.tag || "Region");
  const descInput = textareaInput(dest?.desc);
  const featuredGroup = checkboxRow("Show on Home page as featured", dest?.featured);

  const form = el("form", {}, [
    formGroup("Title", titleInput),
    formGroup("Icon (emoji)", iconInput),
    formGroup("Tag / Category", tagInput),
    formGroup("Description", descInput),
    featuredGroup,
  ]);

  const saveBtn = el("button", { type: "submit", class: "btn btn-primary", text: "Save" });
  const cancelBtn = el("button", { type: "button", class: "btn btn-secondary", text: "Cancel" });
  cancelBtn.addEventListener("click", closeModal);
  form.appendChild(el("div", { class: "modal-actions" }, [cancelBtn, saveBtn]));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    const updated = {
      id: dest?.id || slugify(title),
      icon: iconInput.value.trim(),
      tag: tagInput.value.trim(),
      title,
      desc: descInput.value.trim(),
      featured: checkboxValue(featuredGroup),
    };

    const list = state.destinations.value.slice();
    const idx = list.findIndex((d) => d.id === updated.id);
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);

    await saveDestinations(list, isNew ? `Add destination: ${title}` : `Update destination: ${title}`);
    closeModal();
  });

  openModal(isNew ? "Add Destination" : "Edit Destination", form);
}

async function deleteDestination(id) {
  if (!confirm("Delete this destination? This can't be undone.")) return;
  const list = state.destinations.value.filter((d) => d.id !== id);
  await saveDestinations(list, `Delete destination: ${id}`);
}

async function saveDestinations(list, message) {
  try {
    const sha = await ghPutFile(`${DATA_DIR}/destinations.json`, list, state.destinations.sha, message);
    state.destinations = { value: list, sha };
    renderDestinationsList();
    toast("Saved. GitHub Pages will redeploy shortly.");
  } catch (e) {
    toast(e.message, true);
  }
}

// ===== Itineraries =====

async function loadItineraries() {
  const container = document.getElementById("itineraries-list");
  try {
    state.itineraries = await ghGetFile(`${DATA_DIR}/itineraries.json`);
    renderItinerariesList();
  } catch (e) {
    container.innerHTML = "";
    container.appendChild(el("p", { class: "empty-text", text: e.message }));
  }
}

function renderItinerariesList() {
  const container = document.getElementById("itineraries-list");
  container.innerHTML = "";
  const items = state.itineraries.value;
  if (!items.length) {
    container.appendChild(el("p", { class: "empty-text", text: "No itineraries yet." }));
    return;
  }
  items.forEach((itin) => {
    const info = el("div", { class: "row-info" }, [
      el("h4", { text: itin.title }),
      el("p", { text: `${itin.duration} · ${(itin.days || []).length} days` }),
    ]);
    const editBtn = el("button", { class: "icon-btn edit", text: "Edit" });
    editBtn.addEventListener("click", () => openItineraryForm(itin));
    const delBtn = el("button", { class: "icon-btn delete", text: "Delete" });
    delBtn.addEventListener("click", () => deleteItinerary(itin.id));
    const actions = el("div", { class: "row-actions" }, [editBtn, delBtn]);
    container.appendChild(el("div", { class: "admin-row" }, [info, actions]));
  });
}

function dayRow(day) {
  const dayLabelInput = textInput(day?.day || "Day 1");
  const dayTitleInput = textInput(day?.title);
  const dayDescInput = textareaInput(day?.desc);

  const removeBtn = el("button", { type: "button", class: "icon-btn delete", text: "Remove" });
  const row = el("div", { class: "day-row" }, [
    formGroup("Day label", dayLabelInput),
    formGroup("Title", dayTitleInput),
    formGroup("Description", dayDescInput),
    removeBtn,
  ]);
  removeBtn.addEventListener("click", () => row.remove());

  row._read = () => ({
    day: dayLabelInput.value.trim(),
    title: dayTitleInput.value.trim(),
    desc: dayDescInput.value.trim(),
  });
  return row;
}

function openItineraryForm(itin) {
  const isNew = !itin;
  const packageOptions = (state.packages?.value || []).map((p) =>
    el("option", { value: p.id, text: p.title })
  );
  const packageSelect = el("select", {}, packageOptions);
  if (itin?.packageId) packageSelect.value = itin.packageId;

  const titleInput = textInput(itin?.title);
  const durationInput = textInput(itin?.duration);

  const daysContainer = el("div", {}, (itin?.days || []).map(dayRow));
  const addDayBtn = el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "+ Add Day" });
  addDayBtn.addEventListener("click", () => daysContainer.appendChild(dayRow()));

  const form = el("form", {}, [
    formGroup("Linked Package", packageSelect),
    formGroup("Title", titleInput),
    formGroup("Duration", durationInput),
    el("label", { text: "Day-by-day plan", style: "font-size:0.85rem;font-weight:600;display:block;margin-bottom:10px;" }),
    daysContainer,
    addDayBtn,
  ]);

  const saveBtn = el("button", { type: "submit", class: "btn btn-primary", text: "Save" });
  const cancelBtn = el("button", { type: "button", class: "btn btn-secondary", text: "Cancel" });
  cancelBtn.addEventListener("click", closeModal);
  form.appendChild(el("div", { class: "modal-actions" }, [cancelBtn, saveBtn]));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const packageId = packageSelect.value;
    if (!title || !packageId) return;

    const updated = {
      id: itin?.id || packageId,
      packageId,
      title,
      duration: durationInput.value.trim(),
      days: Array.from(daysContainer.children).map((row) => row._read()),
    };

    const list = state.itineraries.value.slice();
    const idx = list.findIndex((i) => i.id === updated.id);
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);

    await saveItineraries(list, isNew ? `Add itinerary: ${title}` : `Update itinerary: ${title}`);
    closeModal();
  });

  openModal(isNew ? "Add Itinerary" : "Edit Itinerary", form);
}

async function deleteItinerary(id) {
  if (!confirm("Delete this itinerary? This can't be undone.")) return;
  const list = state.itineraries.value.filter((i) => i.id !== id);
  await saveItineraries(list, `Delete itinerary: ${id}`);
}

async function saveItineraries(list, message) {
  try {
    const sha = await ghPutFile(`${DATA_DIR}/itineraries.json`, list, state.itineraries.sha, message);
    state.itineraries = { value: list, sha };
    renderItinerariesList();
    toast("Saved. GitHub Pages will redeploy shortly.");
  } catch (e) {
    toast(e.message, true);
  }
}

// ===== Site (home / about / contact) =====

async function loadSite() {
  const container = document.getElementById("site-form");
  try {
    state.site = await ghGetFile(`${DATA_DIR}/site.json`);
    renderSiteForm();
  } catch (e) {
    container.innerHTML = "";
    container.appendChild(el("p", { class: "empty-text", text: e.message }));
  }
}

function statRow(stat) {
  const valueInput = textInput(stat?.value);
  const labelInput = textInput(stat?.label);
  const removeBtn = el("button", { type: "button", class: "icon-btn delete", text: "Remove" });
  const row = el("div", { class: "day-row" }, [formGroup("Value", valueInput), formGroup("Label", labelInput), removeBtn]);
  removeBtn.addEventListener("click", () => row.remove());
  row._read = () => ({ value: valueInput.value.trim(), label: labelInput.value.trim() });
  return row;
}

function valueRow(v) {
  const titleInput = textInput(v?.title);
  const descInput = textareaInput(v?.desc);
  const removeBtn = el("button", { type: "button", class: "icon-btn delete", text: "Remove" });
  const row = el("div", { class: "day-row" }, [formGroup("Title", titleInput), formGroup("Description", descInput), removeBtn]);
  removeBtn.addEventListener("click", () => row.remove());
  row._read = () => ({ title: titleInput.value.trim(), desc: descInput.value.trim() });
  return row;
}

function renderSiteForm() {
  const container = document.getElementById("site-form");
  container.innerHTML = "";
  const site = state.site.value;

  const heroTitleInput = textInput(site.home.heroTitle);
  const heroTextInput = textareaInput(site.home.heroText);

  const headingInput = textInput(site.about.heading);
  const paragraphsInput = textareaInput((site.about.paragraphs || []).join("\n\n"));

  const statsContainer = el("div", {}, (site.about.stats || []).map(statRow));
  const addStatBtn = el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "+ Add Stat" });
  addStatBtn.addEventListener("click", () => statsContainer.appendChild(statRow()));

  const valuesContainer = el("div", {}, (site.about.values || []).map(valueRow));
  const addValueBtn = el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "+ Add Value" });
  addValueBtn.addEventListener("click", () => valuesContainer.appendChild(valueRow()));

  const emailInput = textInput(site.contact.email);
  const phoneInput = textInput(site.contact.phone);
  const addressInput = textInput(site.contact.address);
  const hoursInput = textInput(site.contact.hours);

  const form = el("form", {}, [
    el("h3", { text: "Home Page Hero" }),
    formGroup("Hero Title", heroTitleInput),
    formGroup("Hero Text", heroTextInput),

    el("h3", { text: "About Page", style: "margin-top:32px;" }),
    formGroup("Heading", headingInput),
    formGroup("Story paragraphs (blank line between each)", paragraphsInput),
    el("label", { text: "Stats", style: "font-size:0.85rem;font-weight:600;display:block;margin-bottom:10px;" }),
    statsContainer,
    addStatBtn,
    el("label", { text: "Values", style: "font-size:0.85rem;font-weight:600;display:block;margin:20px 0 10px;" }),
    valuesContainer,
    addValueBtn,

    el("h3", { text: "Contact Info", style: "margin-top:32px;" }),
    formGroup("Email", emailInput),
    formGroup("Phone", phoneInput),
    formGroup("Address", addressInput),
    formGroup("Hours", hoursInput),
  ]);

  const saveBtn = el("button", { type: "submit", class: "btn btn-primary", text: "Save All Changes" });
  form.appendChild(el("div", { class: "modal-actions", style: "justify-content:flex-start;" }, [saveBtn]));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updated = {
      home: {
        heroTitle: heroTitleInput.value.trim(),
        heroText: heroTextInput.value.trim(),
      },
      about: {
        heading: headingInput.value.trim(),
        paragraphs: paragraphsInput.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        stats: Array.from(statsContainer.children).map((row) => row._read()),
        values: Array.from(valuesContainer.children).map((row) => row._read()),
      },
      contact: {
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        address: addressInput.value.trim(),
        hours: hoursInput.value.trim(),
      },
    };

    try {
      const sha = await ghPutFile(`${DATA_DIR}/site.json`, updated, state.site.sha, "Update site content");
      state.site = { value: updated, sha };
      toast("Saved. GitHub Pages will redeploy shortly.");
    } catch (err) {
      toast(err.message, true);
    }
  });

  container.appendChild(form);
}

// ===== Add buttons =====

document.getElementById("add-package-btn").addEventListener("click", () => openPackageForm(null));
document.getElementById("add-destination-btn").addEventListener("click", () => openDestinationForm(null));
document.getElementById("add-itinerary-btn").addEventListener("click", () => openItineraryForm(null));

// ===== Setup / connect flow =====

async function initDashboard() {
  document.getElementById("setup-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("signout-btn").style.display = "inline-block";
  await loadPackages();
  await loadDestinations();
  await loadItineraries();
  await loadSite();
}

document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cfg = {
    owner: document.getElementById("cfg-owner").value.trim(),
    repo: document.getElementById("cfg-repo").value.trim(),
    branch: document.getElementById("cfg-branch").value.trim() || "main",
    token: document.getElementById("cfg-token").value.trim(),
  };
  const errorEl = document.getElementById("setup-error");
  errorEl.style.display = "none";

  setConfig(cfg);
  try {
    await ghGetFile(`${DATA_DIR}/site.json`);
    initDashboard();
  } catch (err) {
    clearConfig();
    errorEl.textContent = "Couldn't connect: " + err.message + " (check the owner/repo/branch/token and that data/site.json exists on that branch)";
    errorEl.style.display = "block";
  }
});

document.getElementById("signout-btn").addEventListener("click", () => {
  clearConfig();
  sessionStorage.removeItem(LOGIN_SESSION_KEY);
  location.reload();
});

// ===== Login gate (cosmetic — see note above ADMIN_PHONE) =====

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  if (phone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
    sessionStorage.setItem(LOGIN_SESSION_KEY, "1");
    errorEl.style.display = "none";
    document.getElementById("login-screen").style.display = "none";
    showSetupOrDashboard();
  } else {
    errorEl.textContent = "Incorrect phone number or password.";
    errorEl.style.display = "block";
  }
});

function showSetupOrDashboard() {
  const cfg = getConfig();
  if (cfg) {
    document.getElementById("cfg-owner").value = cfg.owner;
    document.getElementById("cfg-repo").value = cfg.repo;
    document.getElementById("cfg-branch").value = cfg.branch;
    initDashboard();
  } else {
    document.getElementById("setup-screen").style.display = "block";
  }
}

// ===== Init =====

(function init() {
  if (sessionStorage.getItem(LOGIN_SESSION_KEY) === "1") {
    document.getElementById("login-screen").style.display = "none";
    showSetupOrDashboard();
  }
})();
