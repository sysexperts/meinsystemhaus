import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  Award,
  Percent,
  Users as UsersIcon,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { Lead, LeadStage, LeadSource, LeadRating } from "@/shared/types";
import { cn, formatCurrency } from "@/lib/utils";

const STAGE_LABELS: Record<LeadStage, string> = {
  neu: "Neu",
  kontaktiert: "Kontaktiert",
  angebot: "Angebot",
  verhandlung: "Verhandlung",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

// Reihenfolge des Verkaufstrichters (ohne gewonnen/verloren)
const FUNNEL_STAGES: LeadStage[] = [
  "neu",
  "kontaktiert",
  "angebot",
  "verhandlung",
];

const SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  empfehlung: "Empfehlung",
  messe: "Messe",
  kaltakquise: "Kaltakquise",
  linkedin: "LinkedIn",
  google_ads: "Google Ads",
  sonstige: "Sonstige",
};

const RATING_META: Record<LeadRating, { label: string; color: string }> = {
  hot: { label: "Hot", color: "#dc2626" },
  warm: { label: "Warm", color: "#d97706" },
  cold: { label: "Cold", color: "#2563eb" },
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

export function Reports() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await window.api.leads.list();
      setLeads(data);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const open = leads.filter(
      (l) => l.stage !== "gewonnen" && l.stage !== "verloren",
    );
    const won = leads.filter((l) => l.stage === "gewonnen");
    const lost = leads.filter((l) => l.stage === "verloren");
    const pipelineValue = open.reduce((s, l) => s + l.value, 0);
    const weightedForecast = open.reduce(
      (s, l) => s + (l.value * l.probability) / 100,
      0,
    );
    const wonValue = won.reduce((s, l) => s + l.value, 0);
    const decided = won.length + lost.length;
    const conversion = decided > 0 ? (won.length / decided) * 100 : 0;
    const avgDeal = won.length > 0 ? wonValue / won.length : 0;
    return {
      total: leads.length,
      pipelineValue,
      weightedForecast,
      wonValue,
      conversion,
      avgDeal,
      openCount: open.length,
    };
  }, [leads]);

  // Trichter: Anzahl + Wert je Phase
  const funnel = useMemo(() => {
    return FUNNEL_STAGES.map((stage) => {
      const items = leads.filter((l) => l.stage === stage);
      return {
        stage,
        label: STAGE_LABELS[stage],
        count: items.length,
        value: items.reduce((s, l) => s + l.value, 0),
      };
    });
  }, [leads]);

  // Quellen-Verteilung
  const sources = useMemo(() => {
    const map = new Map<LeadSource, { count: number; value: number }>();
    for (const l of leads) {
      const cur = map.get(l.source) || { count: 0, value: 0 };
      cur.count += 1;
      cur.value += l.value;
      map.set(l.source, cur);
    }
    return Array.from(map.entries())
      .map(([source, v]) => ({
        source,
        label: SOURCE_LABELS[source] ?? source,
        ...v,
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  // Bewertungs-Verteilung (Donut)
  const ratings = useMemo(() => {
    const order: LeadRating[] = ["hot", "warm", "cold"];
    return order.map((rating) => ({
      rating,
      ...RATING_META[rating],
      count: leads.filter((l) => l.rating === rating).length,
    }));
  }, [leads]);

  // Inhaber-Performance: gewonnener Wert je Inhaber
  const ownersPerf = useMemo(() => {
    const map = new Map<
      string,
      { wonValue: number; wonCount: number; total: number }
    >();
    for (const l of leads) {
      const key = l.owner || "—";
      const cur = map.get(key) || { wonValue: 0, wonCount: 0, total: 0 };
      cur.total += 1;
      if (l.stage === "gewonnen") {
        cur.wonValue += l.value;
        cur.wonCount += 1;
      }
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([owner, v]) => ({ owner, ...v }))
      .sort((a, b) => b.wonValue - a.wonValue);
  }, [leads]);

  // Neue Leads je Monat (letzte 6 Monate)
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTH_LABELS[d.getMonth()],
        count: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const l of leads) {
      if (!l.createdAt) continue;
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(key);
      if (i !== undefined) buckets[i].count += 1;
    }
    return buckets;
  }, [leads]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Lade Auswertungen…</p>
    );
  }

  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Leads vorhanden – das Reporting füllt sich automatisch,
        sobald Leads angelegt werden.
      </p>
    );
  }

  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);
  const maxSource = Math.max(...sources.map((s) => s.count), 1);
  const maxOwner = Math.max(...ownersPerf.map((o) => o.wonValue), 1);
  const maxMonth = Math.max(...monthly.map((m) => m.count), 1);

  return (
    <div className="space-y-5">
      {/* KPI-Kacheln */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Target} label="Leads gesamt" value={String(stats.total)} />
        <Kpi
          icon={Wallet}
          label="Offene Pipeline"
          value={formatCurrency(stats.pipelineValue)}
        />
        <Kpi
          icon={TrendingUp}
          label="Forecast"
          value={formatCurrency(stats.weightedForecast)}
          tone="primary"
        />
        <Kpi
          icon={Award}
          label="Gewonnen"
          value={formatCurrency(stats.wonValue)}
          tone="success"
        />
        <Kpi
          icon={Percent}
          label="Conversion"
          value={`${stats.conversion.toFixed(0)} %`}
        />
        <Kpi
          icon={UsersIcon}
          label="Ø Abschluss"
          value={formatCurrency(stats.avgDeal)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Verkaufstrichter */}
        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Verkaufstrichter
            </h3>
            <div className="space-y-3">
              {funnel.map((f) => (
                <div key={f.stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground">{f.label}</span>
                    <span className="text-muted-foreground">
                      {f.count} · {formatCurrency(f.value)}
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                    <div
                      className="flex h-full items-center justify-end rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground transition-all"
                      style={{
                        width: `${Math.max((f.count / maxFunnel) * 100, f.count > 0 ? 8 : 0)}%`,
                      }}
                    >
                      {f.count > 0 && f.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bewertungs-Verteilung (Donut) */}
        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Lead-Bewertung
            </h3>
            <div className="flex items-center gap-6">
              <Donut
                segments={ratings.map((r) => ({
                  value: r.count,
                  color: r.color,
                }))}
                total={leads.length}
              />
              <div className="space-y-2">
                {ratings.map((r) => (
                  <div key={r.rating} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="text-foreground">{r.label}</span>
                    <span className="text-muted-foreground">
                      {r.count} ({((r.count / leads.length) * 100).toFixed(0)} %)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quellen-Verteilung */}
        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Leads nach Quelle
            </h3>
            <div className="space-y-2.5">
              {sources.map((s) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-foreground">
                    {s.label}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary/80"
                      style={{ width: `${(s.count / maxSource) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Neue Leads je Monat */}
        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Neue Leads (6 Monate)
            </h3>
            <div className="flex h-40 items-end justify-between gap-2">
              {monthly.map((m) => (
                <div
                  key={m.key}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-xs font-medium text-foreground">
                    {m.count > 0 ? m.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary transition-all"
                    style={{
                      height: `${Math.max((m.count / maxMonth) * 100, m.count > 0 ? 6 : 2)}%`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inhaber-Performance */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <h3 className="text-sm font-semibold text-foreground">
            Vertriebs-Performance je Inhaber
          </h3>
          <div className="space-y-3">
            {ownersPerf.map((o) => (
              <div key={o.owner} className="flex items-center gap-3">
                <span className="w-16 shrink-0 truncate text-sm font-medium text-foreground">
                  {o.owner}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-success"
                    style={{ width: `${(o.wonValue / maxOwner) * 100}%` }}
                  />
                </div>
                <span className="w-40 shrink-0 text-right text-xs text-muted-foreground">
                  {formatCurrency(o.wonValue)} · {o.wonCount}/{o.total} gewonnen
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "primary" | "success";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted",
            toneClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={cn("truncate text-lg font-semibold", toneClass)}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Einfaches Donut-Diagramm via SVG (ohne externe Bibliothek).
function Donut({
  segments,
  total,
}: {
  segments: { value: number; color: string }[];
  total: number;
}) {
  const size = 120;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={stroke}
      />
      {total > 0 &&
        segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const fraction = seg.value / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return circle;
        })}
    </svg>
  );
}
