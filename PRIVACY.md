# Privacy Policy for Cart Buddy

**Last updated: June 25, 2026**

Cart Buddy is a browser extension that helps you keep track of products you've viewed on Amazon, eBay, and Target. This policy explains exactly what the extension does and does not do with your data.

## Summary

Cart Buddy does not collect, transmit, sell, or share any user data. Everything it stores stays on your own device.

## What Cart Buddy accesses

When you click "Add to cart" on a supported product page (Amazon, eBay, or Target), Cart Buddy reads the following directly from that page:

- Product title
- Product image URL
- Product price
- Product page URL

This information is saved to your browser's local storage (`chrome.storage.local`) so it can be shown to you later in the extension popup. It is not sent to any server, API, or third party. Cart Buddy has no backend and makes no network requests.

## What Cart Buddy does not do

- It does not collect personally identifiable information (name, email, address, etc.)
- It does not collect health, financial, or authentication information
- It does not track your browsing history or activity outside of supported product pages
- It does not use cookies, analytics, or tracking pixels
- It does not transmit any data off your device
- It does not sell or share data with third parties
- It does not use remote code; all code runs from the extension package you installed

## Permissions explained

- **storage**: used to save the items you choose to add, locally on your device
- **activeTab**: used so the popup can open a link in your current tab when you click a saved item
- **Host permissions (amazon.com, ebay.com, target.com)**: used so the extension can recognize when you're on a supported product page and read that page's title, image, and price when you choose to save it

## Data retention and deletion

Saved items remain in your browser's local storage until you remove them using the remove button in the popup, or until you uninstall the extension, which clears all stored data automatically.

## Changes to this policy

If this policy changes, the update will be reflected here with a new "Last updated" date.

## Contact

Questions about this policy can be raised via the [GitHub repository](https://github.com/JVP7/cart-buddy/issues).
