import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
    auth: {
      clientId: "3bcad4b5-5779-47ac-bf55-df702260d948",
      authority: "https://login.microsoftonline.com/common",
      redirectUri: "https://pacpro-ef499.web.app",
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  };
  

  export const loginRequest = {
    scopes: ["User.Read"],
  };
