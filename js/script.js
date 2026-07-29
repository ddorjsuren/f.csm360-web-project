// Ironhold Wiki template behavior
// Keeps things framework free so the template can be dropped into any
// static host or wired into a backend later.

document.addEventListener("DOMContentLoaded", function () {

  // Smooth scroll for the table of contents links on the right sidebar.
  // Falls back to normal jump behavior for anyone with reduced motion set.
  var tocLinks = document.querySelectorAll(".toc-link");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  tocLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var heading = findHeadingByText(link.textContent.trim());
      if (heading) {
        event.preventDefault();
        heading.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start"
        });
      }
    });
  });

  function findHeadingByText(text) {
    var headings = document.querySelectorAll(".section-heading");
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].textContent.trim() === text) {
        return headings[i];
      }
    }
    return null;
  }

  // Basic search box behavior. Replace this handler with a real fetch
  // call to a search endpoint or a static index once one exists.
  var searchForm = document.querySelector(".search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = searchForm.querySelector(".search-input");
      var query = input.value.trim();
      if (query.length > 0) {
        console.log("Search submitted for:", query);
        // Example of where a real implementation would redirect,
        // such as window.location.href = "/search?q=" + encodeURIComponent(query);
      }
    });
  }

  // Article tab switching. Currently only toggles the active class since
  // this template ships a single static article, wire these up to real
  // edit and history views when the backend exists.
  var tabs = document.querySelectorAll(".article-tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      tabs.forEach(function (t) {
        t.classList.remove("active");
      });
      tab.classList.add("active");
    });
  });

});
