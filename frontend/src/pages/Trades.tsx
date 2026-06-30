import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	Button,
	Card,
	Grid2,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";

import TradeTicketModal from "../components/TradeTicketModal";
import { TradeRecord } from "../types";
import {
	computePotentialPnl,
	deleteTrade,
	formatCurrency,
	formatPctFromProb,
	loadTrades,
	loadTradesFromServer,
} from "../utils/tradeBlotter";

const StatCard = ({ label, value }: { label: string; value: string }) => (
	<Card sx={{ p: 2 }}>
		<Typography variant="body2" color="text.secondary">
			{label}
		</Typography>
		<Typography variant="h6">{value}</Typography>
	</Card>
);

const Trades: React.FC = () => {
	const [trades, setTrades] = useState<TradeRecord[]>([]);
	const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);

	useEffect(() => {
		setTrades(loadTrades());
		void (async () => {
			setTrades(await loadTradesFromServer());
		})();
	}, []);

	const summary = useMemo(() => {
		const openTrades = trades.filter(trade => trade.status === "open").length;
		const closedTrades = trades.filter(trade => trade.status !== "open").length;
		const totalStake = trades.reduce((sum, trade) => sum + trade.amountUsd, 0);
		const realizedPnl = trades.reduce(
			(sum, trade) => sum + (computePotentialPnl(trade.amountUsd, trade.entryPrice, trade.status) || 0),
			0
		);

		return {
			count: trades.length,
			openTrades,
			closedTrades,
			totalStake,
			realizedPnl,
		};
	}, [trades]);

	const refreshTrades = () => setTrades(loadTrades());

	return (
		<Box p={3}>
			<Stack spacing={2}>
				<Box>
					<Typography variant="h5">Trades</Typography>
					<Typography variant="body2" color="text.secondary">
						Manual blotter for trades logged directly from your analysis tables.
					</Typography>
				</Box>

				<Grid2 container spacing={2}>
					<Grid2 size={{ xs: 12, md: 3 }}>
						<StatCard label="Trades logged" value={String(summary.count)} />
					</Grid2>
					<Grid2 size={{ xs: 12, md: 3 }}>
						<StatCard label="Open trades" value={String(summary.openTrades)} />
					</Grid2>
					<Grid2 size={{ xs: 12, md: 3 }}>
						<StatCard label="Total stake" value={formatCurrency(summary.totalStake)} />
					</Grid2>
					<Grid2 size={{ xs: 12, md: 3 }}>
						<StatCard label="Realized P&L" value={formatCurrency(summary.realizedPnl)} />
					</Grid2>
				</Grid2>

				<Card sx={{ p: 1 }}>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Logged</TableCell>
									<TableCell>Event</TableCell>
									<TableCell>Contract</TableCell>
									<TableCell>Side</TableCell>
									<TableCell>Entry</TableCell>
									<TableCell>Amount</TableCell>
									<TableCell>Status</TableCell>
									<TableCell>Snapshot EV</TableCell>
									<TableCell>Potential/Realized P&L</TableCell>
									<TableCell>Actions</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{trades.map(trade => {
									const sideEv = trade.selectedSide === "Yes" ? trade.observedYesEvPct : trade.observedNoEvPct;
									const pnl = computePotentialPnl(trade.amountUsd, trade.entryPrice, trade.status);
									return (
										<TableRow key={trade.id}>
											<TableCell>{new Date(trade.createdAt).toLocaleString()}</TableCell>
											<TableCell>{trade.eventTitle}</TableCell>
											<TableCell>{trade.contractLabel}</TableCell>
											<TableCell>{trade.selectedSide}</TableCell>
											<TableCell>{formatPctFromProb(trade.entryPrice)}</TableCell>
											<TableCell>{formatCurrency(trade.amountUsd)}</TableCell>
											<TableCell sx={{ textTransform: "capitalize" }}>{trade.status}</TableCell>
											<TableCell>{typeof sideEv === "number" ? `${sideEv.toFixed(2)}%` : "-"}</TableCell>
											<TableCell>{formatCurrency(pnl)}</TableCell>
											<TableCell>
												<Stack direction="row" spacing={1}>
													<Button size="small" onClick={() => setEditingTrade(trade)}>
														Edit
													</Button>
													<Button
														size="small"
														color="error"
														onClick={() => setTrades(deleteTrade(trade.id))}
													>
														Delete
													</Button>
												</Stack>
											</TableCell>
										</TableRow>
									);
								})}
								{trades.length === 0 && (
									<TableRow>
										<TableCell colSpan={10}>
											<Typography variant="body2" color="text.secondary">
												No trades logged yet. Use the Log Trade button from an analysis table row.
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Card>
			</Stack>

			<TradeTicketModal
				open={Boolean(editingTrade)}
				onClose={() => setEditingTrade(null)}
				tradeToEdit={editingTrade}
				onSaved={() => {
					setEditingTrade(null);
					refreshTrades();
				}}
			/>
		</Box>
	);
};

export default Trades;