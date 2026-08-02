// Loads and sends data to the relevant component
async function loadComponents() {
  const slots = document.querySelectorAll("[data-component]");

  await Promise.all(Array.from(slots).map(async (slot) => {
    try {
      const response = await fetch("components/" + slot.dataset.component + ".html");
      if (response.ok) {
        slot.innerHTML = await response.text();
      }
    } catch (error) {
      console.error("Could not load component:", error);
    }
  }));
}

// Highlights the link that points at the page currently open.
function markCurrentLinks() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === current) {
      link.setAttribute("aria-current", "page");
    }
  });
}

// Lists every article in the sidebar, grouped by category, with the uncategorized ones last.
async function fillSidebarArticles() {
  const target = document.querySelector("#sidebar-articles");
  if (!target) {
    return;
  }

  const { data: pages, error } = await getAllPages();

  if (error || !pages || pages.length === 0) {
    target.innerHTML = '<p class="side-nav-empty">No articles yet.</p>';
    return;
  }

  const groups = {};
  pages.forEach((page) => {
    const key = page.category || "Uncategorized";
    (groups[key] = groups[key] || []).push(page);
  });

  const names = Object.keys(groups).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  target.innerHTML = names.map((name) => {
    const links = groups[name]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((page) => `<a class="side-nav-link side-nav-link-small" href="view.html?slug=${encodeURIComponent(page.slug)}">${escapeHtml(page.title)}</a>`)
      .join("");
    return `<p class="side-nav-sub">${escapeHtml(name)}</p>${links}`;
  }).join("");
}

// Hides links that only make sense for signed out visitors.
async function toggleAuthLinks() {
  const profile = await getCurrentUserProfile();
  document.querySelectorAll("[data-guest-only]").forEach((element) => {
    element.hidden = Boolean(profile);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponents();
  markCurrentLinks();
  fillSidebarArticles();
  toggleAuthLinks();
});
