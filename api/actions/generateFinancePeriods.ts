import type { ActionOptions } from "gadget-server";

export const params = {
  startTaxYear: { type: "number" },
  years: { type: "number" },
};

const toIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfDayIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export const run: ActionRun = async ({ api, params }) => {
  const startTaxYear = Number(params?.startTaxYear || new Date().getFullYear() - 1);
  const years = Math.max(1, Math.min(5, Number(params?.years || 2)));
  const createdKeys: string[] = [];

  for (let y = 0; y < years; y++) {
    const taxStartYear = startTaxYear + y;
    const taxStart = new Date(taxStartYear, 3, 6);
    const taxEnd = new Date(taxStartYear + 1, 3, 5);
    const taxYearLabel = `${taxStartYear}-${String(taxStartYear + 1).slice(-2)}`;
    const taxYearKey = `tax_year:${taxYearLabel}`;

    const upsertPeriod = async (periodKey: string, createData: Record<string, any>, updateData: Record<string, any>) => {
      const existing = await api.financePeriod.findFirst({
        filter: { periodKey: { equals: periodKey } },
        select: { id: true },
      } as any);
      if (existing?.id) {
        await api.financePeriod.update(existing.id, updateData as any);
      } else {
        await api.financePeriod.create(createData as any);
      }
    };

    await upsertPeriod(
      taxYearKey,
      {
        type: "tax_year",
        startDate: toIso(taxStart),
        endDate: endOfDayIso(taxEnd),
        label: `Tax Year ${taxYearLabel}`,
        periodKey: taxYearKey,
      },
      {
        startDate: toIso(taxStart),
        endDate: endOfDayIso(taxEnd),
        label: `Tax Year ${taxYearLabel}`,
      }
    );
    createdKeys.push(taxYearKey);

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(taxStart.getFullYear(), taxStart.getMonth() + m, 1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      const monthKey = `month:${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

      await upsertPeriod(
        monthKey,
        {
          type: "month",
          startDate: toIso(monthStart),
          endDate: endOfDayIso(monthEnd),
          label: monthLabel,
          periodKey: monthKey,
        },
        {
          startDate: toIso(monthStart),
          endDate: endOfDayIso(monthEnd),
          label: monthLabel,
        }
      );
      createdKeys.push(monthKey);
    }

    for (let q = 0; q < 4; q++) {
      const qStart = new Date(taxStart.getFullYear(), taxStart.getMonth() + q * 3, 1);
      const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
      const qKey = `quarter:${taxStartYear}:Q${q + 1}`;
      await upsertPeriod(
        qKey,
        {
          type: "quarter",
          startDate: toIso(qStart),
          endDate: endOfDayIso(qEnd),
          label: `Q${q + 1} ${taxYearLabel}`,
          periodKey: qKey,
        },
        {
          startDate: toIso(qStart),
          endDate: endOfDayIso(qEnd),
          label: `Q${q + 1} ${taxYearLabel}`,
        }
      );
      createdKeys.push(qKey);
    }
  }

  return { ok: true, totalUpserts: createdKeys.length, periodKeys: createdKeys };
};

export const options: ActionOptions = {};
