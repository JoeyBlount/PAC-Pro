import React, { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "./utils/api";

const RedirectHandler = () => {
  const { instance } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();

        if (response) {
          // Get the Microsoft access token
          const accessToken = await instance.acquireTokenSilent({
            scopes: ["User.Read"],
            account: response.account
          });

          // Send the token to backend for validation and session creation
          const backendResponse = await fetch(apiUrl('/api/auth/microsoft/validate-token'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken.accessToken}`
            },
            credentials: 'include'
          });

          if (backendResponse.ok) {
            const data = await backendResponse.json();

            if (data.allowed) {
              navigate("/navi/dashboard");
            } else {
              navigate("/not-allowed");
            }
          } else {
            console.error('Backend validation failed');
            navigate("/");
          }
        } else {
          // No redirect response, redirect to login
          navigate("/");
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
        navigate("/");
      }
    };

    handleRedirect();
  }, [instance, navigate]);

  return <div>Loading...</div>;
};

export default RedirectHandler;