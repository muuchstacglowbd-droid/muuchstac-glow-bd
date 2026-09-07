export const BRAND_NAME = "Muuchstac Glow BD";
export const BRAND_TAGLINE = "Beauty & Cosmetics";
// লোগো আগে "/__l5e/assets-v1/..." থেকে লোড হতো — এই path শুধু Lovable-এর
// hosting-এ কাজ করে। নিজের domain-এ (Cloudflare Workers) এটা 404 দিচ্ছিল,
// তাই লোগো broken দেখাচ্ছিল। এখন এটা normal static file হিসেবে সার্ভ হবে:
// আপনার আসল লোগো PNG ফাইলটা `public/logo.png` নামে সেভ করুন
// (ঠিক public/favicon.png যেখানে আছে, সেই একই ফোল্ডারে)।
export const BRAND_LOGO_URL = "/logo.png";
export const BRAND_DESCRIPTION =
  "Manage Muuchstac Glow BD orders, invoices, inventory and customers in one control panel.";