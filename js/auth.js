// Drives the tabbed card on login.html: switching between the log in and
// sign up panels, and submitting each form. Depends on supabaseClient.js
// being loaded first.

document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.querySelector("#login-form");
  const signupForm = document.querySelector("#signup-form");
  const statusBox = document.querySelector("#auth-status");
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  const panels = {
    login: document.querySelector("#panel-login"),
    signup: document.querySelector("#panel-signup")
  };
  const tabNames = Object.keys(panels);

  // Someone who is already signed in has no reason to see this page.
  const existing = await getCurrentUserProfile();
  if (existing) {
    window.location.replace("index.html");
    return;
  }

  function showStatus(message, isError) {
    statusBox.textContent = message;
    statusBox.classList.toggle("auth-status-error", Boolean(isError));
    statusBox.hidden = false;
  }

  function setBusy(form, busy) {
    form.querySelector("button[type=submit]").disabled = busy;
  }

  // Shows one panel, marks its tab as selected, and keeps the address hash
  // in sync so a link ending in signup opens the sign up tab directly.
  function showPanel(name) {
    tabNames.forEach((key) => {
      panels[key].hidden = key !== name;
    });
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    statusBox.hidden = true;
    window.history.replaceState(null, "", "#" + name);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showPanel(tab.dataset.tab));
  });

  // Arrow keys move between tabs, as people expect from a tab list.
  document.querySelector(".auth-tabs").addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    const current = tabNames.indexOf(document.activeElement.dataset.tab);
    if (current === -1) {
      return;
    }
    const step = event.key === "ArrowRight" ? 1 : tabNames.length - 1;
    const next = tabNames[(current + step) % tabNames.length];
    showPanel(next);
    document.querySelector(`[data-tab="${next}"]`).focus();
  });

  const startName = window.location.hash.slice(1);
  showPanel(panels[startName] ? startName : "login");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    setBusy(loginForm, true);
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    setBusy(loginForm, false);

    if (error) {
      showStatus(error.message, true);
      return;
    }

    window.location.href = "index.html";
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = signupForm.username.value.trim();
    const email = signupForm.email.value.trim();
    const password = signupForm.password.value;

    if (password !== signupForm.confirm.value) {
      showStatus("The two passwords do not match.", true);
      return;
    }

    setBusy(signupForm, true);
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    setBusy(signupForm, false);

    if (error) {
      showStatus(error.message, true);
      return;
    }

    // When email confirmation is switched on, Supabase answers a signup for
    // an address that already exists with an empty identities list.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      showStatus("That email is already registered. Use the Log in tab instead.", true);
      return;
    }

    // Confirmation switched off means a session exists immediately, and the
    // new account is already an editor, so go straight to the wiki.
    if (data.session) {
      window.location.href = "index.html";
      return;
    }

    signupForm.reset();
    showStatus("Account created. Confirm your email address, then log in. You can edit articles as soon as you are signed in.", false);
  });
});
