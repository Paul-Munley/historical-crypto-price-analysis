// src/theme/ThemeProviderWrapper.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "./theme"; // ← renamed to a function-based export

const ThemeProviderWrapper: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [mode, setMode] = useState<"light" | "dark">("dark");

	useEffect(() => {
		const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

		const updateTheme = () => {
			setMode(systemPrefersDark.matches ? "dark" : "light");
		};

		updateTheme(); // run once on mount
		systemPrefersDark.addEventListener("change", updateTheme);

		return () => {
			systemPrefersDark.removeEventListener("change", updateTheme);
		};
	}, []);

	const theme = useMemo(() => createAppTheme(mode), [mode]);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	);
};

export default ThemeProviderWrapper;
