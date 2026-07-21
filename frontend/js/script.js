document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
      toggle.classList.toggle("open");
    });
  }

  const waFloat = document.createElement("a");
  waFloat.href = "https://wa.me/97517916909";
  waFloat.target = "_blank";
  waFloat.rel = "noopener";
  waFloat.className = "whatsapp-float";
  waFloat.setAttribute("aria-label", "Chat with us on WhatsApp");
  waFloat.innerHTML =
    '<svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.55-3.7 8.25-8.25 8.25a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.55 3.71-8.25 8.26-8.25zm-4.52 4.6c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.2.87 2.35.99 2.51.12.16 1.71 2.7 4.24 3.68 2.1.82 2.53.66 2.98.62.45-.04 1.46-.6 1.66-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.46-.28-.24-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.16.24-.64.8-.79.97-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.36-.77-1.86-.2-.48-.4-.42-.56-.42h-.01l-.34-.01z"/></svg>';
  document.body.appendChild(waFloat);

  const form = document.querySelector(".contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.querySelector(".form-note").textContent =
        "Thanks! This form isn't connected to a server yet, but your message would normally be sent here.";
    });
  }

  let headerScrolled = false;
  const header = document.querySelector(".site-header");
  window.addEventListener(
    "scroll",
    () => {
      const scrolled = window.scrollY > 40;
      if (scrolled !== headerScrolled && header) {
        header.classList.toggle("scrolled", scrolled);
        headerScrolled = scrolled;
      }
    },
    { passive: true }
  );

  const REVEAL_SELECTOR =
    ".card, .package-card, .section-header, .stat, .day-item, .itinerary-header, .contact-info .item, .hero-content > *";
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealIO.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  function bindReveal(root) {
    root.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
      if (el.dataset.revealBound) return;
      el.dataset.revealBound = "1";
      el.classList.add("reveal");
      const group = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
      el.style.setProperty("--reveal-delay", (group % 6) * 0.08 + "s");
      revealIO.observe(el);
    });
  }

  bindReveal(document);

  const revealMO = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) bindReveal(node.matches(REVEAL_SELECTOR) ? node.parentElement : node);
      });
    });
  });
  revealMO.observe(document.body, { childList: true, subtree: true });
});
