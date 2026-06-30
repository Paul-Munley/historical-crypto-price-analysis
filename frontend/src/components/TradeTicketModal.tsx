import React, { useEffect, useMemo, useState } from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

import { TradeRecord, TradeSeed, TradeSide, TradeStatus } from "../types";
import {
	computePotentialPnl,
	defaultEntryPriceForSide,
	makeTradeId,
	upsertTrade,
} from "../utils/tradeBlotter";

interface Props {
	open: boolean;
	onClose: () => void;
	seed?: TradeSeed | null;
	tradeToEdit?: TradeRecord | null;
	onSaved?: (trade: TradeRecord) => void;
}

const TradeTicketModal: React.FC<Props> = ({
	open,
	onClose,
	seed,
	tradeToEdit,
	onSaved,
}) => {
	const isEdit = Boolean(tradeToEdit);
	const [selectedSide, setSelectedSide] = useState<TradeSide>("Yes");
	const [entryPrice, setEntryPrice] = useState<number>(0.5);
	const [amountUsd, setAmountUsd] = useState<number>(100);
	const [status, setStatus] = useState<TradeStatus>("open");
	const [notes, setNotes] = useState<string>("");

	useEffect(() => {
		if (!open) {
			return;
		}
		if (tradeToEdit) {
			setSelectedSide(tradeToEdit.selectedSide);
			setEntryPrice(tradeToEdit.entryPrice);
			setAmountUsd(tradeToEdit.amountUsd);
			setStatus(tradeToEdit.status);
			setNotes(tradeToEdit.notes || "");
			return;
		}
		const nextSide: TradeSide = "Yes";
		setSelectedSide(nextSide);
		setEntryPrice(defaultEntryPriceForSide(nextSide, seed?.yesOdds, seed?.noOdds));
		setAmountUsd(100);
		setStatus("open");
		setNotes(seed?.notes || "");
	}, [open, seed, tradeToEdit]);

	const currentSeed = useMemo(
		() =>
			seed || {
				eventTitle: tradeToEdit?.eventTitle || "",
				eventSlug: tradeToEdit?.eventSlug,
				contractLabel: tradeToEdit?.contractLabel || "",
				semanticsMode: tradeToEdit?.semanticsMode,
				direction: tradeToEdit?.direction,
				sourceTable: tradeToEdit?.sourceTable || "research",
				yesOdds: tradeToEdit?.observedYesOdds,
				noOdds: tradeToEdit?.observedNoOdds,
				yesEvPct: tradeToEdit?.observedYesEvPct,
				noEvPct: tradeToEdit?.observedNoEvPct,
			},
		[seed, tradeToEdit]
	);

	const handleSideChange = (nextSide: TradeSide) => {
		setSelectedSide(nextSide);
		if (!isEdit) {
			setEntryPrice(
				defaultEntryPriceForSide(nextSide, currentSeed.yesOdds, currentSeed.noOdds)
			);
		}
	};

	const handleSave = () => {
		const now = new Date().toISOString();
		const trade: TradeRecord = {
			id: tradeToEdit?.id || makeTradeId(),
			createdAt: tradeToEdit?.createdAt || now,
			updatedAt: now,
			eventTitle: currentSeed.eventTitle,
			eventSlug: currentSeed.eventSlug,
			contractLabel: currentSeed.contractLabel,
			semanticsMode: currentSeed.semanticsMode,
			direction: currentSeed.direction,
			sourceTable: currentSeed.sourceTable,
			selectedSide,
			entryPrice,
			amountUsd,
			status,
			observedYesOdds: currentSeed.yesOdds,
			observedNoOdds: currentSeed.noOdds,
			observedYesEvPct: currentSeed.yesEvPct,
			observedNoEvPct: currentSeed.noEvPct,
			notes: notes.trim() || undefined,
		};

		upsertTrade(trade);
		onSaved?.(trade);
		onClose();
	};

	const selectedEv = selectedSide === "Yes" ? currentSeed.yesEvPct : currentSeed.noEvPct;
	const potentialPnl = computePotentialPnl(amountUsd, entryPrice, status);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{isEdit ? "Edit Trade" : "Log Trade"}</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ pt: 1 }}>
					<Typography variant="body2" color="text.secondary">
						{currentSeed.eventTitle}
					</Typography>
					<Typography variant="subtitle1">{currentSeed.contractLabel}</Typography>
					<TextField
						select
						label="Side"
						value={selectedSide}
						onChange={e => handleSideChange(e.target.value as TradeSide)}
					>
						<MenuItem value="Yes">Yes</MenuItem>
						<MenuItem value="No">No</MenuItem>
					</TextField>
					<TextField
						label="Entry price"
						type="number"
						value={entryPrice}
						onChange={e => setEntryPrice(Number(e.target.value))}
						inputProps={{ min: 0, max: 1, step: 0.001 }}
					/>
					<TextField
						label="Amount (USD spent)"
						type="number"
						value={amountUsd}
						onChange={e => setAmountUsd(Number(e.target.value))}
						inputProps={{ min: 0, step: 1 }}
					/>
					<TextField
						select
						label="Status"
						value={status}
						onChange={e => setStatus(e.target.value as TradeStatus)}
					>
						<MenuItem value="open">Open</MenuItem>
						<MenuItem value="won">Won</MenuItem>
						<MenuItem value="lost">Lost</MenuItem>
						<MenuItem value="cancelled">Cancelled</MenuItem>
					</TextField>
					<TextField
						label="Notes"
						multiline
						minRows={3}
						value={notes}
						onChange={e => setNotes(e.target.value)}
					/>
					<Typography variant="body2" color="text.secondary">
						Observed market odds: Yes {typeof currentSeed.yesOdds === "number" ? `${(currentSeed.yesOdds * 100).toFixed(2)}%` : "-"} / No {typeof currentSeed.noOdds === "number" ? `${(currentSeed.noOdds * 100).toFixed(2)}%` : "-"}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Snapshot EV for chosen side: {typeof selectedEv === "number" ? `${selectedEv.toFixed(2)}%` : "-"}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Potential P&L at current status: {potentialPnl === null ? "-" : `$${potentialPnl.toFixed(2)}`}
					</Typography>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button onClick={handleSave} variant="contained" disabled={entryPrice <= 0 || entryPrice >= 1 || amountUsd <= 0}>
					{isEdit ? "Save changes" : "Confirm trade"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default TradeTicketModal;