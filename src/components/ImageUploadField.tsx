import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadProductImage } from "@/lib/storage";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

/** Add photo box: pick a file from the device, upload it and preview it. */
export function ImageUploadField({ value, onChange, label = "Add photo" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
      toast.success("Photo added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
          {value ? (
            <img src={value} alt="Product" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ImagePlus className="mr-2 size-4" />}
            {value ? "Change photo" : "Add photo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange(null)}>
              <X className="mr-1 size-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
