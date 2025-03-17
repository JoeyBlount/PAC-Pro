import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
    auth: {
      clientId: "3bcad4b5-5779-47ac-bf55-df702260d948",
      authority: "https://login.microsoftonline.com/23eaf8b9-07a4-457f-b9ed-92f1ad5639c4",
      redirectUri: "http://localhost:3000",
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  };
  

  export const loginRequest = {
    scopes: ["User.Read"],
  };