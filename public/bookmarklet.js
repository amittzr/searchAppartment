/**
 * Yad2 to ApartmentTracker Bookmarklet
 * 
 * This script extracts apartment data from a Yad2 listing page
 * and redirects to the ApartmentTracker app with the data pre-filled.
 * 
 * Updated: 2026-09 - Yad2 now uses dehydratedState structure
 */

(function() {
  try {
    // Check if we're on a Yad2 listing page
    if (!window.location.hostname.includes('yad2.co.il')) {
      alert('Please use this bookmarklet on a Yad2 listing page.');
      return;
    }

    // Try to get __NEXT_DATA__ which contains all the listing info
    const nextDataEl = document.getElementById('__NEXT_DATA__');
    if (!nextDataEl) {
      alert('Could not find listing data. Make sure you are on a single listing page (not the search results).');
      return;
    }

    const nextData = JSON.parse(nextDataEl.textContent);
    
    // New structure: data is in dehydratedState.queries[0].state.data
    const itemData = nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data;
    
    if (!itemData) {
      alert('Could not parse listing data. Make sure you are on a single listing page.');
      return;
    }

    // Extract all the fields from the new structure
    const data = {
      url: window.location.href,
      title: '',
      price: '',
      phone: '',
      seller_name: '',
      image_url: '',
      images: []
    };

    // Address/Title - build from address components
    const addr = itemData.address;
    if (addr) {
      const parts = [];
      if (addr.street?.text) parts.push(addr.street.text);
      if (addr.houseNumber?.number) parts.push(addr.houseNumber.number);
      if (addr.neighborhood?.text) parts.push(addr.neighborhood.text);
      if (addr.city?.text) parts.push(addr.city.text);
      data.title = parts.join(', ');
    }

    // Price
    if (itemData.price) {
      data.price = String(itemData.price).replace(/[^\d]/g, '');
    }

    // Seller name from customer
    if (itemData.customer?.name) {
      data.seller_name = itemData.customer.name;
    }

    // Phone from customer (might be undefined if virtual)
    if (itemData.customer?.phone) {
      data.phone = itemData.customer.phone;
    }

    // Images from metaData
    if (itemData.metaData?.images && Array.isArray(itemData.metaData.images)) {
      data.images = itemData.metaData.images;
      if (data.images.length > 0) {
        data.image_url = data.images[0];
      }
    }

    // Fallback: try to find phone in the page DOM
    if (!data.phone) {
      const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
      if (phoneLinks.length > 0) {
        data.phone = phoneLinks[0].href.replace('tel:', '');
      }
    }

    // Build the redirect URL
    const appUrl = 'https://search-appartment.vercel.app';
    
    const params = new URLSearchParams();
    params.set('autofill', 'true');
    params.set('url', data.url);
    if (data.title) params.set('title', data.title);
    if (data.price) params.set('price', data.price);
    if (data.phone) params.set('phone', data.phone);
    if (data.seller_name) params.set('seller_name', data.seller_name);
    if (data.image_url) params.set('image_url', data.image_url);
    if (data.images.length > 0) {
      params.set('images', JSON.stringify(data.images));
    }

    // Redirect to the app
    window.location.href = appUrl + '?' + params.toString();

  } catch (err) {
    alert('Error extracting data: ' + err.message);
    console.error('Bookmarklet error:', err);
  }
})();
