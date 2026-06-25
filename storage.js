// storage.js
// Single source of truth for reading and writing Cart Buddy's saved items.
// Shape of one item:
// {
//   id: string (unique),
//   store: "amazon" | "ebay" | "target",
//   title: string,
//   image: string (url),
//   price: string | null,
//   productUrl: string,
//   cartUrl: string,
//   savedAt: number (timestamp)
// }

const CART_BUDDY_STORAGE_KEY = "cartBuddyItems";

function cartBuddyGetAll() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CART_BUDDY_STORAGE_KEY], (result) => {
      resolve(result[CART_BUDDY_STORAGE_KEY] || []);
    });
  });
}

function cartBuddySaveAll(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CART_BUDDY_STORAGE_KEY]: items }, () => {
      resolve();
    });
  });
}

async function cartBuddyAddItem(item) {
  const items = await cartBuddyGetAll();

  // Avoid duplicate saves of the exact same product URL.
  const alreadySaved = items.some((existing) => existing.productUrl === item.productUrl);
  if (alreadySaved) {
    return { added: false, items };
  }

  const newItem = {
    id: `${item.store}-${Date.now()}`,
    savedAt: Date.now(),
    ...item
  };

  const updated = [newItem, ...items];
  await cartBuddySaveAll(updated);
  return { added: true, items: updated };
}

async function cartBuddyRemoveItem(id) {
  const items = await cartBuddyGetAll();
  const updated = items.filter((item) => item.id !== id);
  await cartBuddySaveAll(updated);
  return updated;
}
