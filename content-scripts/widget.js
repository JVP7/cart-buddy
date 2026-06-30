// widget.js
// Mounts the floating Cart Buddy bubble and switches between
// "idle" (just say hi) and "product spotted" (offer to add) states.

(function initCartBuddy() {
  // Defensive guard: <all_urls> means this can theoretically run on pages
  // mid-parse or in unusual states (extensions pages, some PDFs Chrome
  // renders specially, etc) where document.body might not exist yet.
  if (!document.body) return;

  let adapter;
  try {
    adapter = getCartBuddySiteAdapter();
  } catch {
    // If adapter detection itself throws on some unusual page, fail silent
    // rather than break the page the user is trying to use.
    return;
  }
  if (!adapter) return;

  const root = document.createElement("div");
  root.id = "cart-buddy-root";
  document.body.appendChild(root);

  let dismissed = false;
  let lastFoundProduct = null;

  function render() {
    try {
      // Self-healing: some heavily client-rendered sites (confirmed: a
      // Shopify storefront, Allbirds) can wholesale replace or reset
      // document.body's children during hydration/route transitions,
      // silently detaching our root element without any DOM mutation event
      // we'd otherwise catch cleanly. Re-attach if that's happened.
      if (!document.body.contains(root)) {
        document.body.appendChild(root);
      }
      renderInner();
    } catch {
      // A misbehaving page (unexpected DOM shape, adapter throwing on a
      // edge case we didn't anticipate) should never break the host page.
      // Silently bail rather than leave a half-rendered widget or, worse,
      // an uncaught error in the page's own console.
      root.innerHTML = "";
    }
  }

  function renderInner() {
    if (dismissed) {
      root.innerHTML = "";
      return;
    }

    const onProductPage = adapter.isProductPage();
    const product = onProductPage ? adapter.getProduct() : null;
    lastFoundProduct = product || lastFoundProduct;

    // On generic (non-named) sites, only show the widget when a product is
    // detected, OR when the page fingerprints as an e-commerce platform
    // (Shopify, WooCommerce, etc) even if this specific page isn't a product
    // page (e.g. browsing a category page). Showing the greeting on truly
    // unrelated sites (news, docs, etc) would be wrong, since the script now
    // runs everywhere.
    const isShoppingContext =
      !adapter.isGeneric || (adapter.looksLikeShoppingSite && adapter.looksLikeShoppingSite());

    if (!product && !isShoppingContext) {
      root.innerHTML = "";
      return;
    }

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

        try {
          const result = await cartBuddyAddItem({
            store: adapter.store,
            storeName: adapter.storeName,
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
        } catch {
          // Storage can theoretically fail (quota, extension context
          // invalidated mid-navigation, etc). Tell the user plainly rather
          // than leave the button stuck on "Adding...".
          addBtn.textContent = "Couldn't save, try again";
          addBtn.disabled = false;
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

  // Many large retailers (Walmart, Dick's Sporting Goods, etc) render
  // product data client-side well after document_idle fires, sometimes only
  // after the user interacts with the page (e.g. selecting a size). Fixed
  // timeouts can't reliably predict when that's done, so instead we watch
  // the page for DOM changes and re-check whenever something settles, with
  // a debounce so rapid mutations don't trigger constant re-renders.
  //
  // Two safeguards on top of the basic debounce:
  // - maxWaitTimer: pages that mutate continuously (chat widgets, ad
  //   refreshes, carousels) would otherwise keep resetting the debounce
  //   forever and never actually render. This forces a render at least
  //   every 2.5s regardless of ongoing mutations.
  // - Once a product has been found and a few seconds pass with no further
  //   mutations needed, we disconnect the observer entirely. No reason to
  //   keep watching a page that has already settled; this avoids burning
  //   CPU on every tab for the entire time it's open.
  let debounceTimer = null;
  let maxWaitTimer = null;
  let observerActive = true;
  let settledCheckCount = 0;

  function scheduleRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doRenderAndMaybeSettle, 400);

    if (!maxWaitTimer) {
      maxWaitTimer = setTimeout(() => {
        maxWaitTimer = null;
        doRenderAndMaybeSettle();
      }, 2500);
    }
  }

  function doRenderAndMaybeSettle() {
    clearTimeout(debounceTimer);
    clearTimeout(maxWaitTimer);
    maxWaitTimer = null;
    render();

    // If we've found a product and re-rendered with no change for a couple
    // checks in a row, the page has settled; stop observing to save work.
    if (lastFoundProduct) {
      settledCheckCount++;
      if (settledCheckCount >= 2 && observerActive) {
        observer.disconnect();
        observerActive = false;
      }
    } else {
      settledCheckCount = 0;
    }
  }

  const observer = new MutationObserver((mutations) => {
    if (!observerActive) return;

    // Ignore mutations that originate only from our own widget re-rendering,
    // otherwise innerHTML updates above would trigger this observer forever.
    const isOnlySelfMutation = mutations.every(
      (m) => m.target === root || root.contains(m.target)
    );
    if (isOnlySelfMutation) return;

    scheduleRender();
  });

  // Observe documentElement (the <html> tag) rather than document.body.
  // Some heavy SPA frameworks wholesale-replace document.body's contents
  // (or even swap the body element itself) during hydration; documentElement
  // is effectively never replaced, so this is a more durable attachment
  // point for the observer's entire lifetime.
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Re-check on navigation within the same page (these sites are heavily
  // client-routed, so the URL can change without a full reload).
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      dismissed = false;
      lastFoundProduct = null;
      settledCheckCount = 0;

      // Re-arm the observer for the new "page" (client-side route change),
      // since it may have been disconnected after the previous page settled.
      if (!observerActive) {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true
        });
        observerActive = true;
      }

      render();
    }
  }, 1000);
})();
