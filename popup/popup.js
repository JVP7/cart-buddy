// popup.js

const STORE_LABELS = {
  amazon: "Amazon",
  ebay: "eBay",
  target: "Target"
};

async function renderPopup() {
  const items = await cartBuddyGetAll();
  const listEl = document.getElementById("cb-list");
  const emptyEl = document.getElementById("cb-empty");
  const subtitleEl = document.getElementById("cb-subtitle");

  if (items.length === 0) {
    listEl.hidden = true;
    emptyEl.hidden = false;
    subtitleEl.textContent = "Nothing saved yet.";
    return;
  }

  listEl.hidden = false;
  emptyEl.hidden = true;
  subtitleEl.textContent = `${items.length} item${items.length === 1 ? "" : "s"} saved across your stores.`;

  // Group by store, preserving most-recent-first order within each group.
  const grouped = items.reduce((acc, item) => {
    acc[item.store] = acc[item.store] || [];
    acc[item.store].push(item);
    return acc;
  }, {});

  listEl.innerHTML = Object.entries(grouped)
    .map(([store, storeItems]) => {
      const cards = storeItems
        .map(
          (item) => `
        <div class="cb-card" data-id="${item.id}">
          <button class="cb-card-image-btn" data-action="open" data-url="${escapeAttr(itemDestination(item))}">
            <img class="cb-card-image" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" />
          </button>
          <div class="cb-card-info">
            <div class="cb-card-title">${escapeHtml(item.title)}</div>
            ${item.price ? `<div class="cb-card-price">${escapeHtml(item.price)}</div>` : ""}
          </div>
          <button class="cb-card-remove" data-action="remove" title="Remove">×</button>
        </div>
      `
        )
        .join("");

      return `
        <div class="cb-store-group">
          <span class="cb-store-label ${store}">${STORE_LABELS[store] || store}</span>
          ${cards}
        </div>
      `;
    })
    .join("");

  // Wire up clicks (delegated, since cards are re-rendered each time).
  listEl.querySelectorAll('[data-action="open"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });

  listEl.querySelectorAll('[data-action="remove"]').forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const card = e.target.closest(".cb-card");
      const id = card.dataset.id;
      await cartBuddyRemoveItem(id);
      renderPopup();
    });
  });
}

// We can't reliably detect login state from a content script, so rather than
// guess and risk sending a logged-out user to an empty cart page, we always
// link to the product page itself. That destination works whether or not
// they're logged in, and adding to the real cart from there is one click.
function itemDestination(item) {
  return item.productUrl;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "").replace(/"/g, "&quot;");
}

renderPopup();
