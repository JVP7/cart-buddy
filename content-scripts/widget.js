// widget.js
// Mounts the floating Cart Buddy bubble and switches between
// "idle" (just say hi) and "product spotted" (offer to add) states.

(function initCartBuddy() {
  const adapter = getCartBuddySiteAdapter();
  if (!adapter) return;

  const root = document.createElement("div");
  root.id = "cart-buddy-root";
  document.body.appendChild(root);

  let dismissed = false;

  function render() {
    if (dismissed) {
      root.innerHTML = "";
      return;
    }

    const onProductPage = adapter.isProductPage();
    const product = onProductPage ? adapter.getProduct() : null;

    root.innerHTML = `
      <div class="cb-bubble" style="position: relative;">
        <button class="cb-close" title="Hide for now">×</button>
        <div class="cb-avatar">🐻</div>
        <div class="cb-text">
          ${
            product
              ? `<span class="cb-greeting">Spotted something!</span>
                 <span class="cb-product-title">${escapeHtml(product.title)}</span>`
              : `<span class="cb-greeting">Hi, ready to shop at ${adapter.storeName}?</span>`
          }
        </div>
        ${product ? `<button class="cb-add-btn">Add to cart</button>` : ""}
      </div>
    `;

    root.querySelector(".cb-close").addEventListener("click", () => {
      dismissed = true;
      render();
    });

    const addBtn = root.querySelector(".cb-add-btn");
    if (addBtn && product) {
      addBtn.addEventListener("click", async () => {
        addBtn.textContent = "Adding...";
        addBtn.disabled = true;

        const result = await cartBuddyAddItem({
          store: adapter.store,
          title: product.title,
          image: product.image,
          price: product.price,
          productUrl: product.productUrl,
          cartUrl: adapter.cartUrl
        });

        if (result.added) {
          addBtn.textContent = "Added ✓";
          addBtn.classList.add("cb-added");
        } else {
          addBtn.textContent = "Already saved";
          addBtn.classList.add("cb-added");
        }
      });
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  render();

  // Re-check on navigation within the same page (these sites are heavily
  // client-routed, so the URL can change without a full reload).
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      dismissed = false;
      render();
    }
  }, 1000);
})();
