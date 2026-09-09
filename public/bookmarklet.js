/**
 * Yad2 to GroupPick Bookmarklet
 *
 * Extracts apartment data from a Yad2 listing page and redirects
 * to the GroupPick app with the data pre-filled.
 *
 * Supports both URL formats:
 *   - https://www.yad2.co.il/realestate/item/...
 *   - https://www.yad2.co.il/realestate/listing/...  (agency/project listings)
 *
 * Updated: 2026-09 — v2.1: /listing/ support + graceful fallback
 */

(function () {
  "use strict";

  var APP_URL = "https://search-appartment.vercel.app";

  // ── Step 1: Validate we are on a supported Yad2 page ──────────────────────
  var hostname = window.location.hostname;
  var isYad2   = hostname.includes("yad2.co.il") || hostname.includes("yad-il.co.il");

  if (!isYad2) {
    alert("Please use this bookmarklet on a Yad2 listing page.");
    return;
  }

  var currentUrl = window.location.href;
  var isItemPage    = currentUrl.includes("/item/");
  var isListingPage = currentUrl.includes("/listing/");

  if (!isItemPage && !isListingPage) {
    alert("Please navigate to a single listing page first (not search results).");
    return;
  }

  // ── Step 2: Try client-side extraction from __NEXT_DATA__ ─────────────────
  var extracted = {
    url:         currentUrl,
    title:       "",
    price:       "",
    rooms:       "",
    phone:       "",
    seller_name: "",
    image_url:   "",
    images:      []
  };

  var clientSideSuccess = false;

  try {
    var nextDataEl = document.getElementById("__NEXT_DATA__");
    if (nextDataEl && nextDataEl.textContent) {
      var nextData = JSON.parse(nextDataEl.textContent);

      // Scan ALL queries — yad-il.co.il puts listing data in queries[1], not [0]
      var queries = (nextData.props && nextData.props.pageProps &&
        nextData.props.pageProps.dehydratedState &&
        nextData.props.pageProps.dehydratedState.queries) || [];

      var itemData = null;
      for (var q = 0; q < queries.length; q++) {
        var candidate = queries[q] && queries[q].state && queries[q].state.data;
        if (candidate && (candidate.token || candidate.price || candidate.address)) {
          itemData = candidate;
          break;
        }
      }

      // Fallback paths for other page structures
      if (!itemData) {
        itemData = (nextData.props && nextData.props.pageProps && nextData.props.pageProps.listing) ||
                   (nextData.props && nextData.props.pageProps && nextData.props.pageProps.item) ||
                   null;
      }

      if (itemData) {
        // Address / Title
        var addr = itemData.address;
        if (addr) {
          var parts = [];
          if (addr.street && addr.street.text) parts.push(addr.street.text);
          if (addr.houseNumber && addr.houseNumber.number) parts.push(addr.houseNumber.number);
          if (addr.neighborhood && addr.neighborhood.text) parts.push(addr.neighborhood.text);
          if (addr.city && addr.city.text) parts.push(addr.city.text);
          if (parts.length > 0) extracted.title = parts.join(", ");
        }

        // Price
        if (itemData.price) {
          extracted.price = String(itemData.price).replace(/[^\d]/g, "");
        }

        // Rooms — check multiple locations
        var roomsVal =
          (itemData.additionalDetails && (itemData.additionalDetails.roomsCount || itemData.additionalDetails.rooms)) ||
          itemData.rooms ||
          itemData.roomsCount ||
          // infoBar array: [{key: "rooms", value: "3"}, ...]
          (itemData.infoBar && (function () {
            for (var i = 0; i < itemData.infoBar.length; i++) {
              if (itemData.infoBar[i].key === "rooms" || itemData.infoBar[i].key === "roomsCount") {
                return itemData.infoBar[i].value;
              }
            }
            return null;
          })()) ||
          null;
        if (roomsVal) extracted.rooms = String(roomsVal);

        // Seller name
        if (itemData.customer && itemData.customer.name) {
          extracted.seller_name = itemData.customer.name;
        }

        // Phone (may be virtual/hidden — best effort)
        if (itemData.customer && itemData.customer.phone) {
          extracted.phone = itemData.customer.phone;
        }

        // Images
        if (itemData.metaData && Array.isArray(itemData.metaData.images) && itemData.metaData.images.length > 0) {
          extracted.images   = itemData.metaData.images;
          extracted.image_url = extracted.images[0];
        } else if (itemData.metaData && itemData.metaData.coverImage) {
          extracted.image_url = itemData.metaData.coverImage;
          extracted.images    = [itemData.metaData.coverImage];
        }

        // Mark extraction as successful if we got at least a title or price
        if (extracted.title || extracted.price) {
          clientSideSuccess = true;
        }
      }
    }
  } catch (err) {
    console.warn("GroupPick bookmarklet: __NEXT_DATA__ parse failed:", err);
  }

  // ── Step 3: DOM fallbacks for phone if not found in JSON ──────────────────
  if (!extracted.phone) {
    try {
      // Check if user already clicked "show phone" button
      var phoneLinks = document.querySelectorAll("a[href^=\"tel:\"]");
      if (phoneLinks.length > 0) {
        extracted.phone = phoneLinks[0].getAttribute("href").replace("tel:", "");
      }
    } catch (e) { /* ignore */ }
  }

  if (!extracted.phone) {
    try {
      // Scan visible text for Israeli mobile number pattern
      var bodyText = document.body.innerText || "";
      var phoneMatch = bodyText.match(/0[5-9][0-9][-\s]?[0-9]{3}[-\s]?[0-9]{4}/);
      if (phoneMatch) {
        extracted.phone = phoneMatch[0].replace(/[-\s]/g, "");
      }
    } catch (e) { /* ignore */ }
  }

  // ── Step 4: Build redirect URL and send to app ────────────────────────────
  // If client-side extraction failed (e.g. different page structure),
  // we still redirect with just the URL — the app's server-side scraper
  // will handle fetching the data via the API.
  var params = new URLSearchParams();
  params.set("autofill", "true");
  params.set("url", extracted.url);

  if (clientSideSuccess) {
    // Full data available — pre-fill everything
    if (extracted.title)       params.set("title",       extracted.title);
    if (extracted.price)       params.set("price",       extracted.price);
    if (extracted.rooms)       params.set("rooms",       extracted.rooms);
    if (extracted.phone)       params.set("phone",       extracted.phone);
    if (extracted.seller_name) params.set("seller_name", extracted.seller_name);
    if (extracted.image_url)   params.set("image_url",   extracted.image_url);
    if (extracted.images.length > 0) {
      params.set("images", JSON.stringify(extracted.images));
    }
  } else {
    // Graceful fallback: send just the URL, the app will auto-trigger scraping
    params.set("autoscrape", "true");
  }

  window.location.href = APP_URL + "/?" + params.toString();

})();
