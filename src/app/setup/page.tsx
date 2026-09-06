"use client";

import { useState } from "react";
import { Copy, Check, Smartphone, Monitor, ArrowLeft, BookMarked } from "lucide-react";
import Link from "next/link";

// Minified bookmarklet code - updated for new Yad2 dehydratedState structure
const BOOKMARKLET_CODE = `javascript:(function(){try{if(!window.location.hostname.includes('yad2.co.il')){alert('Please use this on a Yad2 listing page.');return;}var d=document.getElementById('__NEXT_DATA__');if(!d){alert('Could not find listing data. Make sure you are on a single listing page.');return;}var n=JSON.parse(d.textContent);var item=n?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data;if(!item){alert('Could not parse listing data.');return;}var data={url:window.location.href,title:'',price:'',phone:'',seller_name:'',image_url:'',images:[]};var addr=item.address;if(addr){var parts=[];if(addr.street?.text)parts.push(addr.street.text);if(addr.houseNumber?.number)parts.push(addr.houseNumber.number);if(addr.neighborhood?.text)parts.push(addr.neighborhood.text);if(addr.city?.text)parts.push(addr.city.text);data.title=parts.join(', ');}if(item.price)data.price=String(item.price);if(item.customer?.name)data.seller_name=item.customer.name;if(item.customer?.phone)data.phone=item.customer.phone;if(item.metaData?.images){data.images=item.metaData.images;if(data.images.length>0)data.image_url=data.images[0];}if(!data.phone){var tel=document.querySelector('a[href^="tel:"]');if(tel)data.phone=tel.href.replace('tel:','');}var u=new URLSearchParams();u.set('autofill','true');u.set('url',data.url);if(data.title)u.set('title',data.title);if(data.price)u.set('price',data.price);if(data.phone)u.set('phone',data.phone);if(data.seller_name)u.set('seller_name',data.seller_name);if(data.image_url)u.set('image_url',data.image_url);if(data.images.length>0)u.set('images',JSON.stringify(data.images));window.location.href='https://search-appartment.vercel.app?'+u.toString();}catch(e){alert('Error: '+e.message);}})();`;

export default function SetupPage() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"mobile" | "desktop">("mobile");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = BOOKMARKLET_CODE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex-1" />
          <BookMarked className="w-5 h-5 text-brand-600" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Setup Yad2 Auto-Fill
          </h1>
          <p className="text-slate-500">
            Add apartments from Yad2 with one tap - works on mobile and desktop
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("mobile")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === "mobile"
                ? "bg-brand-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Mobile
          </button>
          <button
            onClick={() => setActiveTab("desktop")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === "desktop"
                ? "bg-brand-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            <Monitor className="w-4 h-4" />
            Desktop
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {activeTab === "mobile" ? (
            <MobileInstructions onCopy={handleCopy} copied={copied} code={BOOKMARKLET_CODE} />
          ) : (
            <DesktopInstructions onCopy={handleCopy} copied={copied} code={BOOKMARKLET_CODE} />
          )}
        </div>

        {/* How to use */}
        <div className="mt-8 bg-green-50 rounded-2xl border border-green-200 p-6">
          <h2 className="font-bold text-green-800 mb-3">How to use:</h2>
          <ol className="space-y-2 text-green-700 text-sm">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Browse Yad2 and find an apartment you like</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Open the listing page (not the search results)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Open your bookmarks and tap "Add to Tracker"</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <span>The form opens with all fields pre-filled!</span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}

function MobileInstructions({
  onCopy,
  copied,
  code,
}: {
  onCopy: () => void;
  copied: boolean;
  code: string;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {/* Step 1 */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            1
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Copy the bookmarklet code</h3>
            <p className="text-sm text-slate-500 mb-3">
              Tap the button below to copy the magic code to your clipboard.
            </p>
            <button
              onClick={onCopy}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                copied
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-brand-600 text-white hover:bg-brand-700 shadow-md"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Bookmarklet Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            2
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Create a new bookmark</h3>
            <p className="text-sm text-slate-500">
              <strong>Safari (iPhone):</strong> Tap the share button, then "Add Bookmark". Name it "Add to Tracker".
            </p>
            <p className="text-sm text-slate-500 mt-2">
              <strong>Chrome (Android):</strong> Tap the three dots menu → Bookmarks → Add bookmark. Name it "Add to Tracker".
            </p>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            3
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Edit the bookmark</h3>
            <p className="text-sm text-slate-500">
              <strong>Safari:</strong> Go to Bookmarks, long-press "Add to Tracker", tap Edit. Delete the URL and paste the copied code.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              <strong>Chrome:</strong> Go to Bookmarks, tap the three dots next to "Add to Tracker", tap Edit. Replace the URL with the copied code.
            </p>
          </div>
        </div>
      </div>

      {/* Step 4 */}
      <div className="p-5 bg-slate-50">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            ✓
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Done!</h3>
            <p className="text-sm text-slate-500">
              Now when you're on any Yad2 listing, open your bookmarks and tap "Add to Tracker". 
              The apartment details will be automatically filled in!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopInstructions({
  onCopy,
  copied,
  code,
}: {
  onCopy: () => void;
  copied: boolean;
  code: string;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {/* Step 1 */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            1
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Show your bookmarks bar</h3>
            <p className="text-sm text-slate-500">
              <strong>Chrome:</strong> Press Ctrl+Shift+B (Windows) or Cmd+Shift+B (Mac)
            </p>
            <p className="text-sm text-slate-500 mt-1">
              <strong>Safari:</strong> View menu → Show Favorites Bar
            </p>
            <p className="text-sm text-slate-500 mt-1">
              <strong>Firefox:</strong> View → Toolbars → Bookmarks Toolbar
            </p>
          </div>
        </div>
      </div>

      {/* Step 2 - Drag button */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            2
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Drag this button to your bookmarks bar</h3>
            <p className="text-sm text-slate-500 mb-3">
              Click and drag the button below to your bookmarks bar:
            </p>
            <a
              href={code}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold shadow-md cursor-grab active:cursor-grabbing"
              draggable="true"
            >
              <BookMarked className="w-4 h-4" />
              Add to Tracker
            </a>
            <p className="text-xs text-slate-400 mt-2">
              (Don't click it here - drag it to your bookmarks bar!)
            </p>
          </div>
        </div>
      </div>

      {/* Alternative: Copy */}
      <div className="p-5 bg-slate-50">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            ?
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Can't drag? Copy manually</h3>
            <p className="text-sm text-slate-500 mb-3">
              Create a new bookmark, name it "Add to Tracker", and paste this as the URL:
            </p>
            <button
              onClick={onCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                copied
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-white text-slate-700 border border-slate-300 hover:border-slate-400"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
