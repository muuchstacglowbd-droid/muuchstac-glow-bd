/**
 * Parsing helper for the "paste customer message" box on the New order dialog.
 *
 * A customer usually sends one message on Facebook/WhatsApp/SMS that contains
 * their name, mobile number and address together — sometimes on separate
 * lines, sometimes with Bangla labels (নাম / মোবাইল / ঠিকানা), sometimes with
 * no labels at all, and the mobile number is very often typed in Bangla
 * digits (০-৯). This module turns that raw text into clean
 * { name, phone, address } fields, always returning the phone number in
 * plain English digits.
 */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Convert any Bengali digits inside a string to English digits. */
export function bnDigitsToEn(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

const LABEL_PATTERNS = {
  name: /^(নাম|কাস্টমার(?:ে?র)?\s*নাম|customer\s*name|name)\s*[:：\-–]\s*/i,
  phone:
    /^(মোবাইল(?:\s*(?:নাম্বার|নম্বর))?|ফোন(?:\s*(?:নাম্বার|নম্বর))?|নাম্বার|নম্বর|contact|phone(?:\s*number)?|mobile(?:\s*number)?|number)\s*[:：\-–]\s*/i,
  address: /^(ঠিকানা|address)\s*[:：\-–]\s*/i,
};

/**
 * Finds the best-looking Bangladeshi mobile number inside a blob of text,
 * whether it's written in English digits, Bangla digits, or a mix, with or
 * without spaces/dashes/+880. Returns the match already normalised to plain
 * English digits (e.g. "01712345678") plus the exact substring that was
 * matched, so the caller can strip it out of the remaining text.
 */
function extractPhone(text: string): { phone: string; raw: string } | null {
  const candidateRegex = /[+]?[０-９0-9০-৯][０-９0-9০-৯\s-]{7,17}[０-９0-9০-৯]/g;
  let bestElevenDigit: { phone: string; raw: string } | null = null;
  let fallback: { phone: string; raw: string } | null = null;

  let match: RegExpExecArray | null;
  while ((match = candidateRegex.exec(text))) {
    const raw = match[0];
    let digits = bnDigitsToEn(raw).replace(/[^\d]/g, "");

    // Normalise a leading country code down to the local 0-prefixed form.
    if (digits.startsWith("880") && digits.length >= 12) {
      digits = "0" + digits.slice(3);
    } else if (digits.startsWith("0880") && digits.length >= 13) {
      digits = "0" + digits.slice(4);
    }
    // A number typed without the leading 0 (e.g. "1712345678").
    if (digits.length === 10 && digits.startsWith("1")) {
      digits = "0" + digits;
    }

    if (digits.length < 10 || digits.length > 11) continue;

    const candidate = { phone: digits, raw };
    if (digits.length === 11 && digits.startsWith("01")) {
      bestElevenDigit = candidate;
      break;
    }
    if (!fallback) fallback = candidate;
  }

  return bestElevenDigit ?? fallback;
}

export type ParsedCustomer = {
  name: string;
  phone: string;
  address: string;
};

/**
 * Parses a raw, freeform customer message into name / phone / address.
 * Works with:
 *  - Labelled lines in Bangla or English ("নাম: ...", "Address: ...")
 *  - Unlabelled lines (name on one line, phone on another, address on the rest)
 *  - A single line with the three separated by commas
 * The phone number is always returned in English digits, even if the
 * customer originally typed it in Bangla digits.
 */
export function parseCustomerPaste(raw: string): ParsedCustomer {
  const text = raw.trim();
  if (!text) return { name: "", phone: "", address: "" };

  const phoneMatch = extractPhone(text);
  const phone = phoneMatch?.phone ?? "";
  let rest = text;
  if (phoneMatch) {
    // Remove the phone number along with any comma/space glue around it
    // (e.g. "Rahim, 01712345678, Mirpur" -> "Rahim" + "\n" + "Mirpur"),
    // so a comma-separated single line still splits cleanly afterwards.
    const escaped = phoneMatch.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const removalRegex = new RegExp(`[\\s,]*${escaped}[\\s,]*`);
    rest = text.replace(removalRegex, "\n");
  }

  let lines = rest
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // A single-line paste like "Rahim, 01712345678, Mirpur, Dhaka" — split on commas instead.
  if (lines.length <= 1) {
    const commaParts = rest
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (commaParts.length > 1) lines = commaParts;
  }

  let name = "";
  let nameFound = false;
  let addressFound = false;
  const addressParts: string[] = [];

  for (const line of lines) {
    if (LABEL_PATTERNS.phone.test(line)) {
      // A stray "মোবাইল:" label with no digits left after we removed the phone — skip it.
      continue;
    }
    if (!nameFound && LABEL_PATTERNS.name.test(line)) {
      name = line.replace(LABEL_PATTERNS.name, "").trim();
      nameFound = true;
      continue;
    }
    if (LABEL_PATTERNS.address.test(line)) {
      addressParts.push(line.replace(LABEL_PATTERNS.address, "").trim());
      addressFound = true;
      continue;
    }
    if (!nameFound && !addressFound) {
      name = line;
      nameFound = true;
    } else {
      addressParts.push(line);
    }
  }

  return {
    name: name.trim(),
    phone,
    address: addressParts.join(", ").trim(),
  };
}
