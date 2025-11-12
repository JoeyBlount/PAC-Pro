
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const ThemeContext = createContext();

export const useThemeMode = () => useContext(ThemeContext);

export const ThemeContextProvider = ({ children }) => {
  const [mode, setMode] = useState(() => localStorage.getItem("theme") || "light");

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      return next;
    });
  };

  useEffect(() => {
    document.body.style.backgroundColor = mode === "dark" ? "#121212" : "#ffffff";
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === "dark"
            ? {
                background: { default: "#121212", paper: "#1e1e1e" },
                text: { primary: "#ffffff", secondary: "#bbbbbb" },
              }
            : {
                background: { default: "#ffffff", paper: "#f5f5f5" },
                text: { primary: "#000000", secondary: "#555555" },
              }),
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};