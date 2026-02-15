import { applyParams, save, ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  const existing = await api.appConfiguration.maybeFindFirst();
  if (existing) {
    throw new Error("Configuration already exists. Only one configuration record is allowed. Please update the existing record instead.");
  }

  applyParams(params, record);
  await save(record);
};

export const options: ActionOptions = {
  actionType: "create",
};
