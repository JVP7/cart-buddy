// site-adapters.js
// Each adapter knows how to read ONE site's DOM. This is the only file
// that needs new code when we add a 4th store later.

function getCartBuddySiteAdapter() {
  const host = window.location.hostname;

  if (host.includes("amazon.com")) {
    return {
      store: "amazon",
      storeName: "Amazon",
      cartUrl: "https://www.amazon.com/gp/cart/view.html",
      isProductPage() {
        return Boolean(document.getElementById("productTitle"));
      },
      getProduct() {
        const title = document.getElementById("productTitle")?.innerText.trim();
        const image =
          document.getElementById("landingImage")?.src ||
          document.querySelector("#imgTagWrapperId img")?.src;
        const price =
          document.querySelector(".a-price .a-offscreen")?.innerText ||
          document.querySelector("#priceblock_ourprice")?.innerText ||
          null;
        if (!title || !image) return null;
        return { title, image, price, productUrl: window.location.href.split("?")[0] };
      }
    };
  }

  if (host.includes("ebay.com")) {
    return {
      store: "ebay",
      storeName: "eBay",
      cartUrl: "https://cart.ebay.com/",
      isProductPage() {
        return Boolean(document.querySelector("h1.x-item-title__mainTitle"));
      },
      getProduct() {
        const title = document
          .querySelector("h1.x-item-title__mainTitle")
          ?.innerText.trim();
        const image = document.querySelector("#icImg")?.src;
        const price = document.querySelector(".x-price-primary")?.innerText || null;
        if (!title || !image) return null;
        return { title, image, price, productUrl: window.location.href.split("?")[0] };
      }
    };
  }

  if (host.includes("target.com")) {
    return {
      store: "target",
      storeName: "Target",
      cartUrl: "https://www.target.com/cart",
      isProductPage() {
        return Boolean(document.querySelector('h1[data-test="product-title"]'));
      },
      getProduct() {
        const title = document
          .querySelector('h1[data-test="product-title"]')
          ?.innerText.trim();
        const image = document.querySelector('picture img')?.src;
        const price =
          document.querySelector('[data-test="product-price"]')?.innerText || null;
        if (!title || !image) return null;
        return { title, image, price, productUrl: window.location.href.split("?")[0] };
      }
    };
  }

  return null;
}
