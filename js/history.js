
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const pageTitleEl = document.querySelector("#history-page-title");
  const listEl = document.querySelector("#revision-list");
  const diffEl = document.querySelector("#diff-view");
  const revertButton = document.querySelector("#revert-button");
  const compareButton = document.querySelector("#compare-button");

  if (!slug) {
    pageTitleEl.textContent = "No page selected";
    return;
  }

  const profile = await getCurrentUserProfile();
  const canRevert = profile && (profile.role === "editor" || profile.role === "admin");

  const { data: page, error: pageError } = await supabaseClient
    .from("pages")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();

  if (pageError || !page) {
    pageTitleEl.textContent = "Page not found";
    return;
  }

  pageTitleEl.textContent = "History: " + page.title;

  const { data: revisions, error: revisionsError } = await supabaseClient
    .from("revisions")
    .select("id, revision_number, content, edit_summary, created_at, edited_by, profiles(username)")
    .eq("page_id", page.id)
    .order("revision_number", { ascending: false });

  if (revisionsError || !revisions || revisions.length === 0) {
    listEl.innerHTML = "<p>No revisions recorded yet.</p>";
    return;
  }

  let selected = [];

  function renderList() {
    listEl.innerHTML = "";
    revisions.forEach((revision) => {
      const row = document.createElement("label");
      row.className = "revision-row";
      const editor = revision.profiles ? revision.profiles.username : "Unknown";
      const when = new Date(revision.created_at).toLocaleString();
      row.innerHTML = `
        <input type="checkbox" value="${revision.id}" ${selected.includes(revision.id) ? "checked" : ""}>
        <span class="revision-number">#${revision.revision_number}</span>
        <span class="revision-meta">${escapeHtml(editor)}, ${when}</span>
        <span class="revision-summary">${revision.edit_summary ? escapeHtml(revision.edit_summary) : "No summary"}</span>
      `;
      const checkbox = row.querySelector("input");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (selected.length >= 2) {
            const dropped = selected.shift();
            listEl.querySelector(`input[value="${dropped}"]`).checked = false;
          }
          selected.push(revision.id);
        } else {
          selected = selected.filter((id) => id !== revision.id);
        }
        revertButton.disabled = selected.length !== 1;
      });
      listEl.appendChild(row);
    });
  }

  renderList();

  compareButton.addEventListener("click", () => {
    if (selected.length !== 2) {
      window.alert("Pick exactly two revisions to compare (the checkboxes on the left).");
      return;
    }
    const [firstId, secondId] = selected;
    const first = revisions.find((r) => r.id === firstId);
    const second = revisions.find((r) => r.id === secondId);
    const [older, newer] = first.revision_number < second.revision_number
      ? [first, second]
      : [second, first];
    diffEl.innerHTML = buildDiffHtml(older, newer);
  });

  if (canRevert) {
    revertButton.hidden = false;
    revertButton.addEventListener("click", async () => {
      if (selected.length !== 1) {
        return;
      }
      const target = revisions.find((r) => r.id === selected[0]);
      if (!window.confirm(`Revert "${page.title}" to revision #${target.revision_number}? This creates a new revision, it does not delete anything.`)) {
        return;
      }

      revertButton.disabled = true;

      const { error: updateError } = await supabaseClient
        .from("pages")
        .update({ current_content: target.content })
        .eq("id", page.id);

      const { error: insertError } = await supabaseClient
        .from("revisions")
        .insert({
          page_id: page.id,
          content: target.content,
          edit_summary: `Reverted to revision #${target.revision_number}`,
          edited_by: profile.id
        });

      if (updateError || insertError) {
        window.alert("Revert failed: " + ((updateError || insertError).message));
        revertButton.disabled = false;
        return;
      }

      window.location.href = `view.html?slug=${encodeURIComponent(slug)}`;
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function toWords(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body.textContent || "";
    return text.split(/(\s+)/).filter((chunk) => chunk.length > 0);
  }

  function diffWords(oldWords, newWords) {
    const m = oldWords.length;
    const n = newWords.length;
    const table = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        table[i][j] = oldWords[i] === newWords[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }

    const ops = [];
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
      if (oldWords[i] === newWords[j]) {
        ops.push({ type: "equal", text: oldWords[i] });
        i++;
        j++;
      } else if (table[i + 1][j] >= table[i][j + 1]) {
        ops.push({ type: "removed", text: oldWords[i] });
        i++;
      } else {
        ops.push({ type: "added", text: newWords[j] });
        j++;
      }
    }
    while (i < m) {
      ops.push({ type: "removed", text: oldWords[i] });
      i++;
    }
    while (j < n) {
      ops.push({ type: "added", text: newWords[j] });
      j++;
    }
    return ops;
  }

  function buildDiffHtml(older, newer) {
    const ops = diffWords(toWords(older.content), toWords(newer.content));
    const body = ops.map((op) => {
      const safe = escapeHtml(op.text);
      if (op.type === "equal") {
        return safe;
      }
      if (op.type === "removed") {
        return `<span class="diff-removed">${safe}</span>`;
      }
      return `<span class="diff-added">${safe}</span>`;
    }).join("");

    return `
      <div class="diff-header">
        Comparing revision #${older.revision_number} to revision #${newer.revision_number}
      </div>
      <div class="diff-body">${body}</div>
    `;
  }
});
