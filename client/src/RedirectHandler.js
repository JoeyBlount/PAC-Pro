import React, { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";

const RedirectHandler = () => {
  const { instance } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    instance.handleRedirectPromise().then((response) => {
      if (response) {
        localStorage.setItem("user", "true"); // Store user session
        navigate("/navi/dashboard"); // Navigate to dashboard
      }
    });
  }, [instance, navigate]);

  return <div>Loading...</div>;
};

export default RedirectHandler;