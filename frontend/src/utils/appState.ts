import { TradeRecord } from "../types";
import Urls from "../constants/Urls";

export type StoredDateRange = {
	id: number;
	range: [string | null, string | null];
};

export type PersistedAppState = {
	dateRanges: StoredDateRange[];
	trades: TradeRecord[];
};

const DEFAULT_APP_STATE: PersistedAppState = {
	dateRanges: [],
	trades: [],
};

export const loadPersistedAppState = async (): Promise<PersistedAppState> => {
	try {
		const response = await fetch(Urls.APP_STATE);
		if (!response.ok) {
			return DEFAULT_APP_STATE;
		}
		const payload = await response.json();
		return {
			dateRanges: Array.isArray(payload?.dateRanges) ? payload.dateRanges : [],
			trades: Array.isArray(payload?.trades) ? payload.trades : [],
		};
	} catch {
		return DEFAULT_APP_STATE;
	}
};

export const savePersistedAppStatePatch = async (
	patch: Partial<PersistedAppState>
): Promise<PersistedAppState | null> => {
	try {
		const response = await fetch(Urls.APP_STATE, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch),
		});
		if (!response.ok) {
			return null;
		}
		const payload = await response.json();
		return {
			dateRanges: Array.isArray(payload?.dateRanges) ? payload.dateRanges : [],
			trades: Array.isArray(payload?.trades) ? payload.trades : [],
		};
	} catch {
		return null;
	}
};