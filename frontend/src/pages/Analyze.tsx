// src/pages/Analyze.tsx
import React, { useState, useContext, useEffect } from "react";
import {
	Paper,
	Box,
	Grid2,
	Divider,
	FormControlLabel,
	Checkbox,
} from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";

import CoinSelector from "../components/CoinSelector";
import DateRangeSelector from "../components/DateRangeSelector";
import { DateRangeEntry } from "../components/DateRangeSelector.types";
import RollingDaysInput from "../components/RollingDaysInput";
import SubmitButton from "../components/SubmitButton";
import ResultsTable from "../components/ResultsTable";
import MarketPicker from "../components/MarketPicker";
import PageContext from "../PageContext";

const Analyze = () => {
	const { state } = useContext(PageContext);

	const DATE_RANGES_KEY = "savedDateRanges";
	const [dateRanges, setDateRanges] = useState<DateRangeEntry[]>(() => {
		const saved = localStorage.getItem(DATE_RANGES_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return parsed.map((entry: any) => ({
					id: entry.id,
					range: [dayjs(entry.range[0]), dayjs(entry.range[1])],
				}));
			} catch {
				return [{ id: 1, range: [null, null] }];
			}
		} else {
			return [{ id: 1, range: [null, null] }];
		}
	});

	useEffect(() => {
		localStorage.setItem(DATE_RANGES_KEY, JSON.stringify(dateRanges));
	}, [dateRanges]);

	const [rollingDays, setRollingDays] = useState<number>(8);
	const [useMomentumConfluence, setUseMomentumConfluence] = useState(false);
	const [momentumLookbackDays, setMomentumLookbackDays] = useState<number>(14);
	const [minPercentChange, setMinPercentChange] = useState<number>(6.56);
	const [results, setResults] = useState<any>(null);
	const [loading, setLoading] = useState<boolean>(false);

	const handleRangeChange = (
		id: number,
		range: [dayjs.Dayjs | null, dayjs.Dayjs | null]
	) => {
		setDateRanges(prev =>
			prev.map(entry => (entry.id === id ? { ...entry, range } : entry))
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

		try {
			const payload = {
				dateRanges: dateRanges.map(({ range }) => ({
					start: range[0]?.format("YYYY-MM-DD"),
					end: range[1]?.format("YYYY-MM-DD"),
				})),
				thresholdsByQuestion: state.thresholdsByQuestion,
				eventToAnalyze: state.eventToAnalyze,
				days: rollingDays,
				momentumConfluence: useMomentumConfluence
					? {
							lookbackDays: momentumLookbackDays,
							minPercentChange: minPercentChange,
					  }
					: null,
			};

			const response = await axios.post(
				"http://localhost:5001/analyze",
				payload
			);
			setResults(response.data);
		} catch (err) {
			console.error("Error analyzing data:", err);
			alert("Something went wrong. Check backend server and your inputs.");
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
			<Grid2 sx={{ width: "100%", minWidth: { lg: "532px" }, flex: 1 }}>
				<Paper elevation={3}>
					<form onSubmit={handleSubmit}>
						<Box mb={2}>
							<MarketPicker />
						</Box>
						<DateRangeSelector
							dateRanges={dateRanges}
							setDateRanges={setDateRanges}
							handleRangeChange={handleRangeChange}
							addDateRange={addDateRange}
							removeDateRange={removeDateRange}
						/>
						<Divider />
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
									<Box mt={1}>
										<label>
											Momentum Lookback Days (before threshold window)
										</label>
										<input
											type="number"
											value={momentumLookbackDays}
											onChange={e =>
												setMomentumLookbackDays(parseInt(e.target.value))
											}
										/>
									</Box>
									<Box mt={1}>
										<label>Minimum % Price Change in Lookback Period</label>
										<input
											type="number"
											value={minPercentChange}
											onChange={e =>
												setMinPercentChange(parseFloat(e.target.value))
											}
										/>
									</Box>
								</>
							)}
						</Box>
						<Box mt={2}>
							<SubmitButton loading={loading} />
						</Box>
					</form>
				</Paper>
			</Grid2>
			<Grid2 size={9}>{results && <ResultsTable results={results} />}</Grid2>
		</Grid2>
	);
};

export default Analyze;
