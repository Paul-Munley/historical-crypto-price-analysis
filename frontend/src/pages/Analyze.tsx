// src/pages/Analyze.tsx
import React, { useState, useContext, useEffect } from "react";
import {
	Paper,
	Box,
	Grid2,
	Divider,
	FormControlLabel,
	Checkbox,
	IconButton,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import dayjs from "dayjs";
import axios from "axios";

import CoinSelector from "../components/CoinSelector";
import DateRangeSelector from "../components/DateRangeSelector";
import { DateRangeEntry } from "../components/DateRangeSelector.types";
import RollingDaysInput from "../components/RollingDaysInput";
import SubmitButton from "../components/SubmitButton";
import ResultsTable from "../components/ResultsTable";
import ResearchResultsPanel from "../components/ResearchResultsPanel";
import MarketPicker from "../components/MarketPickerV2";
import PageContext from "../PageContext";
import { ACTIONS as PageActions } from "../PageProvider";
import EventSlugSelectorModal from "../components/EventSlugSelectorModal";
import TradeTicketModal from "../components/TradeTicketModal";
import { TradeSeed } from "../types";
import {
	loadPersistedAppState,
	savePersistedAppStatePatch,
	StoredDateRange,
} from "../utils/appState";

const fetchThresholdsForEvent = async (event: any) => {
	const thresholds: Record<string, number> = {};
	const markets = event?.markets ?? [];

	await Promise.all(
		markets.map(async (market: any) => {
			const existingThreshold = thresholds[market.slug];
			if (existingThreshold !== undefined && existingThreshold !== null) {
				return;
			}

			const response = await fetch(
				`http://localhost:5001/extract-threshold?question=${encodeURIComponent(market.question)}`,
			);
			const payload = await response.json();
			thresholds[market.slug] = payload.threshold;
		}),
	);

	return thresholds;
};

const Analyze = () => {
	const { state, dispatch } = useContext(PageContext);

	const DATE_RANGES_KEY = "savedDateRanges";
	const deserializeDateRanges = (
		storedRanges: StoredDateRange[],
	): DateRangeEntry[] => {
		if (!Array.isArray(storedRanges) || storedRanges.length === 0) {
			return [
				{
					id: 1,
					range: [null, null] as [dayjs.Dayjs | null, dayjs.Dayjs | null],
				},
			];
		}
		return storedRanges.map(entry => ({
			id: entry.id,
			range: [
				entry.range?.[0] ? dayjs(entry.range[0]) : null,
				entry.range?.[1] ? dayjs(entry.range[1]) : null,
			] as [dayjs.Dayjs | null, dayjs.Dayjs | null],
		}));
	};
	const serializeDateRanges = (ranges: DateRangeEntry[]): StoredDateRange[] =>
		ranges.map(({ id, range }) => ({
			id,
			range: [
				range[0]?.format("YYYY-MM-DD") ?? null,
				range[1]?.format("YYYY-MM-DD") ?? null,
			],
		}));
	const hasMeaningfulStoredRanges = (ranges: StoredDateRange[]) =>
		ranges.some(entry => entry.range?.[0] || entry.range?.[1]);

	const [dateRanges, setDateRanges] = useState<DateRangeEntry[]>(() => {
		const saved = localStorage.getItem(DATE_RANGES_KEY);
		if (saved) {
			try {
				return deserializeDateRanges(JSON.parse(saved));
			} catch {
				return [{ id: 1, range: [null, null] }];
			}
		} else {
			return [{ id: 1, range: [null, null] }];
		}
	});
	const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	useEffect(() => {
		let isMounted = true;
		void (async () => {
			const persisted = await loadPersistedAppState();
			if (!isMounted) return;
			if (persisted.dateRanges.length > 0) {
				setDateRanges(deserializeDateRanges(persisted.dateRanges));
			} else {
				const localSerialized = serializeDateRanges(dateRanges);
				if (hasMeaningfulStoredRanges(localSerialized)) {
					void savePersistedAppStatePatch({ dateRanges: localSerialized });
				}
			}
			setHasLoadedPersistedState(true);
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		localStorage.setItem(
			DATE_RANGES_KEY,
			JSON.stringify(serializeDateRanges(dateRanges)),
		);
		if (!hasLoadedPersistedState) {
			return;
		}
		void savePersistedAppStatePatch({
			dateRanges: serializeDateRanges(dateRanges),
		});
	}, [dateRanges, hasLoadedPersistedState]);

	const [rollingDays, setRollingDays] = useState<number>(8);
	const [useMomentumConfluence, setUseMomentumConfluence] = useState(false);
	const [momentumLookbackCandles, setMomentumLookbackCandles] =
		useState<number>(14);
	const [minPercentChange, setMinPercentChange] = useState<number>(6.56);
	const [maxPercentChange, setMaxPercentChange] = useState<number>(15);
	const [secondLookbackCandles, setSecondLookbackCandles] = useState<number>(1);
	const [secondMinPercentChange, setSecondMinPercentChange] =
		useState<number>(2.5);
	const [secondMaxPercentChange, setSecondMaxPercentChange] =
		useState<number>(10);
	const [results, setResults] = useState<any>(null);
	const [researchResponse, setResearchResponse] = useState<any>(null);
	const [sampleSize, setSampleSize] = useState<number | null>(null);
	const [compareWithResearch, setCompareWithResearch] =
		useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);
	const [eventSlugSelectorOpen, setEventSlugSelectorOpen] = useState(true);
	const [tradeSeed, setTradeSeed] = useState<TradeSeed | null>(null);
	const [tradeModalOpen, setTradeModalOpen] = useState<boolean>(false);
	const [rollingUnit, setRollingUnit] = useState<"days" | "hours" | "minutes">(
		"days",
	);

	const handleLogTrade = (seed: TradeSeed) => {
		setTradeSeed(seed);
		setTradeModalOpen(true);
	};

	const handleRangeChange = (
		id: number,
		range: [dayjs.Dayjs | null, dayjs.Dayjs | null],
	) => {
		setDateRanges(prev =>
			prev.map(entry => (entry.id === id ? { ...entry, range } : entry)),
		);
	};

	const addDateRange = () => {
		const newId =
			dateRanges.length > 0 ? Math.max(...dateRanges.map(d => d.id)) + 1 : 1;
		setDateRanges([...dateRanges, { id: newId, range: [null, null] }]);
	};

	const removeDateRange = (id: number) => {
		setDateRanges(prev => prev.filter(entry => entry.id !== id));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setResults(null);
		setResearchResponse(null);

		const use_hit_logic = state.eventToAnalyze?.slug
			?.toLowerCase()
			.includes("hit");

		try {
			let ensuredThresholds = state.thresholdsByQuestion;
			const selectedEventMarkets = state.eventToAnalyze?.markets ?? [];
			const missingThresholds = selectedEventMarkets.filter(
				(market: any) =>
					ensuredThresholds?.[market.slug] === undefined ||
					ensuredThresholds?.[market.slug] === null ||
					ensuredThresholds?.[market.slug] === "",
			);

			if (state.eventToAnalyze?.slug && missingThresholds.length > 0) {
				const fetchedThresholds = await fetchThresholdsForEvent(
					state.eventToAnalyze,
				);
				ensuredThresholds = {
					...ensuredThresholds,
					...fetchedThresholds,
				};
			}

			const payload = {
				dateRanges: dateRanges.map(({ range }) => ({
					start: range[0]?.format("YYYY-MM-DD"),
					end: range[1]?.format("YYYY-MM-DD"),
				})),
				thresholdsByQuestion: ensuredThresholds,
				eventToAnalyze: state.eventToAnalyze,
				days: rollingDays,
				rollingUnit: rollingUnit,
				autoRollingSteps: true,
				momentumConfluence: useMomentumConfluence
					? {
							filters: [
								{
									lookbackDays: momentumLookbackCandles,
									minPercentChange: minPercentChange,
									maxPercentChange: maxPercentChange,
								},
								{
									lookbackDays: secondLookbackCandles,
									minPercentChange: secondMinPercentChange,
									maxPercentChange: secondMaxPercentChange,
								},
							],
						}
					: null,
				use_hit_logic, // ✅ NEW LINE HERE
				confidenceQuantile: 0.2,
				slippage: 0.02,
			};

			if (ensuredThresholds !== state.thresholdsByQuestion) {
				dispatch({
					type: PageActions.UPDATE_THRESHOLDS,
					payload: ensuredThresholds,
				});
			}

			const requestConfigs = [
				{
					key: "research",
					request: axios.post(
						"http://localhost:5001/research/analyze",
						payload,
					),
				},
			];
			if (compareWithResearch) {
				requestConfigs.push({
					key: "legacy",
					request: axios.post("http://localhost:5001/analyze", payload),
				});
			}

			const settledResponses = await Promise.allSettled(
				requestConfigs.map(item => item.request),
			);

			const failures: string[] = [];
			settledResponses.forEach((result, index) => {
				const requestKey = requestConfigs[index].key;
				if (result.status === "fulfilled") {
					if (requestKey === "legacy") {
						setResults(result.value.data.results);
						setSampleSize(result.value.data.sampleSize ?? null);
					}
					if (requestKey === "research") {
						setResearchResponse(result.value.data);
					}
					return;
				}

				const axiosError = result.reason;
				const serverMessage = axiosError?.response?.data?.error;
				failures.push(
					`${requestKey} analyze failed${serverMessage ? `: ${serverMessage}` : "."}`,
				);
				console.error(`Error in ${requestKey} analyze request:`, axiosError);
			});

			if (failures.length === requestConfigs.length) {
				alert(failures.join("\n"));
			} else if (failures.length > 0) {
				alert(`Partial success:\n${failures.join("\n")}`);
			}

			if (settledResponses.some(result => result.status === "fulfilled")) {
				setIsSidebarCollapsed(true);
			}
		} catch (err) {
			console.error("Error analyzing data:", err);
			alert("Unexpected frontend error while analyzing data.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Grid2
			container
			spacing={2}
			padding={"30px 1.5rem"}
			sx={{ flexWrap: "nowrap" }}
		>
			<Grid2
				sx={{
					width: isSidebarCollapsed ? "72px" : "100%",
					minWidth: isSidebarCollapsed ? "72px" : { lg: "528px" },
					maxWidth: isSidebarCollapsed ? "72px" : "528px",
					flex: isSidebarCollapsed ? "0 0 72px" : 1,
					transition: "all 0.2s ease",
				}}
			>
				<EventSlugSelectorModal
					open={eventSlugSelectorOpen}
					onClose={() => setEventSlugSelectorOpen(false)}
				/>
				<Paper elevation={3}>
					<Box
						display="flex"
						justifyContent={isSidebarCollapsed ? "center" : "flex-end"}
						px={1}
						pt={1}
					>
						<IconButton
							onClick={() => setIsSidebarCollapsed(prev => !prev)}
							size="small"
						>
							{isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
						</IconButton>
					</Box>
					{!isSidebarCollapsed && (
						<form onSubmit={handleSubmit}>
							<Box mb={2}>
								<MarketPicker onAdd={() => setEventSlugSelectorOpen(true)} />
							</Box>
							<DateRangeSelector
								dateRanges={dateRanges}
								setDateRanges={setDateRanges}
								handleRangeChange={handleRangeChange}
								addDateRange={addDateRange}
								removeDateRange={removeDateRange}
							/>
							<Divider />
							<Box mt={2}>
								<label htmlFor="rolling-unit-select">Rolling Window Unit</label>
								<select
									id="rolling-unit-select"
									value={rollingUnit}
									onChange={e =>
										setRollingUnit(
											e.target.value as "days" | "hours" | "minutes",
										)
									}
									style={{ marginLeft: "0.5rem", padding: "0.3rem" }}
								>
									<option value="days">Days</option>
									<option value="hours">Hours</option>
									<option value="minutes">Minutes</option>
								</select>
							</Box>
							<RollingDaysInput
								rollingDays={rollingDays}
								setRollingDays={setRollingDays}
							/>
							<Divider />
							<Box mt={2}>
								<FormControlLabel
									control={
										<Checkbox
											checked={useMomentumConfluence}
											onChange={e => setUseMomentumConfluence(e.target.checked)}
										/>
									}
									label="Use Pre-Threshold Momentum Confluence?"
								/>

								{useMomentumConfluence && (
									<>
										{/* Filter 1 */}
										<Box mt={1}>
											<label>Momentum Lookback Candles (first filter)</label>
											<input
												type="number"
												value={momentumLookbackCandles}
												onChange={e =>
													setMomentumLookbackCandles(parseInt(e.target.value))
												}
											/>
										</Box>
										<Box mt={1}>
											<label>Minimum % Price Change (first filter)</label>
											<input
												type="number"
												value={minPercentChange}
												onChange={e =>
													setMinPercentChange(parseFloat(e.target.value))
												}
											/>
										</Box>
										<Box mt={1}>
											<label>Maximum % Price Change (first filter)</label>
											<input
												type="number"
												value={maxPercentChange}
												onChange={e =>
													setMaxPercentChange(parseFloat(e.target.value))
												}
											/>
										</Box>

										<Divider sx={{ my: 2 }} />

										{/* Filter 2 */}
										<Box mt={1}>
											<label>Momentum Lookback Candles (second filter)</label>
											<input
												type="number"
												value={secondLookbackCandles}
												onChange={e =>
													setSecondLookbackCandles(parseInt(e.target.value))
												}
											/>
										</Box>
										<Box mt={1}>
											<label>Minimum % Price Change (second filter)</label>
											<input
												type="number"
												value={secondMinPercentChange}
												onChange={e =>
													setSecondMinPercentChange(parseFloat(e.target.value))
												}
											/>
										</Box>
										<Box mt={1}>
											<label>Maximum % Price Change (second filter)</label>
											<input
												type="number"
												value={secondMaxPercentChange}
												onChange={e =>
													setSecondMaxPercentChange(parseFloat(e.target.value))
												}
											/>
										</Box>
									</>
								)}
							</Box>
							<Box mt={2}>
								<FormControlLabel
									control={
										<Checkbox
											checked={compareWithResearch}
											onChange={e => setCompareWithResearch(e.target.checked)}
										/>
									}
									label="Include legacy comparison table"
								/>
							</Box>
							<Box mt={2}>
								<SubmitButton loading={loading} />
							</Box>
						</form>
					)}
				</Paper>
			</Grid2>
			<Grid2 size={9} sx={{ flex: 1 }}>
				{results && (
					<>
						<ResultsTable
							results={results}
							eventTitle={state.eventToAnalyze?.title || ""}
							eventSlug={state.eventToAnalyze?.slug}
							onLogTrade={handleLogTrade}
						/>
						{sampleSize !== null && (
							<Box mt={1} textAlign="right" fontSize="0.85rem" color="gray">
								Based on {sampleSize} historical samples.
							</Box>
						)}
					</>
				)}
				{researchResponse && (
					<Box mt={2}>
						<ResearchResultsPanel
							response={researchResponse}
							eventTitle={state.eventToAnalyze?.title || ""}
							eventSlug={state.eventToAnalyze?.slug}
							onLogTrade={handleLogTrade}
						/>
					</Box>
				)}
			</Grid2>
			<TradeTicketModal
				open={tradeModalOpen}
				onClose={() => {
					setTradeModalOpen(false);
					setTradeSeed(null);
				}}
				seed={tradeSeed}
			/>
		</Grid2>
	);
};

export default Analyze;
