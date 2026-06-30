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

  if (host.includes("walmart.com")) {
    return {
      store: "walmart",
      storeName: "Walmart",
      cartUrl: "https://www.walmart.com/cart",
      isProductPage() {
        // Verified against real Walmart product pages: the product title
        // h1 reliably has id="main-title". Fall back to Open Graph/JSON-LD
        // if that's ever missing (Walmart's markup has shifted before).
        const hasMainTitle = Boolean(document.getElementById("main-title"));
        return hasMainTitle || Boolean(readGenericProduct());
      },
      getProduct() {
        const titleEl = document.getElementById("main-title");
        const title = titleEl?.innerText.trim();

        // Walmart's price markup is fragmented (separate spans for
        // strikethrough "was" price, savings amount, and the actual current
        // price, with no single reliable test-id for the current price
        // confirmed). Open Graph data is more reliable here than guessing
        // at price/image DOM structure.
        const og = readFromOpenGraph();
        const image = og?.image || null;

        // An item with no image at all would render broken in the widget
        // and popup, which both assume an image exists. Better to fall
        // through to the generic reader (or fail entirely) than show that.
        if (title && image) {
          return {
            title,
            image,
            price: og?.price || null,
            productUrl: window.location.href.split("?")[0]
          };
        }

        // Dedicated title selector missed entirely; fall back fully.
        const generic = readGenericProduct();
        if (!generic) return null;
        return { ...generic, productUrl: window.location.href.split("?")[0] };
      }
    };
  }

  return getGenericHeuristicAdapter();
}

// Generic fallback adapter for sites we don't have a dedicated adapter for.
// Uses structured data most e-commerce sites already embed for SEO purposes:
// JSON-LD (schema.org/Product), Open Graph meta tags, and microdata, in that
// priority order since JSON-LD tends to be the most reliable when present.
function getGenericHeuristicAdapter() {
  const host = window.location.hostname;
  const storeName = host.replace(/^www\./, "").split(".")[0];
  const storeNameCapitalized = storeName.charAt(0).toUpperCase() + storeName.slice(1);

  return {
    store: storeName,
    storeName: storeNameCapitalized,
    cartUrl: null, // unknown for generic sites; popup falls back to productUrl
    isGeneric: true,

    isProductPage() {
      return Boolean(readGenericProduct());
    },

    // Used to decide whether to show the idle "Hi, ready to shop?" greeting
    // even when we're not currently on a product page (e.g. browsing a
    // category or collection page). Without this, the greeting would only
    // ever show on dedicated stores, never on generic ones.
    looksLikeShoppingSite() {
      return isLikelyEcommercePlatform();
    },

    getProduct() {
      const product = readGenericProduct();
      if (!product) return null;
      return { ...product, productUrl: window.location.href.split("?")[0] };
    }
  };
}

// Lightweight fingerprint for common e-commerce platforms. This is
// intentionally cheap and conservative: false negatives just mean the idle
// greeting doesn't show (no harm), so we only flag the cases we're confident
// about rather than guessing from page text.
function isLikelyEcommercePlatform() {
  // Known large marketplaces are recognizable by hostname alone, and their
  // homepage/search/category pages won't have Product JSON-LD (only
  // individual listing pages do), so this check has to exist independently
  // of the page-content fingerprints below.
  const KNOWN_MARKETPLACE_HOSTS = [
    "etsy.com",
    "walmart.com",
    "bestbuy.com",
    "wayfair.com",
    "newegg.com",
    "chewy.com",
    "homedepot.com",
    "lowes.com",
    "macys.com",
    "nordstrom.com",
    "dickssportinggoods.com"
  ];
  const host = window.location.hostname.replace(/^www\./, "");
  if (KNOWN_MARKETPLACE_HOSTS.some((marketplace) => host.endsWith(marketplace))) {
    return true;
  }

  // IMPORTANT: window.Shopify and similar page-injected JS globals are NOT
  // visible from here. Content scripts run in an isolated JS world separate
  // from the page's own scripts; only the DOM is shared between them. A
  // global a site attaches to its own `window` (like Shopify's
  // window.Shopify) will always read as undefined from a content script,
  // regardless of whether the site is actually running Shopify. This was a
  // real bug (confirmed on Allbirds): the page's own console saw
  // window.Shopify as present, while this code saw it as absent, because
  // they're different `window` objects entirely. All checks below rely on
  // DOM structure or document properties instead, which ARE shared.

  // Shopify-specific DOM fingerprints that don't depend on JS globals:
  // - Shopify injects a script tag referencing cdn.shopify.com or a
  //   *.myshopify.com asset domain on essentially every storefront page.
  // - Shopify's checkout/cart links use a predictable /cart or /checkout
  //   path pattern that's present in nav links on most themes.
  const hasShopifyScriptOrLink = Array.from(
    document.querySelectorAll('script[src], link[href]')
  ).some((el) => {
    const url = el.src || el.href || "";
    return /cdn\.shopify\.com|\.myshopify\.com|shopifycdn\.com/.test(url);
  });
  if (hasShopifyScriptOrLink) return true;

  // og:image pointing at Shopify's CDN is also a valid (if weaker) signal,
  // kept as a fallback in case the script/link scan above misses something.
  const ogImageUrl = document.querySelector('meta[property="og:image"]')?.content || "";
  if (/cdn\.shopify\.com|\.myshopify\.com/.test(ogImageUrl)) return true;

  // WooCommerce (WordPress) adds a body class.
  if (document.body?.className?.includes("woocommerce")) return true;

  // BigCommerce, Magento, and others commonly include a generator meta tag.
  const generator = document.querySelector('meta[name="generator"]')?.content?.toLowerCase();
  if (generator && /shopify|woocommerce|bigcommerce|magento|prestashop/.test(generator)) {
    return true;
  }

  // A page that already has Product JSON-LD anywhere (even if this exact
  // page isn't the product itself, e.g. a collection page linking to one)
  // is a reasonable signal this is a shopping context.
  const hasProductJsonLd = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  ).some((script) => {
    try {
      const data = JSON.parse(script.textContent);
      const candidates = Array.isArray(data) ? data : data["@graph"] || [data];
      return candidates.some((item) => item && isProductType(item["@type"]));
    } catch {
      return false;
    }
  });

  return hasProductJsonLd;
}

function readGenericProduct() {
  return readFromJsonLd() || readFromOpenGraph() || readFromMicrodata();
}

// --- JSON-LD: schema.org/Product ---
function readFromJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue;
    }

    // JSON-LD can be a single object, an array, or nested under @graph.
    const candidates = Array.isArray(data) ? data : data["@graph"] || [data];

    for (const item of candidates) {
      if (!item || !isProductType(item["@type"])) continue;

      const title = item.name;
      const image = extractImageUrl(item.image);
      const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      const price = offer?.price
        ? `${offer.priceCurrency || "$"}${offer.price}`
        : null;

      if (title && image) {
        return { title: title.trim(), image, price };
      }
    }
  }
  return null;
}

// @type can be a plain string ("Product"), an array (["Product", "Thing"]),
// or occasionally a fully-qualified URL (schema.org/Product). Handle all three.
function isProductType(type) {
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && t.toLowerCase().includes("product"));
}

// item.image can be a plain string URL, an array of strings, an array of
// ImageObjects, or a single ImageObject ({ "@type": "ImageObject", url: "..." }).
function extractImageUrl(image) {
  if (!image) return null;
  const first = Array.isArray(image) ? image[0] : image;
  if (typeof first === "string") return first;
  if (first && typeof first === "object") return first.url || first.contentUrl || null;
  return null;
}

// --- Open Graph meta tags ---
function readFromOpenGraph() {
  const ogType = document.querySelector('meta[property="og:type"]')?.content?.toLowerCase();
  const title = document.querySelector('meta[property="og:title"]')?.content;
  const image = document.querySelector('meta[property="og:image"]')?.content;
  const priceAmount = document.querySelector(
    'meta[property="product:price:amount"], meta[property="og:price:amount"]'
  )?.content;
  const priceCurrency =
    document.querySelector(
      'meta[property="product:price:currency"], meta[property="og:price:currency"]'
    )?.content || "$";

  if (!title || !image) return null;

  // Many Shopify/storefront themes never set og:type to "product" even on
  // real product pages, so we can't rely on that alone. Trust this as a
  // product page if EITHER og:type explicitly says product-ish, OR a price
  // meta tag is present (a page with og:title + og:image + an actual price
  // is very unlikely to be anything other than a product).
  const looksLikeProduct =
    (ogType && ogType.includes("product")) || Boolean(priceAmount);

  if (!looksLikeProduct) return null;

  return {
    title: title.trim(),
    image,
    price: priceAmount ? `${priceCurrency}${priceAmount}` : null
  };
}

// --- Microdata: itemtype Product ---
function readFromMicrodata() {
  const productEl = document.querySelector('[itemtype*="schema.org/Product"]');
  if (!productEl) return null;

  const title = productEl
    .querySelector('[itemprop="name"]')
    ?.textContent?.trim();
  const image =
    productEl.querySelector('[itemprop="image"]')?.src ||
    productEl.querySelector('[itemprop="image"]')?.content;
  const price = productEl.querySelector('[itemprop="price"]')?.content
    ? `$${productEl.querySelector('[itemprop="price"]').content}`
    : null;

  if (title && image) {
    return { title, image, price };
  }
  return null;
}
