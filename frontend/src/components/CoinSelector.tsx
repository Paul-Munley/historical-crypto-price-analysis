// src/components/CoinSelector.tsx
import React from "react";
import { Box, Button } from "@mui/material";
import { styled } from "@mui/system";

import btcIcon from "../assets/icons/crypto/btc.png";
import ethIcon from "../assets/icons/crypto/eth.png";
import solIcon from "../assets/icons/crypto/sol.png";
import xrpIcon from "../assets/icons/crypto/xrp.png";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";

interface Props {
	selectedCoins: Coin[];
	onToggle: (coin: Coin) => void;
}

const coinMap: Record<
	Coin,
	{
		label: string;
		icon: string;
		color: string;
		border: string;
	}
> = {
	BTC: {
		label: "BTC",
		icon: btcIcon,
		color: "#F7931A",
		border: "#FFFFFF50",
	},
	ETH: {
		label: "ETH",
		icon: ethIcon,
		color: "#627EEA",
		border: "#FFFFFF50",
	},
	SOL: {
		label: "SOL",
		icon: solIcon,
		color: "#14F195",
		border: "#FFFFFF50",
	},
	XRP: {
		label: "XRP",
		icon: xrpIcon,
		color: "#1E90FF",
		border: "#FFFFFF50",
	},
};

interface CoinButtonProps {
	selected: boolean;
	border: string;
	customColor: string;
}

const CoinButton = styled(Button, {
	shouldForwardProp: prop =>
		prop !== "selected" && prop !== "customColor" && prop !== "border",
})<CoinButtonProps>(({ selected, border, customColor }) => ({
	border: `1px solid ${selected ? customColor : border}`,
	backgroundColor: selected ? `${customColor}20` : "transparent",
	color: selected ? customColor : "#fff",
	fontWeight: 200,
	borderRadius: 10,
	textTransform: "none",
	padding: "4px 12px",
	display: "flex",
	alignItems: "center",
	gap: "10px",
	minWidth: 80,
	transition: "all 0.2s ease",
	boxShadow: "none",
	outline: "none",

	"&:hover": {
		backgroundColor: `${customColor}30`,
		borderColor: customColor,
	},

	"&:focus, &:focus-visible": {
		outline: "none",
		boxShadow: "none",
	},
}));

const CoinSelector: React.FC<Props> = ({ selectedCoins, onToggle }) => {
	return (
		<Box display="flex" flexWrap="wrap" gap={2} mb={3}>
			{(Object.entries(coinMap) as [Coin, (typeof coinMap)[Coin]][]).map(
				([coin, { label, icon, color, border }]) => {
					const selected = selectedCoins.includes(coin);

					return (
						<CoinButton
							key={coin}
							selected={selected}
							customColor={color}
							border={border}
							onClick={() => onToggle(coin)}
						>
							<img src={icon} alt={`${coin} icon`} width={24} height={24} />
							{label}
						</CoinButton>
					);
				}
			)}
		</Box>
	);
};

export default CoinSelector;
