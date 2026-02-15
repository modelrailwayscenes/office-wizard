// Sets up the API client for interacting with your backend.
// For your API reference, visit: https://docs.gadget.dev/api/email-wizard

import { Client } from "@gadget-client/email-wizard";

const api = new Client({ authenticationMode: { browserSession: true } });

export { api };
export default api;
