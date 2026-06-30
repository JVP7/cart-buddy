
<img width="1400" height="560" alt="cart-buddy-marquee-1400x560" src="https://github.com/user-attachments/assets/a28093cc-36ba-44a8-884b-53dfedc0795e" />


# Cart Buddy 🐻

A friendly browser extension that keeps track of everything you've spotted while shopping online, so you don't lose track of items saved across different sites.

While browsing, a small bear shows up to say hi. When you land on a product page, it offers to save that item to your universal cart. Open the extension popup any time to see everything you've saved, grouped by store, and jump straight back to any product with one click.

## Features

- Dedicated, verified support for Amazon, eBay, Target, and Walmart
- Universal detection on most other online stores, using structured data (schema.org JSON-LD, Open Graph, microdata) and platform fingerprinting (Shopify, WooCommerce, BigCommerce, and others)
- One-click "Add to cart" saves the product's title, image, price, and link
- Popup view groups saved items by store with a color-coded tag (unrecognized stores get a default amber tag so labels are always legible)
- Click any saved item's image to open that product in a new tab
- Remove items you no longer want tracked
- All data stored locally in your browser, nothing leaves your machine

## How universal detection works

Beyond the four dedicated stores, Cart Buddy checks each page for:

1. **JSON-LD structured data** (`schema.org/Product`) — the most common and reliable signal, used by most major e-commerce platforms
2. **Open Graph product tags** (`og:title`, `og:image`, price meta tags)
3. **Microdata** (`itemtype="schema.org/Product"`)
4. **Platform fingerprinting** for the idle greeting — recognizes Shopify, WooCommerce, BigCommerce, and a list of known major marketplaces, via DOM signals like script/link tags, body classes, and generator meta tags

**Known limitation:** a small number of sites (confirmed: Aldi, Alibaba) implement none of these standards at all, so there's nothing for any heuristic to detect. This isn't a bug, those sites simply don't expose machine-readable product data. Support for sites like that would require either a dedicated per-site adapter or AI-based page reading, both real scope increases beyond what this extension currently does.

## Installing

Cart Buddy is currently pending review on the Chrome Web Store. Until it's approved and live, you can run it locally:

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `cart-buddy` folder
5. Visit a product page on Amazon, eBay, Target, Walmart, or most other online stores to see the widget

Once published, this section will be updated with a direct Chrome Web Store install link.

## Project structure

```
cart-buddy/
├── manifest.json              # Extension config and permissions
├── background.js              # Service worker (minimal, reserved for future use)
├── storage.js                 # Shared read/write helpers for saved items
├── content-scripts/
│   ├── site-adapters.js       # Per-site logic + universal structured-data detection
│   ├── widget.js               # Mounts the floating bear widget
│   └── widget.css
├── popup/
│   ├── popup.html             # The "universal cart" view
│   ├── popup.js
│   └── popup.css
└── icons/
```

## Adding a new dedicated store adapter

Most sites are already covered by the universal detection layer, so a dedicated adapter is usually only worth adding for a major, permanent retailer with selectors you've personally verified against the live DOM (not guessed). To add one:

1. Add an adapter block in `content-scripts/site-adapters.js` with the store's hostname check, a verified CSS selector to detect a product page, and a function to read the title/image/price. Fall back to `readGenericProduct()` if your selectors might miss.
2. Add the store's domain to `KNOWN_MARKETPLACE_HOSTS` in `isLikelyEcommercePlatform()` if it has no structured data on non-product pages, so the idle greeting still works there.
3. Add a color tag for the store in `popup/popup.css` and `popup/popup.js` (optional; unrecognized stores already get a legible default).

## Technical notes for contributors

- Content scripts run in an **isolated JS world**, separate from the page's own scripts. They share the DOM but NOT JavaScript globals. A page-injected variable like `window.Shopify` will never be visible from a content script, even though it's visible from the browser console. All platform detection here relies on DOM structure (script/link tags, body classes, meta tags) rather than JS globals, for exactly this reason.
- The widget uses a debounced `MutationObserver` (watching `document.documentElement`, not `document.body`, since some frameworks replace body's contents wholesale) instead of fixed timeouts, since many sites render product data asynchronously well after initial page load.

## Known limitations

- A handful of sites with no structured data and no recognizable platform fingerprint won't be detected at all (see above)
- The extension links back to the product page rather than directly into the cart, since login state can't be reliably detected from a content script
- Currently local-storage only; saved items don't sync across devices

## Privacy

Cart Buddy collects no user data and makes no network requests. Everything is stored locally on your device. See [PRIVACY.md](PRIVACY.md) for the full policy.

## License

MIT, see [LICENSE](LICENSE).
