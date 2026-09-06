import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadProductImage } from "@/lib/storage";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}

/** Photo gallery box: pick one or many files, upload them and preview each one. */
export function MultiImageUploadField({
  value,
  onChange,
  label = "Product photos",
  max = 6,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = Math.max(0, max - value.length);
    if (room === 0) {
      toast.error(`You can add up to ${max} photos.`);
      return;
    }
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, room)) {
        added.push(await uploadProductImage(file));
      }
      onChange([...value, ...added]);
      toast.success(added.length > 1 ? `${added.length} photos added` : "Photo added");
    } catch (err) {
      if (added.length) onChange([...value, ...added]);
      toast.error(err instanceof Error ? err.message : "Could not upload the photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {value.map((url, i) => (
          <div
            key={url + i}
            className="group relative size-20 overflow-hidden rounded-lg border border-border bg-muted/40"
          >
            <img src={url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute inset-x-0 bottom-0 bg-background/80 py-0.5 text-center text-[10px] uppercase tracking-wide">
                Main
              </span>
            )}
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(value.filter((_, x) => x !== i))}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-destructive shadow"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={busy || value.length >= max}
          onClick={() => inputRef.current?.click()}
          className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Up to {max} photos. The first one is used as the main picture.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2"
        disabled={busy || value.length >= max}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="mr-2 size-4" /> Add photos
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
