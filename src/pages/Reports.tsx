import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  Award,
  Percent,
  Users as UsersIcon,
  Target,
  Clock,
  BarChart3,
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

  const sourcePerformance = useMemo(() => {
    const map = new Map<LeadSource, { 
      total: number; 
      won: number; 
      lost: number;
      totalValue: number; 
      wonValue: number;
    }>();
    
    for (const l of leads) {
      const cur = map.get(l.source) || { total: 0, won: 0, lost: 0, totalValue: 0, wonValue: 0 };
      cur.total += 1;
      cur.totalValue += l.value;
      if (l.stage === "gewonnen") {
        cur.won += 1;
        cur.wonValue += l.value;
      } else if (l.stage === "verloren") {
        cur.lost += 1;
      }
      map.set(l.source, cur);
    }

    return Array.from(map.entries())
      .map(([source, v]) => {
        const decided = v.won + v.lost;
        const conversion = decided > 0 ? (v.won / decided) * 100 : 0;
        return {
          source,
          label: SOURCE_LABELS[source] ?? source,
          ...v,
          conversion,
        };
      })
      .sort((a, b) => b.wonValue - a.wonValue);
  }, [leads]);

  const ratings = useMemo(() => {
    const order: LeadRating[] = ["hot", "warm", "cold"];
    return order.map((rating) => ({
      rating,
      ...RATING_META[rating],
      count: leads.filter((l) => l.rating === rating).length,
    }));
  }, [leads]);

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

  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number; wonValue: number; conversionRate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTH_LABELS[d.getMonth()],
        count: 0,
        wonValue: 0,
        conversionRate: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const l of leads) {
      if (!l.createdAt) continue;
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(key);
      if (i !== undefined) {
        buckets[i].count += 1;
        if (l.stage === "gewonnen") {
          buckets[i].wonValue += l.value;
        }
      }
    }
    buckets.forEach(b => {
      const monthLeads = leads.filter(l => {
        if (!l.createdAt) return false;
        const d = new Date(l.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}` === b.key;
      });
      const decided = monthLeads.filter(l => l.stage === "gewonnen" || l.stage === "verloren").length;
      const won = monthLeads.filter(l => l.stage === "gewonnen").length;
      b.conversionRate = decided > 0 ? (won / decided) * 100 : 0;
    });
    return buckets;
  }, [leads]);

  const leadVelocity = useMemo(() => {
    const velocityMap = new Map<LeadStage, { totalDays: number; count: number }>();
    FUNNEL_STAGES.forEach(stage => {
      velocityMap.set(stage, { totalDays: 0, count: 0 });
    });

    for (const l of leads) {
      if (!l.createdAt) continue;
      const created = new Date(l.createdAt);
      const now = new Date();
      const daysInStage = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      const current = velocityMap.get(l.stage);
      if (current && l.stage !== "gewonnen" && l.stage !== "verloren") {
        current.totalDays += daysInStage;
        current.count += 1;
      }
    }

    return FUNNEL_STAGES.map(stage => {
      const v = velocityMap.get(stage);
      const avgDays = v && v.count > 0 ? Math.round(v.totalDays / v.count) : 0;
      return { stage, label: STAGE_LABELS[stage], avgDays };
    });
  }, [leads]);

  const stageConversion = useMemo(() => {
    const conversionRates: { stage: LeadStage; label: string; rate: number; count: number }[] = [];
    
    for (let i = 0; i < FUNNEL_STAGES.length; i++) {
      const currentStage = FUNNEL_STAGES[i];
      const nextStage = FUNNEL_STAGES[i + 1] || "gewonnen";
      
      const currentCount = leads.filter(l => l.stage === currentStage).length;
      const nextCount = leads.filter(l => l.stage === nextStage || (nextStage === "gewonnen" && l.stage === "gewonnen")).length;
      
      const rate = currentCount > 0 ? (nextCount / (currentCount + nextCount)) * 100 : 0;
      
      conversionRates.push({
        stage: currentStage,
        label: STAGE_LABELS[currentStage],
        rate,
        count: currentCount,
      });
    }
    
    return conversionRates;
  }, [leads]);

  const dealVelocity = useMemo(() => {
    const wonLeads = leads.filter(l => l.stage === "gewonnen" && l.createdAt);
    if (wonLeads.length === 0) return 0;
    
    const totalDays = wonLeads.reduce((sum, l) => {
      const created = new Date(l.createdAt!);
      const now = new Date();
      const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    return Math.round(totalDays / wonLeads.length);
  }, [leads]);

  const pipelineAging = useMemo(() => {
    const agingMap = new Map<LeadStage, { leads: Array<{ id: string; company: string; days: number }> }>();
    
    FUNNEL_STAGES.forEach(stage => {
      agingMap.set(stage, { leads: [] });
    });

    const now = new Date();
    for (const l of leads) {
      if (!l.createdAt || l.stage === "gewonnen" || l.stage === "verloren") continue;
      const created = new Date(l.createdAt);
      const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      const current = agingMap.get(l.stage);
      if (current) {
        current.leads.push({ id: l.id, company: l.company, days });
      }
    }

    return FUNNEL_STAGES.map(stage => {
      const a = agingMap.get(stage);
      const sorted = a ? [...a.leads].sort((a, b) => b.days - a.days).slice(0, 5) : [];
      return { stage, label: STAGE_LABELS[stage], leads: sorted };
    });
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
  const maxSource = Math.max(...sourcePerformance.map((s) => s.total), 1);
  const maxOwner = Math.max(...ownersPerf.map((o) => o.wonValue), 1);
  const maxMonth = Math.max(...monthly.map((m) => m.count), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
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
        <Kpi
          icon={Clock}
          label="Deal Velocity"
          value={`${dealVelocity} Tage`}
          tone="primary"
        />
        <Kpi
          icon={BarChart3}
          label="Ø Velocity/Stage"
          value={`${leadVelocity.reduce((s, v) => s + v.avgDays, 0) / leadVelocity.length || 0} Tage`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Konversionsraten pro Stage
            </h3>
            <div className="space-y-3">
              {stageConversion.map((sc) => (
                <div key={sc.stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground">{sc.label}</span>
                    <span className="text-muted-foreground">
                      {sc.rate.toFixed(1)}% · {sc.count} Leads
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                    <div
                      className="flex h-full items-center justify-end rounded-md bg-success px-2 text-[11px] font-medium text-success-foreground transition-all"
                      style={{
                        width: `${Math.max(sc.rate, sc.rate > 0 ? 8 : 0)}%`,
                      }}
                    >
                      {sc.rate > 0 && `${sc.rate.toFixed(0)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Lead Velocity (Ø Tage in Stage)
            </h3>
            <div className="space-y-3">
              {leadVelocity.map((lv) => (
                <div key={lv.stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground">{lv.label}</span>
                    <span className="text-muted-foreground">
                      {lv.avgDays} Tage
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                    <div
                      className="flex h-full items-center justify-end rounded-md bg-warning px-2 text-[11px] font-medium text-warning-foreground transition-all"
                      style={{
                        width: `${Math.min((lv.avgDays / 60) * 100, 100)}%`,
                      }}
                    >
                      {lv.avgDays > 0 && `${lv.avgDays}d`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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

        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Quellen-Performance (ROI)
            </h3>
            <div className="space-y-3">
              {sourcePerformance.map((s) => (
                <div key={s.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{s.label}</span>
                    <span className="text-muted-foreground">
                      {s.wonValue > 0 ? formatCurrency(s.wonValue) : "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary/80"
                        style={{ width: `${(s.total / maxSource) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      {s.total} Leads
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Conversion: {s.conversion.toFixed(0)}%</span>
                    <span>·</span>
                    <span>Won: {s.won}/{s.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Leads & Umsatz (6 Monate)
            </h3>
            <div className="flex h-40 items-end justify-between gap-2">
              {monthly.map((m) => (
                <div
                  key={m.key}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-xs font-medium text-foreground">
                    {m.wonValue > 0 ? formatCurrency(m.wonValue) : (m.count > 0 ? m.count : "")}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary transition-all"
                    style={{
                      height: `${Math.max((m.count / maxMonth) * 100, m.count > 0 ? 6 : 2)}%`,
                    }}
                  />
                  <div className="text-xs text-muted-foreground">
                    <span>{m.label}</span>
                    {m.conversionRate > 0 && (
                      <span className="ml-1 text-success">({m.conversionRate.toFixed(0)}%)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Pipeline Aging (älteste Leads)
            </h3>
            <div className="space-y-3">
              {pipelineAging.map((pa) => (
                <div key={pa.stage}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{pa.label}</span>
                    <span className="text-muted-foreground">{pa.leads.length} Leads</span>
                  </div>
                  {pa.leads.length > 0 ? (
                    <div className="space-y-1">
                      {pa.leads.slice(0, 3).map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground truncate">{l.company}</span>
                          <span className={cn(
                            "font-medium",
                            l.days > 30 ? "text-destructive" : l.days > 14 ? "text-warning" : "text-success"
                          )}>
                            {l.days} Tage
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Keine Leads</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
