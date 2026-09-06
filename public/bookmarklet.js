/**
 * Yad2 to ApartmentTracker Bookmarklet
 * 
 * This script extracts apartment data from a Yad2 listing page
 * and redirects to the ApartmentTracker app with the data pre-filled.
 * 
 * To use: Create a bookmark with this as the URL (minified version below)
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
    const pageProps = nextData?.props?.pageProps;

    if (!pageProps) {
      alert('Could not parse listing data.');
      return;
    }

    // Extract all the fields
    const data = {
      url: window.location.href,
      title: '',
      price: '',
      phone: '',
      seller_name: '',
      image_url: '',
      images: []
    };

    // Address/Title
    if (pageProps.addressTitle?.title) {
      data.title = pageProps.addressTitle.title;
    } else if (pageProps.title) {
      data.title = pageProps.title;
    }

    // Price
    if (pageProps.price) {
      // Remove currency symbols and commas
      data.price = String(pageProps.price).replace(/[^\d]/g, '');
    }

    // Phone - try multiple sources
    if (pageProps.contactInfo?.phone) {
      data.phone = pageProps.contactInfo.phone;
    } else if (pageProps.sellerInfo?.phone) {
      data.phone = pageProps.sellerInfo.phone;
    }

    // Seller name
    if (pageProps.contactInfo?.name) {
      data.seller_name = pageProps.contactInfo.name;
    } else if (pageProps.sellerInfo?.name) {
      data.seller_name = pageProps.sellerInfo.name;
    }

    // Images
    if (pageProps.metaData?.images && Array.isArray(pageProps.metaData.images)) {
      data.images = pageProps.metaData.images;
      if (data.images.length > 0) {
        data.image_url = data.images[0];
      }
    } else if (pageProps.images && Array.isArray(pageProps.images)) {
      data.images = pageProps.images;
      if (data.images.length > 0) {
        data.image_url = data.images[0];
      }
    }

    // If we couldn't get phone from __NEXT_DATA__, it might be loaded dynamically
    // Try to find it in the page DOM as fallback
    if (!data.phone) {
      const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
      if (phoneLinks.length > 0) {
        data.phone = phoneLinks[0].href.replace('tel:', '');
      }
    }

    // Build the redirect URL
    // Your app's URL - change this to your production URL
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
