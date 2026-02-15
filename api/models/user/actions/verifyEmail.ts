import { applyParams, save, ActionOptions } from "gadget-server";

// Powers the sign up flow, this action is called from the email generated in /actions/sendVerifyEmail.ts

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  // Set emailVerified to true - the trigger has already found the correct user by hashed code
  record.emailVerified = true;
  await save(record);
  return {
    result: "ok"
  }
};


export const options: ActionOptions = {
  actionType: "custom",
  returnType: true,
  triggers: {
    verifiedEmail: true,
  },
};
