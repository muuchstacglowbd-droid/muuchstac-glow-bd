import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, Send, Truck, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listCourierEvents,
  refreshCourierStatus,
  sendOrderToCourier,
} from "@/lib/courier.functions";
import { markOrderCancelled, markOrderDelivered, markOrderReturned } from "@/lib/data";
import { COURIER_LABEL, courierStatusLabel, courierStatusTone } from "@/lib/courier";
import type { Order } from "@/lib/shop";


export function CourierPanel({ order }: { order: Order }) {
  const qc = useQueryClient();
  const send = useServerFn(sendOrderToCourier);
  const refresh = useServerFn(refreshCourierStatus);
  const events = useServerFn(listCourierEvents);
  const sent = Boolean(order.consignment_id);

  const timeline = useQuery({
    queryKey: ["courier_events", order.id],
    queryFn: () => events({ data: { orderId: order.id } }),
    enabled: sent,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["courier_events", order.id] });
  };

  const sendMutation = useMutation({
    mutationFn: () => send({ data: { orderId: order.id } }),
    onSuccess: (r) => {
      toast.success(`Sent to ${COURIER_LABEL} — consignment ${r.consignmentId}`);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the order"),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refresh({ data: { orderId: order.id } }),
    onSuccess: (r) => {
      toast.success(
        r.changed
          ? `Status updated: ${courierStatusLabel(r.status)}`
          : `No change — still ${courierStatusLabel(r.status)}`,
      );
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not refresh"),
  });

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnCost, setReturnCost] = useState("");

  const outcome = useMutation({
    mutationFn: async (kind: "delivered" | "cancelled" | "returned") => {
      if (kind === "delivered") await markOrderDelivered(order);
      else if (kind === "cancelled") await markOrderCancelled(order);
      else await markOrderReturned(order, Number(returnCost) || 0);
      return kind;
    },
    onSuccess: (kind) => {
      toast.success(
        kind === "delivered"
          ? "Saved as delivered"
          : kind === "cancelled"
            ? "Order cancelled — stock put back"
            : "Return saved — stock put back and profit updated",
      );
      setReturnOpen(false);
      setReturnCost("");
      invalidate();
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["parcel_returns"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const outcomeButtons = (
    <>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => outcome.mutate("delivered")}
          disabled={outcome.isPending || order.status === "delivered"}
        >
          <CheckCircle2 className="size-4 text-success" />
          Delivered
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReturnOpen(true)}
          disabled={outcome.isPending}
        >
          <Undo2 className="size-4" />
          Returned
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => outcome.mutate("cancelled")}
          disabled={outcome.isPending || order.status === "cancelled"}
        >
          <XCircle className="size-4 text-destructive" />
          Cancel
        </Button>
      </div>
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parcel returned</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The items go back in stock and this order moves to the returns list. Add the courier
            charge you paid for the return, if any.
          </p>
          <div className="space-y-2">
            <Label htmlFor="return-cost">Return courier cost (৳)</Label>
            <Input
              id="return-cost"
              inputMode="decimal"
              placeholder="0"
              value={returnCost}
              onChange={(e) => setReturnCost(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => outcome.mutate("returned")} disabled={outcome.isPending}>
              {outcome.isPending ? "Saving…" : "Save return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );



  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg">
          <Truck className="size-4 text-primary" /> {COURIER_LABEL} delivery
        </h2>
        <Link
          to="/settings/courier"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Settings
        </Link>
      </div>

      {!sent ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Not sent yet. One tap creates this parcel in your merchant account.
          </p>
          <Button
            className="mt-3 w-full"
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
          >
            <Send className="size-4" />
            {sendMutation.isPending ? "Sending…" : `Send to ${COURIER_LABEL}`}
          </Button>
          {order.courier_last_error && (
            <p className="mt-2 text-xs text-destructive">{order.courier_last_error}</p>
          )}
          {outcomeButtons}
        </>

      ) : (
        <>
          <span
            className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs ${courierStatusTone(order.courier_status)}`}
          >
            {courierStatusLabel(order.courier_status)}
          </span>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Line label="Consignment" value={order.consignment_id ?? "—"} />
            <Line label="Tracking code" value={order.tracking_code ?? "—"} />
            <Line
              label="Cash on delivery"
              value={order.cod_amount == null ? "—" : `৳${order.cod_amount}`}
            />
            <Line
              label="Last checked"
              value={
                order.courier_status_updated_at
                  ? new Date(order.courier_status_updated_at).toLocaleString("en-GB")
                  : "—"
              }
            />
          </dl>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={`size-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            Refresh status
          </Button>
          {outcomeButtons}



          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">History</p>
            <ol className="mt-2 space-y-2 text-sm">
              {(timeline.data ?? []).map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-3">
                  <span className="block">{courierStatusLabel(e.status)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("en-GB")}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                </li>
              ))}
              {timeline.data?.length === 0 && (
                <li className="text-muted-foreground">No updates yet.</li>
              )}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-muted-foreground">
      <span>{label}</span>
      <span className="num truncate text-foreground">{value}</span>
    </div>
  );
}
