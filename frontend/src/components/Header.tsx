// src/components/Header.tsx
import React from "react";
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { styled } from "@mui/system";
import logo from "../assets/logo.svg"; // replace with your actual logo path

const StyledAppBar = styled(AppBar)({
	backgroundColor: "transparent",
	boxShadow: "none",
	padding: ".75rem .5rem",
	width: "100%",
	borderRadius: 0,
	border: "none",
});

const NavButton = styled(Button)<{ active?: boolean }>(({ active }) => ({
	color: active ? "#00FF00" : "#ccc",
	fontWeight: 500,
	textTransform: "none",
	fontSize: "1rem",
	"&:hover": {
		color: "#00FF00",
	},
}));

const Header: React.FC = () => {
	return (
		<>
			<Box display="flex" alignItems="center">
				<Typography
					variant="body1"
					sx={{
						color: "#ffffff",
						fontStyle: "italic",
						textAlign: "center",
						flexGrow: 1,
						display: { xs: "none", md: "block" },
						padding: ".75rem",
						backgroundColor: "#0D2F13",
					}}
				>
					The true wealth of a man consists in the things he can afford to let
					alone.
				</Typography>
			</Box>
			<StyledAppBar position="static">
				<Toolbar sx={{ justifyContent: "space-between" }}>
					{/* Left: Logo */}
					<Box display="flex" alignItems="center" gap={1.2}>
						<img src={logo} alt="PolyCobra Logo" height={36} />
					</Box>
					{/* Right: Nav Buttons */}
					<Box display="flex" gap={2}>
						<NavButton href="#">Analyze</NavButton>
						<NavButton href="#">Results</NavButton>
					</Box>
				</Toolbar>
			</StyledAppBar>
		</>
	);
};

export default Header;
