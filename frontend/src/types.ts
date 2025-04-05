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
