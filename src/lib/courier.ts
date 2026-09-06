export const COURIER_PROVIDER = "steadfast" as const;
export const COURIER_LABEL = "State First";

export type CourierStatus =
  | "pending"
  | "in_review"
  | "hold"
  | "delivered_approval_pending"
  | "partial_delivered_approval_pending"
  | "cancelled_approval_pending"
  | "unknown_approval_pending"
  | "delivered"
  | "partial_delivered"
  | "cancelled"
  | "returned"
  | "unknown";

export function courierStatusLabel(status?: string | null) {
  if (!status) return "Not sent";
  const map: Record<string, string> = {
    pending: "Pending pickup",
    in_review: "In review",
    hold: "On hold",
    delivered_approval_pending: "Delivered (approval pending)",
    partial_delivered_approval_pending: "Partly delivered (approval pending)",
    cancelled_approval_pending: "Cancelled (approval pending)",
    unknown_approval_pending: "Approval pending",
    delivered: "Delivered",
    partial_delivered: "Partly delivered",
    cancelled: "Cancelled",
    returned: "Returned",
    unknown: "Unknown",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

export function courierStatusTone(status?: string | null) {
  switch (status) {
    case "delivered":
    case "partial_delivered":
      return "bg-success/12 text-success border-success/25";
    case "cancelled":
    case "returned":
      return "bg-destructive/10 text-destructive border-destructive/25";
    case "hold":
    case "in_review":
      return "bg-gold/25 text-foreground border-gold/50";
    case null:
    case undefined:
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-primary/12 text-primary border-primary/25";
  }
}

/** Steadfast accepts 11-digit Bangladeshi mobile numbers (01XXXXXXXXX). */
export function normalizeBdPhone(raw?: string | null) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) return digits;
  if (digits.length === 13 && digits.startsWith("880")) return digits.slice(2);
  if (digits.length === 14 && digits.startsWith("8801")) return digits.slice(3);
  if (digits.length === 10 && digits.startsWith("1")) return "0" + digits;
  return null;
}
