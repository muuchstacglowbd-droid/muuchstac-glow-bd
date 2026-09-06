import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshAllCourierStatuses, sendOrderToCourier } from "@/lib/courier.functions";
import { COURIER_LABEL, courierStatusLabel, courierStatusTone } from "@/lib/courier";
import type { Order } from "@/lib/shop";

export function CourierCell({ order }: { order: Order }) {
  const qc = useQueryClient();
  const send = useServerFn(sendOrderToCourier);

  const sendMutation = useMutation({
    mutationFn: () => send({ data: { orderId: order.id } }),
    onSuccess: (r) => {
      toast.success(`Sent to ${COURIER_LABEL} — consignment ${r.consignmentId}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the order"),
  });

  if (!order.consignment_id) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 whitespace-nowrap text-xs"
        onClick={() => sendMutation.mutate()}
        disabled={sendMutation.isPending}
      >
        <Send className="size-3.5" />
        {sendMutation.isPending ? "Sending…" : `Send to ${COURIER_LABEL}`}
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <span
        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${courierStatusTone(order.courier_status)}`}
      >
        {courierStatusLabel(order.courier_status)}
      </span>
      {order.tracking_code && (
        <p className="num text-xs text-muted-foreground">{order.tracking_code}</p>
      )}
    </div>
  );
}

export function RefreshAllCourierButton() {
  const qc = useQueryClient();
  const refreshAll = useServerFn(refreshAllCourierStatuses);
  const mutation = useMutation({
    mutationFn: () => refreshAll({}),
    onSuccess: (r) => {
      toast.success(
        r.checked === 0
          ? "No parcels waiting for an update"
          : `Checked ${r.checked} parcels · ${r.updated} updated`,
      );
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not refresh"),
  });

  return (
    <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      <RefreshCw className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`} />
      Refresh delivery status
    </Button>
  );
}
