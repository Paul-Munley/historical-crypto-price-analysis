import React, { useEffect } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { styled } from "@mui/system";
import logo from "../assets/logo.svg";
import CoinGeckoWidget from "./CoinGeckoWidget";

const StyledAppBar = styled(AppBar)({
	backgroundColor: "transparent",
	boxShadow: "none",
	padding: ".75rem .5rem",
	width: "100%",
	borderRadius: 0,
	border: "none",
});

const NavButton = styled(Button)(({ theme }) => ({
	fontWeight: 500,
	textTransform: "none",
	fontSize: "1rem",
	"&:hover": {
		color: theme.palette.primary.main,
	},
}));

const Header: React.FC = () => {
	const location = useLocation();

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
						// display: { xs: "none", md: "block" },
						padding: ".75rem",
						backgroundColor: "primary.main",
						borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
					}}
				>
					The true wealth of a man consists in the things he can afford to let
					alone.
				</Typography>
			</Box>
			<StyledAppBar
				position="static"
				sx={{
					padding: 0,
					borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
				}}
			>
				<Toolbar
					sx={theme => ({
						padding: "1.25rem 0",
						justifyContent: "space-between",
						backgroundColor: theme.palette.customBackgrounds.secondary,
						px: { xs: 3 },
					})}
				>
					{/* Left: Logo */}
					<Box display="flex" alignItems="center" gap={1.2}>
						<img src={logo} alt="PolyCobra Logo" height={36} />
					</Box>
					{/* Right: Nav Buttons */}
					<Box display="flex" gap={2}>
						<Button
							component={RouterLink}
							to="/"
							sx={{
								color: location.pathname === "/" ? "primary.main" : "#ffffff",
								fontWeight: 500,
								textTransform: "none",
								fontSize: "1rem",
								"&:hover": {
									color: "primary.main",
								},
							}}
						>
							Dashboard
						</Button>

						<Button
							component={RouterLink}
							to="/analyze"
							sx={{
								color:
									location.pathname === "/analyze" ? "primary.main" : "#ffffff",
								fontWeight: 500,
								textTransform: "none",
								fontSize: "1rem",
								"&:hover": {
									color: "primary.main",
								},
							}}
						>
							Analyze
						</Button>
					</Box>
				</Toolbar>
			</StyledAppBar>
			<CoinGeckoWidget />
		</>
	);
};

export default Header;
