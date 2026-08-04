
document.addEventListener("DOMContentLoaded", async () => {
  const editorRoot = document.querySelector("#editor-body");
  const toolbar = document.querySelector("#editor-toolbar");
  const titleInput = document.querySelector("#page-title");
  const slugInput = document.querySelector("#page-slug");
  const categoryInput = document.querySelector("#page-category");
  const summaryInput = document.querySelector("#edit-summary");
  const saveButton = document.querySelector("#save-page");
  const permissionNotice = document.querySelector("#permission-notice");
  const form = document.querySelector("#editor-form");

  const profile = await getCurrentUserProfile();
  const canEdit = profile && (profile.role === "editor" || profile.role === "admin");

  if (!canEdit) {
    form.hidden = true;
    permissionNotice.hidden = false;
    permissionNotice.textContent = profile
      ? "An admin has restricted this account to read only, so it cannot create or change articles."
      : "Log in or create a free account to write and edit articles. New accounts can edit straight away.";
    return;
  }

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-command]");
    if (!button) {
      return;
    }
    event.preventDefault();
    editorRoot.focus();

    const command = button.dataset.command;

    if (command === "createLink") {
      const url = window.prompt("Link URL");
      if (url) {
        document.execCommand("createLink", false, url);
      }
      return;
    }

    if (command === "formatBlock") {
      document.execCommand("formatBlock", false, button.dataset.value);
      return;
    }

    document.execCommand(command, false, null);
  });

  // Existing page
  const params = new URLSearchParams(window.location.search);
  const editingSlug = params.get("slug");
  let existingPage = null;

  if (editingSlug) {
    const { data, error } = await supabaseClient
      .from("pages")
      .select("*")
      .eq("slug", editingSlug)
      .single();

    if (!error && data) {
      existingPage = data;
      titleInput.value = data.title;
      slugInput.value = data.slug;
      slugInput.disabled = true;
      categoryInput.value = data.category || "";
      editorRoot.innerHTML = data.current_content;
    }
  }

  saveButton.addEventListener("click", async (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const slug = slugInput.value.trim().toLowerCase().replace(/\s+/g, "-");
    const category = categoryInput.value.trim();
    const summary = summaryInput.value.trim();
    const rawContent = editorRoot.innerHTML;
    const cleanContent = DOMPurify.sanitize(rawContent);

    if (!title || !slug || !cleanContent.trim()) {
      window.alert("Title, slug, and body content are all required.");
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      let pageId = existingPage ? existingPage.id : null;

      if (!pageId) {
        const { data: newPage, error: pageError } = await supabaseClient
          .from("pages")
          .insert({
            slug,
            title,
            category,
            current_content: cleanContent,
            created_by: profile.id
          })
          .select()
          .single();

        if (pageError) {
          throw pageError;
        }
        pageId = newPage.id;
      } else {
        const { error: updateError } = await supabaseClient
          .from("pages")
          .update({ title, category, current_content: cleanContent })
          .eq("id", pageId);

        if (updateError) {
          throw updateError;
        }
      }

      const { error: revisionError } = await supabaseClient
        .from("revisions")
        .insert({
          page_id: pageId,
          content: cleanContent,
          edit_summary: summary,
          edited_by: profile.id
        });

      if (revisionError) {
        throw revisionError;
      }

      window.location.href = `view.html?slug=${encodeURIComponent(slug)}`;
    } catch (error) {
      console.error(error);
      window.alert("Saving failed: " + error.message);
      saveButton.disabled = false;
      saveButton.textContent = "Save page";
    }
  });
});
