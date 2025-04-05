// src/theme/ThemeProviderWrapper.tsx
import React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

const ThemeProviderWrapper: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	);
};

export default ThemeProviderWrapper;
