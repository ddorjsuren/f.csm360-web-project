// Shared Supabase client.

const SUPABASE_URL = "https://qshvswkevgniulrkklre.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_EccLYid98pdzHmhtn-5Kuw_wH-3UqP0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

// Escapes Html characters, prevents user inputted characters from being recognized as markup
function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Loads the list of articles 
let allPagesPromise = null;
function getAllPages() {
  if (!allPagesPromise) {
    allPagesPromise = (async () => {
      return await supabaseClient
        .from("pages")
        .select("slug, title, category, updated_at")
        .order("updated_at", { ascending: false });
    })();
  }
  return allPagesPromise;
}

// Looks up the signed in user, if any, along with their profile row
// (username and role). Returns null when nobody is signed in.
async function getCurrentUserProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Could not load profile:", error.message);
    return { id: user.id, username: user.email, role: "guest" };
  }

  return profile;
}

// Fills in whether the user is logged in or not.
async function renderAuthState() {
  const container = document.querySelector("[data-auth-state]");
  if (!container) {
    return;
  }

  const profile = await getCurrentUserProfile();

  if (!profile) {
    container.innerHTML = '<a href="login.html" class="topbar-link">Log in</a>';
    return;
  }

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
  container.innerHTML = `
    <span class="role-badge role-badge-${profile.role}">${roleLabel}</span>
    <span class="topbar-link">${escapeHtml(profile.username)}</span>
    <a href="#" class="topbar-link" data-logout>Log out</a>
  `;

  container.querySelector("[data-logout]").addEventListener("click", async (event) => {
    event.preventDefault();
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", renderAuthState);
