// src/theme/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
	palette: {
		mode: "dark",
		background: {
			default: "#041716", // main bg
			paper: "#001211", // panel/card bg
		},
		primary: {
			main: "#6DF46D", // bright green accent
		},
		secondary: {
			main: "#1E90FF", // used for highlights or buttons if needed
		},
		text: {
			primary: "#FFFFFF",
			secondary: "#B0B0B0",
		},
		success: {
			main: "#6DF46D",
		},
		error: {
			main: "#FF5C5C",
		},
	},
	typography: {
		fontFamily: `"DM Sans", sans-serif`,
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
					border: "1px solid #ffffff50",
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
					color: "#ffffff",
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
						color: "#B2B8B8",
					},
				},
			},
		},
		MuiSelect: {
			styleOverrides: {
				icon: {
					color: "#6DF46D",
				},
			},
		},
	},
});

export default theme;
