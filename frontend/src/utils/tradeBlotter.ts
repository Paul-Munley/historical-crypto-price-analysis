import { TradeRecord, TradeSide, TradeStatus } from "../types";
import { loadPersistedAppState, savePersistedAppStatePatch } from "./appState";

export const TRADE_BLOTTER_STORAGE_KEY = "polycobra_trade_blotter";

export const loadTrades = (): TradeRecord[] => {
	try {
		const raw = localStorage.getItem(TRADE_BLOTTER_STORAGE_KEY);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export const saveTrades = (trades: TradeRecord[]) => {
	localStorage.setItem(TRADE_BLOTTER_STORAGE_KEY, JSON.stringify(trades));
	void savePersistedAppStatePatch({ trades });
};

export const hydrateTrades = (trades: TradeRecord[]) => {
	localStorage.setItem(TRADE_BLOTTER_STORAGE_KEY, JSON.stringify(trades));
	return trades;
};

export const loadTradesFromServer = async (): Promise<TradeRecord[]> => {
	const state = await loadPersistedAppState();
	if (Array.isArray(state.trades) && state.trades.length > 0) {
		return hydrateTrades(state.trades);
	}
	const localTrades = loadTrades();
	if (localTrades.length > 0) {
		await savePersistedAppStatePatch({ trades: localTrades });
	}
	return localTrades;
};

export const upsertTrade = (trade: TradeRecord) => {
	const trades = loadTrades();
	const existingIndex = trades.findIndex(existing => existing.id === trade.id);
	if (existingIndex >= 0) {
		trades[existingIndex] = trade;
	} else {
		trades.unshift(trade);
	}
	saveTrades(trades);
	return trades;
};

export const deleteTrade = (tradeId: string) => {
	const nextTrades = loadTrades().filter(trade => trade.id !== tradeId);
	saveTrades(nextTrades);
	return nextTrades;
};

export const makeTradeId = () =>
	`trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const defaultEntryPriceForSide = (
	side: TradeSide,
	yesOdds?: number,
	noOdds?: number,
) => {
	const fallback = side === "Yes" ? yesOdds : noOdds;
	return typeof fallback === "number" ? fallback : 0.5;
};

export const computePotentialPnl = (
	amountUsd: number,
	entryPrice: number,
	status: TradeStatus,
) => {
	if (entryPrice <= 0 || entryPrice >= 1 || amountUsd <= 0) {
		return null;
	}
	if (status === "open" || status === "cancelled") {
		return null;
	}
	if (status === "lost") {
		return -amountUsd;
	}
	return amountUsd * (1 / entryPrice - 1);
};

export const formatPctFromProb = (value?: number) =>
	typeof value === "number" ? `${(value * 100).toFixed(2)}%` : "-";

export const formatCurrency = (value?: number | null) =>
	typeof value === "number" && Number.isFinite(value)
		? `$${value.toFixed(2)}`
		: "-";
