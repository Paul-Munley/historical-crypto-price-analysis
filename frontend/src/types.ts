export type Coin = "BTC" | "ETH" | "SOL" | "XRP";

export type ResultRow = {
	percentChange: number;
	percentOccurred: number;
	yesOdds: number;
	yesEV: number;
	noOdds: number;
	noEV: number;
};

export type Results = {
	[key in Coin]: ResultRow[];
};

export type TradeSide = "Yes" | "No";
export type TradeStatus = "open" | "won" | "lost" | "cancelled";

export type TradeSeed = {
	eventTitle: string;
	eventSlug?: string;
	contractLabel: string;
	semanticsMode?: string;
	direction?: string;
	sourceTable: "research" | "legacy";
	yesOdds?: number;
	noOdds?: number;
	yesEvPct?: number;
	noEvPct?: number;
	notes?: string;
};

export type TradeRecord = {
	id: string;
	createdAt: string;
	updatedAt: string;
	eventTitle: string;
	eventSlug?: string;
	contractLabel: string;
	semanticsMode?: string;
	direction?: string;
	sourceTable: "research" | "legacy";
	selectedSide: TradeSide;
	entryPrice: number;
	amountUsd: number;
	status: TradeStatus;
	observedYesOdds?: number;
	observedNoOdds?: number;
	observedYesEvPct?: number;
	observedNoEvPct?: number;
	notes?: string;
};
