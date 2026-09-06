# Muuchstac Glow BD — স্থায়ী নাম ও Logo পরিবর্তন

## লক্ষ্য
আপনার আপলোড করা `orderflow-insights-main` project-এর বর্তমান order, stock, customer, invoice, courier, report ও login সুবিধা অক্ষুণ্ণ রেখে পুরোনো **Rose Nude** branding পুরোপুরি বদলে **Muuchstac Glow BD** এবং দেওয়া logo স্থায়ীভাবে বসানো।

## কী পরিবর্তন হবে

### 1. Project নিরাপদভাবে গ্রহণ
- আপলোড করা project-টিকে বর্তমান workspace-এ আনা হবে; কোনো `.git` history বা অপ্রয়োজনীয় গোপন file কপি করা হবে না।
- বর্তমান TanStack app structure, connected login/data features এবং সব business page বজায় রাখা হবে।

### 2. একটি স্থায়ী brand source
- **Muuchstac Glow BD** নাম ও logo-র জন্য একটি কেন্দ্রীয় brand definition তৈরি হবে।
- sidebar, login page, browser/page titles, invoice, customer email, callback page এবং fallback text একই source ব্যবহার করবে, যাতে ভবিষ্যতে কোনো জায়গায় পুরোনো নাম ফিরে না আসে।
- invoice/settings-এ company name বা logo link দিয়ে brand override করার সুযোগ সরানো বা read-only করা হবে; address, phone, delivery charge, tagline ও thank-you message আগের মতো পরিবর্তন করা যাবে।

### 3. Logo স্থায়ীভাবে বসানো
- দেওয়া square black-gold logo-টি project asset হিসেবে সংরক্ষণ করে sidebar, login এবং invoice-এ পরিষ্কার ও অনুপাত ঠিক রেখে দেখানো হবে।
- একই logo থেকে ছোট, উপযুক্ত browser icon তৈরি করে পুরোনো default icon বদলানো হবে।
- mobile ও desktop—দুই জায়গায় logo ও নাম যেন কাটা/চাপা না পড়ে তা মিলিয়ে নেওয়া হবে।

### 4. পুরোনো নাম সম্পূর্ণ পরিষ্কার
- সব দৃশ্যমান **Rose Nude / Rose Nude Cosmetics / Rose Nude Beauty** লেখা **Muuchstac Glow BD** দিয়ে বদলানো হবে।
- customer order email-এর subject/body, onboarding placeholder, invoice fallback এবং সব page metadata-ও বদলানো হবে।
- পুরোনো সংরক্ষিত shop settings থাকলে নতুন নাম ও logo-তে একবারের safe update যোগ করা হবে; নতুন account-এর default-ও নতুন brand হবে।

### 5. Browser ও sharing পরিচয়
- প্রতিটি content page-এর title, description, Open Graph title/description এবং Twitter card নতুন brand অনুযায়ী ঠিক করা হবে।
- home/dashboard-এর জন্যও আলাদা সঠিক page metadata থাকবে; আর কোনো placeholder/Lovable/Rose Nude পরিচয় থাকবে না।

### 6. যাচাই
- পুরো project-এ পুরোনো brand name আর আছে কি না search করা হবে।
- sign-in page, sidebar/dashboard, invoice/settings এবং browser icon desktop ও mobile-এ দেখা হবে।
- app compile ও প্রয়োজনীয় checks চালিয়ে নিশ্চিত করা হবে যে branding পরিবর্তনে কোনো existing feature নষ্ট হয়নি।

## Technical details
- Logo CDN asset হিসেবে থাকবে; favicon-এর জন্য optimized 64×64 local copy থাকবে।
- Brand constants reusable module থেকে নেওয়া হবে।
- Existing saved settings-এর জন্য idempotent migration ব্যবহার হবে, যাতে একই update একাধিকবার হলেও সমস্যা না হয় এবং user-এর অন্য contact/delivery settings অপরিবর্তিত থাকে।
- Secret values source code-এ যোগ করা হবে না।

## যা অপরিবর্তিত থাকবে
- Order, product, customer, stock, profit, reports, returns, courier, invoice ও authentication-এর বর্তমান কাজের নিয়ম।
- ব্যবহারকারীর address, phone, email, delivery charge, tagline ও thank-you message-এর নিজস্ব saved values।
