import { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, record, logger, api }) => {
  // Gadget handles session cleanup automatically for signOut actions
};

export const options: ActionOptions = {
  actionType: "update",
  triggers: {
    api: true,
  },
};