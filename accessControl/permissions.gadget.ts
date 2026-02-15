import type { GadgetPermissions } from "gadget-server";

/**
 * This metadata describes the access control configuration available in your application.
 * Grants that are not defined here are set to false by default.
 *
 * View and edit your roles and permissions in the Gadget editor at https://office-wizard.gadget.app/edit/settings/permissions
 */
export const permissions: GadgetPermissions = {
  type: "gadget/permissions/v1",
  roles: {
    "signed-in": {
      storageKey: "signed-in",
      default: {
        read: true,
        action: true,
      },
      models: {
        actionLog: {
          read: true,
        },
        appConfiguration: {
          read: true,
          actions: {
            update: true,
          },
        },
        batchOperation: {
          read: {
            filter:
              "accessControl/filters/batchOperation/signed-in-read.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        conversation: {
          read: {
            filter:
              "accessControl/filters/conversation/signed-in-read.gelly",
          },
        },
        emailQuarantine: {
          read: true,
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        signature: {
          read: true,
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        template: {
          read: true,
        },
        triageSession: {
          read: {
            filter:
              "accessControl/filters/triageSession/signed-in-read.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        user: {
          read: {
            filter: "accessControl/filters/user/signed-in-read.gelly",
          },
          actions: {
            changePassword: true,
            create: true,
            delete: true,
            resetPassword: true,
            sendResetPassword: true,
            sendVerifyEmail: true,
            signIn: true,
            signOut: {
              filter: "accessControl/filters/user/tenant.gelly",
            },
            signUp: true,
            update: {
              filter: "accessControl/filters/user/tenant.gelly",
            },
            verifyEmail: true,
          },
        },
      },
      actions: {
        approveQuarantinedEmail: true,
        fetchEmails: true,
        generateDraft: true,
        makeUserAdmin: true,
        rebuildConversations: true,
        requestPasswordReset: true,
        runBatchOperation: true,
        runTriage: true,
        shopifyLookupDirectAPI: true,
        triageAllPending: true,
      },
    },
    unauthenticated: {
      storageKey: "unauthenticated",
      models: {
        user: {
          actions: {
            resetPassword: true,
            sendVerifyEmail: true,
            signIn: true,
            signUp: true,
            verifyEmail: true,
          },
        },
      },
      actions: {
        createFirstAdmin: true,
        resetPassword: true,
        verifyEmail: true,
      },
    },
  },
};
