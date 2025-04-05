import React, { useState } from "react";
import {
	Box,
	Grid2,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	styled,
	Card,
} from "@mui/material";

import btcIcon from "../assets/icons/crypto/btc.png";
import btcDesatIcon from "../assets/icons/crypto/btc-desat.png";
import ethIcon from "../assets/icons/crypto/eth.png";
import ethDesatIcon from "../assets/icons/crypto/eth-desat.png";
import solIcon from "../assets/icons/crypto/sol.png";
import solDesatIcon from "../assets/icons/crypto/sol-desat.png";
import xrpIcon from "../assets/icons/crypto/xrp.png";
import xrpDesatIcon from "../assets/icons/crypto/xrp-desat.png";

import { Coin } from "../types";

interface ResultRow {
	change: number;
	occurred: number;
	yesOdds: number;
	yesEV: number;
	noOdds: number;
	noEV: number;
}

type ResultsData = {
	[key in Coin]: ResultRow[];
};

interface Props {
	results?: ResultsData; // Optional now to allow fallback to dummy
}

const dummyResults: ResultsData = {
	BTC: [
		{
			change: 48.07,
			occurred: 1.5,
			yesOdds: 0.003,
			yesEV: 151,
			noOdds: 0.998,
			noEV: 98.1,
		},
		{
			change: 37.5,
			occurred: 99.5,
			yesOdds: 0.004,
			yesEV: 151,
			noOdds: 0.997,
			noEV: 98.2,
		},
		{
			change: -20.67,
			occurred: 8.96,
			yesOdds: 0.027,
			yesEV: 98.6,
			noOdds: 0.974,
			noEV: -96,
		},
		{
			change: -47.12,
			occurred: 0.5,
			yesOdds: 0.999,
			yesEV: 100.1,
			noOdds: 0.999,
			noEV: -100,
		},
	],
	ETH: [],
	SOL: [],
	XRP: [],
};

const coinColors: Record<Coin, string> = {
	BTC: "#F7931A",
	ETH: "#627EEA",
	SOL: "#14F195",
	XRP: "#1E90FF",
};

const coinIconsMap: Record<Coin, { icon: string; desat: string }> = {
	BTC: { icon: btcIcon, desat: btcDesatIcon },
	ETH: { icon: ethIcon, desat: ethDesatIcon },
	SOL: { icon: solIcon, desat: solDesatIcon },
	XRP: { icon: xrpIcon, desat: xrpDesatIcon },
};

const CoinTabButton = styled(Box, {
	shouldForwardProp: prop => prop !== "active" && prop !== "coin",
})<{ active: boolean; coin: Coin }>(({ active, coin }) => ({
	display: "flex",
	alignItems: "center",
	padding: "0 0.75rem 1rem 0.75rem",
	cursor: "pointer",
	gap: 6,
	fontSize: "1.5rem",
	fontWeight: 200,
	border: "none",
	borderBottom: "2.5px solid",
	borderColor: active ? coinColors[coin] : "transparent",
	color: active ? coinColors[coin] : "#FFFFFF",
	transition: "all 0.2s ease",
	"&:hover": {
		color: coinColors[coin],
		borderColor: coinColors[coin],
	},
}));

const StyledTableRow = styled(TableRow)<{ dimmed: boolean }>(({ dimmed }) => ({
	backgroundColor: dimmed ? "#33333350" : "transparent",
	transition: "background-color 0.3s ease",
	"&:hover": {
		backgroundColor: dimmed ? "#44444460" : "#44444488",
	},
}));

const ResultsTable: React.FC<Props> = ({ results }) => {
	const allResults = results ?? dummyResults;
	const selectedCoins = Object.keys(allResults) as Coin[];
	const [activeCoin, setActiveCoin] = useState<Coin>(selectedCoins[0] ?? "BTC");

	const rows = allResults[activeCoin] || [];
	const sortedRows = [...rows].sort((a, b) => b.change - a.change);

	return (
		<Card sx={{ padding: "1rem 0" }}>
			<Box
				display="flex"
				gap={3}
				mb={1}
				sx={{ borderBottom: "1px solid #FFFFFF50" }}
			>
				{selectedCoins.map(coin => {
					const active = activeCoin === coin;
					const iconSrc = active
						? coinIconsMap[coin].icon
						: coinIconsMap[coin].desat;

					return (
						<CoinTabButton
							key={coin}
							active={active}
							coin={coin}
							onClick={() => setActiveCoin(coin)}
						>
							<img src={iconSrc} alt={coin} width={20} height={20} />
							<span>{coin}</span>
						</CoinTabButton>
					);
				})}
			</Box>

			<TableContainer sx={{ background: "transparent" }}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>% Change</TableCell>
							<TableCell>% Occurred</TableCell>
							<TableCell>Yes PM Odds</TableCell>
							<TableCell>Yes EV %</TableCell>
							<TableCell>No PM Odds</TableCell>
							<TableCell>No EV %</TableCell>
						</TableRow>
					</TableHead>
					<TableBody sx={{ padding: "0.75rem" }}>
						{sortedRows.map((row, index) => {
							const { change, occurred, yesOdds, yesEV, noOdds, noEV } = row;
							const dimmed = occurred < 1 || occurred > 99;

							return (
								<StyledTableRow key={index} dimmed={dimmed}>
									<TableCell sx={{ border: "none" }}>
										{change.toFixed(2)}%
									</TableCell>
									<TableCell sx={{ border: "none" }}>
										{occurred.toFixed(2)}%
									</TableCell>
									<TableCell sx={{ border: "none" }}>{yesOdds}</TableCell>
									<TableCell
										sx={{
											color: yesEV > 0 ? "limegreen" : "red",
											border: "none",
										}}
									>
										{yesEV.toFixed(1)}%
									</TableCell>
									<TableCell sx={{ border: "none" }}>{noOdds}</TableCell>
									<TableCell
										sx={{
											color: noEV > 0 ? "limegreen" : "red",
											border: "none",
										}}
									>
										{noEV.toFixed(1)}%
									</TableCell>
								</StyledTableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>
		</Card>
	);
};

export default ResultsTable;
