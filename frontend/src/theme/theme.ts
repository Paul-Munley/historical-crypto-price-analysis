// src/theme/theme.ts
import { createTheme } from "@mui/material/styles";
import { colors } from "./colors";
import "@fontsource/figtree";

declare module "@mui/material/styles" {
	interface Palette {
		customBackgrounds: {
			secondary: string;
		};
	}
	interface PaletteOptions {
		customBackgrounds?: {
			secondary: string;
		};
	}
}

export const createAppTheme = (mode: "light" | "dark") =>
	createTheme({
		palette: {
			mode,
			background: {
				default: mode === "dark" ? colors.colorBgDark : colors.colorBgLight,
				paper: mode === "dark" ? colors.colorPaperDark : colors.colorPaperLight,
			},
			primary: {
				main:
					mode === "dark" ? colors.colorPrimaryDark : colors.colorPrimaryLight,
			},
			text: {
				primary: mode === "dark" ? colors.colorTextDark : colors.colorTextLight,
				secondary:
					mode === "dark"
						? colors.colorTextSecondaryDark
						: colors.colorTextSecondaryLight,
			},
			success: {
				main: "#6DF46D",
			},
			error: {
				main: "#FF5C5C",
			},
			customBackgrounds: {
				secondary:
					mode === "dark"
						? colors.colorSecondaryBgDark
						: colors.colorPaperLight,
			},
		},
		typography: {
			fontFamily: `"Figtree", sans-serif`,
			h4: {
				fontWeight: 200,
			},
			h6: {
				fontWeight: 200,
			},
			body1: {
				fontSize: "1.125rem",
				fontWeight: 200,
			},
			body2: {
				fontSize: "1rem",
				fontWeight: 200,
			},
			button: {
				textTransform: "none",
				fontWeight: 200,
				fontSize: 20,
			},
		},
		components: {
			MuiPaper: {
				styleOverrides: {
					root: {
						backgroundImage: "none",
						padding: 20,
						borderRadius: "16px",
						border:
							mode === "dark" ? "1px solid #ffffff50" : "1px solid #031a3733",
					},
				},
			},
			MuiButton: {
				styleOverrides: {
					root: {
						borderRadius: "8px",
						fontWeight: 600,
					},
				},
			},
			MuiTextField: {
				styleOverrides: {
					root: {
						borderRadius: "8px",
					},
				},
			},
			MuiInputBase: {
				styleOverrides: {
					input: {
						color:
							mode === "dark" ? colors.colorTextDark : colors.colorTextLight,
					},
				},
			},
			MuiOutlinedInput: {
				styleOverrides: {
					root: {
						borderRadius: "0.875rem",
						paddingTop: "0",
						paddingBottom: "0",
						"& .MuiSvgIcon-root": {
							color:
								mode === "dark"
									? colors.colorTextSecondaryDark
									: colors.colorTextSecondaryLight,
						},
					},
				},
			},
			MuiSelect: {
				styleOverrides: {
					icon: {
						color:
							mode === "dark"
								? colors.colorPrimaryDark
								: colors.colorPrimaryLight,
					},
				},
			},
		},
	});
