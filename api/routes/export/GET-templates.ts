import { RouteHandler } from "gadget-server";

const EXPORT_FIELDS = [
  "name",
  "category",
  "subject",
  "bodyText",
  "availableVariables",
  "requiredVariables",
  "safetyLevel",
  "active",
  "description",
  "autoSendEnabled",
] as const;

function escapeCsvField(value: unknown): string {
  if (value == null || value === undefined) return "";
  const str = Array.isArray(value) || (typeof value === "object" && value !== null)
    ? JSON.stringify(value)
    : String(value);
  // Escape quotes by doubling them, wrap in quotes if contains comma, newline, or quote
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(templates: Record<string, unknown>[]): string {
  const header = EXPORT_FIELDS.join(",");
  const rows = templates.map((t) =>
    EXPORT_FIELDS.map((f) => escapeCsvField(t[f])).join(",")
  );
  return [header, ...rows].join("\n");
}

const route: RouteHandler = async ({ request, reply, api, logger }) => {
  try {
    const format = (request.query?.format as string)?.toLowerCase() || "json";
    if (format !== "json" && format !== "csv") {
      await reply.code(400).send({
        error: "Invalid format",
        message: "format must be 'json' or 'csv'",
      });
      return;
    }

    const templates = await api.template.findMany({
      first: 1000,
      select: {
        name: true,
        category: true,
        subject: true,
        bodyText: true,
        availableVariables: true,
        requiredVariables: true,
        safetyLevel: true,
        active: true,
        description: true,
        autoSendEnabled: true,
      },
    });

    if (format === "json") {
      reply.header("Content-Type", "application/json");
      reply.header("Content-Disposition", 'attachment; filename="templates-export.json"');
      await reply.send(templates);
    } else {
      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", 'attachment; filename="templates-export.csv"');
      await reply.send(toCsv(templates as Record<string, unknown>[]));
    }
  } catch (error) {
    logger.error({ error }, "Failed to export templates");

    await reply.code(500).send({
      error: "Failed to export templates",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};

export default route;
