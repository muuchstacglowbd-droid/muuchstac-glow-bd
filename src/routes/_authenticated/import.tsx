import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Grid, Panel, Section, Stack, Eyebrow, Pill } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/lib/data";
import { currency } from "@/lib/shop";
import { downloadCsv } from "@/lib/csv";
import {
  IMPORT_FIELDS,
  SAMPLE_CSV,
  guessMapping,
  parseCsv,
  prepareRows,
  type ImportKind,
} from "@/lib/import-csv";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Data import — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content:
          "Bring your existing home expenses and customer list into the panel from a CSV or spreadsheet in a few clicks.",
      },
      { property: "og:title", content: "Data import — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content: "Upload a CSV of expenses or customers, check the preview, then import.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

const KINDS = [
  {
    key: "expenses" as const,
    label: "Expenses",
    icon: Wallet,
    hint: "Home and shop costs: date, amount, category, note.",
  },
  {
    key: "customers" as const,
    label: "Customers",
    icon: Users,
    hint: "Customer list: name, phone, email, address.",
  },
];

function ImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: existingCustomers = [] } = useCustomers();

  const [kind, setKind] = useState<ImportKind>("expenses");
  const [raw, setRaw] = useState("");
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ inserted: number; skipped: number } | null>(null);

  const parsed = useMemo(() => (raw.trim() ? parseCsv(raw) : null), [raw]);

  const applyText = (text: string, nextKind: ImportKind = kind) => {
    setRaw(text);
    setDone(null);
    const p = text.trim() ? parseCsv(text) : null;
    setMapping(p ? guessMapping(nextKind, p.headers) : {});
  };

  const existingPhones = useMemo(
    () => new Set(existingCustomers.map((c) => (c.phone ?? "").replace(/\D/g, "")).filter(Boolean)),
    [existingCustomers],
  );

  const prepared = useMemo(() => {
    if (!parsed) return [];
    const rows = prepareRows(kind, parsed.rows, mapping);
    if (kind !== "customers" || !skipDuplicates) return rows;
    const seen = new Set(existingPhones);
    return rows.map((r) => {
      const phone = String(r.values["phone"] ?? "").replace(/\D/g, "");
      if (!r.error && phone && seen.has(phone))
        return { ...r, error: "Already in your customer list" };
      if (phone) seen.add(phone);
      return r;
    });
  }, [parsed, kind, mapping, skipDuplicates, existingPhones]);

  const valid = prepared.filter((r) => !r.error);
  const invalid = prepared.filter((r) => r.error);
  const totalAmount = useMemo(
    () =>
      kind === "expenses" ? valid.reduce((s, r) => s + Number(r.values["amount"] ?? 0), 0) : 0,
    [valid, kind],
  );

  const missingRequired = IMPORT_FIELDS[kind].filter(
    (f) => f.required && mapping[f.key] === undefined,
  );

  async function runImport() {
    if (valid.length === 0) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user_id = auth.user?.id;
      if (!user_id) throw new Error("Please sign in again.");

      const table = kind === "expenses" ? "expenses" : "customers";
      const payload = valid.map((r) => ({ ...r.values, user_id }));
      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await (supabase as unknown as { from: (t: string) => any })
          .from(table)
          .insert(payload.slice(i, i + 200));
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: [table] });
      setDone({ inserted: valid.length, skipped: invalid.length });
      setRaw("");
      setMapping({});
      toast.success(`${valid.length} ${kind} imported`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Data import"
      subtitle="Bring your existing expense book and customer list into the panel."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const sample = parseCsv(SAMPLE_CSV[kind]);
            downloadCsv(
              `${kind}-template`,
              sample.rows.map((r) =>
                Object.fromEntries(sample.headers.map((h, i) => [h, r[i] ?? ""])),
              ),
            );
          }}
        >
          <Download className="size-4" aria-hidden="true" /> Template
        </Button>
      }
    >
      <Stack gap="section">
        <Section title="1. What are you importing?" description="Pick the kind of list first.">
          <Grid cols={2}>
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                aria-pressed={kind === k.key}
                onClick={() => {
                  setKind(k.key);
                  setDone(null);
                  if (parsed) setMapping(guessMapping(k.key, parsed.headers));
                }}
                className={cn(
                  "flex min-h-11 items-start gap-3 rounded-2xl border p-4 text-start transition-colors",
                  kind === k.key ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                )}
              >
                <k.icon className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-body font-medium">{k.label}</span>
                  <span className="block text-caption text-muted-foreground">{k.hint}</span>
                </span>
              </button>
            ))}
          </Grid>
        </Section>

        <Section
          title="2. Add your file"
          description="Upload a CSV exported from Excel or Google Sheets, or paste the rows below."
        >
          <Panel padding="lg">
            <Stack gap="block">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    applyText(await file.text());
                  }}
                />
                <Button type="button" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" aria-hidden="true" /> Choose CSV file
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyText(SAMPLE_CSV[kind])}
                >
                  Use example rows
                </Button>
              </div>

              <div>
                <Label htmlFor="csv-text">Or paste rows here</Label>
                <Textarea
                  id="csv-text"
                  value={raw}
                  onChange={(e) => applyText(e.target.value)}
                  rows={6}
                  placeholder={SAMPLE_CSV[kind]}
                  className="mt-1.5 font-mono text-caption"
                />
              </div>
            </Stack>
          </Panel>
        </Section>

        {parsed && parsed.headers.length > 0 && (
          <Section
            title="3. Match the columns"
            description="We guessed these from your headings — change any that look wrong."
          >
            <Panel padding="lg">
              <Grid cols={2}>
                {IMPORT_FIELDS[kind].map((field) => (
                  <div key={field.key}>
                    <Label htmlFor={`map-${field.key}`}>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <Select
                      value={mapping[field.key] === undefined ? "none" : String(mapping[field.key])}
                      onValueChange={(v) =>
                        setMapping((m) => {
                          const next = { ...m };
                          if (v === "none") delete next[field.key];
                          else next[field.key] = Number(v);
                          return next;
                        })
                      }
                    >
                      <SelectTrigger id={`map-${field.key}`} className="mt-1.5">
                        <SelectValue placeholder="Not used" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not used</SelectItem>
                        {parsed.headers.map((h, i) => (
                          <SelectItem key={`${h}-${i}`} value={String(i)}>
                            {h || `Column ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </Grid>

              {kind === "customers" && (
                <label className="mt-4 flex min-h-11 items-center gap-2 text-caption">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="size-4 accent-[var(--color-primary)]"
                  />
                  Skip customers whose phone number is already saved
                </label>
              )}
            </Panel>
          </Section>
        )}

        {parsed && prepared.length > 0 && (
          <Section
            title="4. Check and import"
            description="Only the good rows are imported; the rest stay untouched."
            actions={
              <Button
                onClick={runImport}
                disabled={busy || valid.length === 0 || missingRequired.length > 0}
              >
                {busy ? "Importing…" : `Import ${valid.length} rows`}
              </Button>
            }
          >
            <Stack gap="block">
              <Grid cols={3}>
                <Panel>
                  <Eyebrow>Ready</Eyebrow>
                  <p className="num mt-1 text-display font-semibold leading-none text-success">
                    {valid.length}
                  </p>
                </Panel>
                <Panel>
                  <Eyebrow>Needs attention</Eyebrow>
                  <p className="num mt-1 text-display font-semibold leading-none">
                    {invalid.length}
                  </p>
                </Panel>
                <Panel>
                  <Eyebrow>{kind === "expenses" ? "Total amount" : "Rows found"}</Eyebrow>
                  <p className="num mt-1 text-display font-semibold leading-none">
                    {kind === "expenses" ? currency(totalAmount) : prepared.length}
                  </p>
                </Panel>
              </Grid>

              {missingRequired.length > 0 && (
                <Panel className="border-destructive/40">
                  <p className="flex items-center gap-2 text-caption text-destructive">
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    Please match: {missingRequired.map((f) => f.label).join(", ")}
                  </p>
                </Panel>
              )}

              <Panel padding="lg" className="table-scroll">
                <table className="w-full text-caption" aria-label="Import preview">
                  <thead>
                    <tr className="text-start text-muted-foreground">
                      <th scope="col" className="py-2 text-start">
                        Row
                      </th>
                      {IMPORT_FIELDS[kind].map((f) => (
                        <th key={f.key} scope="col" className="py-2 text-start">
                          {f.label}
                        </th>
                      ))}
                      <th scope="col" className="py-2 text-start">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {prepared.slice(0, 25).map((r) => (
                      <tr key={r.index} className={cn(r.error && "opacity-70")}>
                        <td className="num py-2">{r.index + 1}</td>
                        {IMPORT_FIELDS[kind].map((f) => (
                          <td key={f.key} className="max-w-40 truncate py-2">
                            {String(r.values[f.key] ?? "—")}
                          </td>
                        ))}
                        <td className="py-2">
                          {r.error ? (
                            <span className="text-destructive">{r.error}</span>
                          ) : (
                            <Pill>ready</Pill>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prepared.length > 25 && (
                  <p className="mt-3 text-caption text-muted-foreground">
                    Showing first 25 of {prepared.length} rows.
                  </p>
                )}
              </Panel>
            </Stack>
          </Section>
        )}

        {!parsed && !done && (
          <EmptyState
            icon={FileSpreadsheet}
            title="Nothing loaded yet"
            description="Choose a CSV file or paste a few rows to see a preview before anything is saved."
          />
        )}

        {done && (
          <Panel padding="lg" className="border-success/40">
            <p className="flex items-center gap-2 text-body font-medium text-success">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              {done.inserted} rows imported successfully
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              {done.skipped} rows were left out because they needed attention.
            </p>
          </Panel>
        )}
      </Stack>
    </AppShell>
  );
}
