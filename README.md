# Cart Buddy 🐻

A friendly browser extension that keeps track of everything you've spotted across Amazon, eBay, and Target, so you don't lose track of items saved on different shopping platforms.

While browsing a supported store, a small bear shows up to say hi. When you land on a product page, it offers to save that item to your universal cart. Open the extension popup any time to see everything you've saved, grouped by store, and jump straight back to any product with one click.

## Features

- Floating widget on Amazon, eBay, and Target product pages
- One-click "Add to cart" saves the product's title, image, price, and link
- Popup view groups saved items by store with a color-coded tag
- Click any saved item's image to open that product in a new tab
- Remove items you no longer want tracked
- All data stored locally in your browser, nothing leaves your machine

## Installing

Cart Buddy is currently pending review on the Chrome Web Store. Until it's approved and live, you can run it locally:

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `cart-buddy` folder
5. Visit a product page on Amazon, eBay, or Target to see the widget

Once published, this section will be updated with a direct Chrome Web Store install link.

## Project structure

```
cart-buddy/
├── manifest.json              # Extension config and permissions
├── background.js              # Service worker (minimal, reserved for future use)
├── storage.js                 # Shared read/write helpers for saved items
├── content-scripts/
│   ├── site-adapters.js       # Per-site logic for detecting and reading products
│   ├── widget.js               # Mounts the floating bear widget
│   └── widget.css
├── popup/
│   ├── popup.html             # The "universal cart" view
│   ├── popup.js
│   └── popup.css
└── icons/
```

## Adding support for another store

All store-specific logic lives in `content-scripts/site-adapters.js`. To add a new store:

1. Add an adapter block with the store's hostname check, a CSS selector to detect a product page, and a function to read the title/image/price
2. Add the store's domain to `matches` in `manifest.json` under `content_scripts`
3. Add a color tag for the store in `popup/popup.css` and `popup/popup.js`

## Known limitations

- Site selectors are based on each store's current page structure and may break if a site redesigns its product pages
- The extension links back to the product page rather than directly into the cart, since login state can't be reliably detected from a content script
- Currently local-storage only; saved items don't sync across devices

## Privacy

Cart Buddy collects no user data and makes no network requests. Everything is stored locally on your device. See [PRIVACY.md](PRIVACY.md) for the full policy.

## License

MIT, see [LICENSE](LICENSE).
