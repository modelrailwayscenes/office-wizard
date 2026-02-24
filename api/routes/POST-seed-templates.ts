import { RouteHandler } from "gadget-server";
import { SEED_TEMPLATES, extractVariables } from "../lib/seedTemplatesData";

/**
 * POST /seed-templates
 * Seeds templates using internal API (bypasses permissions).
 * Call from browser or API to populate the template library.
 */
const route: RouteHandler = async ({ api, reply, logger }) => {
  try {
    const existing = await api.template.findMany({
      select: { name: true },
      first: 500,
    });
    const existingNames = new Set((existing || []).map((t: { name: string }) => t.name));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    const templateApi = (api as { internal?: { template?: { create: (p: Record<string, unknown>) => Promise<unknown> } } }).internal?.template;

    if (!templateApi?.create) {
      logger.warn("api.internal.template not available, using api.template");
    }

    const createFn = templateApi?.create ?? api.template.create.bind(api.template);

    for (const t of SEED_TEMPLATES) {
      if (existingNames.has(t.name)) {
        skipped++;
        continue;
      }

      const allText = `${t.subject} ${t.body}`;
      const vars = extractVariables(allText);
      const availableVariables = vars.length > 0 ? vars : ["customerName", "orderNumber", "company_name"];

      try {
        await createFn({
          name: t.name,
          category: t.category,
          subject: t.subject,
          bodyText: t.body,
          availableVariables,
          requiredVariables: [],
          safetyLevel: t.safetyLevel,
          active: true,
          description: t.description ?? undefined,
          autoSendEnabled: false,
        });
        created++;
        existingNames.add(t.name);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn({ name: t.name, error: msg }, "Failed to create template");
        errors.push(`${t.name}: ${msg}`);
      }
    }

    logger.info({ created, skipped, total: SEED_TEMPLATES.length, errors: errors.length }, "Seed complete");

    await reply.send({
      success: true,
      created,
      skipped,
      total: SEED_TEMPLATES.length,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    logger.error({ error }, "Seed templates route failed");
    await reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default route;
