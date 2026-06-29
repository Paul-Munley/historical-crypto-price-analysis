// src/components/ResultsTable.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	Card,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	styled,
	TextField,
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
	threshold: number | string;
	change: number; // % change (e.g., 1.23 for 1.23%)
	occurred: number; // % occurred (e.g., 68.27 for 68.27%)
	yesOdds: number; // market prob (0-1)
	yesEV: number; // %
	noOdds: number; // market prob (0-1)
	noEV: number; // %
}

type ResultsData = Record<Coin, ResultRow[]> | ResultRow[];

interface Props {
	results?: ResultsData;
}

// ——— styles ———
const CoinTabButton = styled(Box, {
	shouldForwardProp: prop => prop !== "active" && prop !== "coin",
})<{ active: boolean; coin: Coin }>(({ active }) => ({
	display: "flex",
	alignItems: "center",
	padding: "0 0.75rem 1rem 0.75rem",
	cursor: "pointer",
	gap: 6,
	fontSize: "1.5rem",
	fontWeight: 200,
	border: "none",
	borderBottom: "2.5px solid",
	borderColor: active ? "#fff" : "transparent",
	color: active ? "#fff" : "#FFFFFFA0",
	transition: "all 0.2s ease",
}));

const StyledTableRow = styled(TableRow)<{ dimmed: boolean }>(({ dimmed }) => ({
	backgroundColor: dimmed ? "#33333350" : "transparent",
	transition: "background-color 0.3s ease",
	"&:hover": {
		backgroundColor: dimmed ? "#44444460" : "#44444488",
	},
}));

// ——— helpers ———
const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(hi, v));

/**
 * Recompute EVs from occurred% and yesOdds.
 * Yes EV % = (p / y - 1) * 100
 * No  EV % = ((1 - p) / (1 - y) - 1) * 100
 */
function withRecomputedEV(row: ResultRow, nextYesOdds: number): ResultRow {
	const p = clamp(row.occurred / 100, 0.0001, 0.9999);
	const y = clamp(nextYesOdds, 0.0001, 0.9999);
	const n = clamp(1 - y, 0.0001, 0.9999);

	const yesEV = (p / y - 1) * 100;
	const noEV = ((1 - p) / n - 1) * 100;

	return {
		...row,
		yesOdds: y,
		yesEV,
		noOdds: n,
		noEV,
	};
}

const ResultsTable: React.FC<Props> = ({ results }) => {
	// Normalize incoming data shape (you were already using a flat array)
	const incomingRows: ResultRow[] = useMemo(() => {
		if (!results) return [];
		// If results is keyed by coin, take the first coin’s rows
		if (!Array.isArray(results)) {
			const first = Object.values(results)[0] ?? [];
			return first as ResultRow[];
		}
		return results as ResultRow[];
	}, [results]);

	// Local editable copy
	const [rows, setRows] = useState<ResultRow[]>([]);

	useEffect(() => {
		// Initialize with recomputed rows to ensure derived fields are consistent
		const initialized = (incomingRows ?? []).map(r =>
			withRecomputedEV(r, r.yesOdds)
		);
		setRows(initialized);
	}, [incomingRows]);

	// Sort by % change desc (your previous behavior)
	const sortedRows = useMemo(
		() => [...rows].sort((a, b) => b.change - a.change),
		[rows]
	);

	const handleYesOddsChange = (idxInSorted: number, raw: string) => {
		const val = Number(raw);
		if (Number.isNaN(val)) return;

		// Map sorted index back to original index
		const sorted = sortedRows;
		const target = sorted[idxInSorted];

		const originalIndex = rows.findIndex(
			r =>
				r.threshold === target.threshold &&
				r.change === target.change &&
				r.occurred === target.occurred
		);
		if (originalIndex === -1) return;

		const updated = withRecomputedEV(rows[originalIndex], val);
		const next = [...rows];
		next[originalIndex] = updated;
		setRows(next);
	};

	return (
		<Card sx={{ padding: "1rem 0" }}>
			<TableContainer sx={{ background: "transparent" }}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Threshold</TableCell>
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
							const dimmed = row.occurred < 1 || row.occurred > 99;

							return (
								<StyledTableRow
									key={`${row.threshold}-${index}`}
									dimmed={dimmed}
								>
									<TableCell>{row.threshold}</TableCell>

									<TableCell sx={{ border: "none" }}>
										{row.change.toFixed(2)}%
									</TableCell>

									<TableCell sx={{ border: "none" }}>
										{row.occurred.toFixed(2)}%
									</TableCell>

									{/* Editable Yes PM Odds */}
									<TableCell sx={{ border: "none", minWidth: 120 }}>
										<TextField
											value={row.yesOdds.toFixed(3)}
											onChange={e => handleYesOddsChange(index, e.target.value)}
											type="number"
											inputProps={{
												step: "0.001",
												min: "0.000",
												max: "0.999",
											}}
											size="small"
											variant="outlined"
											sx={{
												"& input": {
													textAlign: "right",
													fontVariantNumeric: "tabular-nums",
												},
												width: 110,
											}}
										/>
									</TableCell>

									<TableCell
										sx={{
											color: row.yesEV > 0 ? "limegreen" : "red",
											border: "none",
											fontVariantNumeric: "tabular-nums",
										}}
									>
										{row.yesEV.toFixed(1)}%
									</TableCell>

									<TableCell
										sx={{ border: "none", fontVariantNumeric: "tabular-nums" }}
									>
										{row.noOdds.toFixed(3)}
									</TableCell>

									<TableCell
										sx={{
											color: row.noEV > 0 ? "limegreen" : "red",
											border: "none",
											fontVariantNumeric: "tabular-nums",
										}}
									>
										{row.noEV.toFixed(1)}%
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
