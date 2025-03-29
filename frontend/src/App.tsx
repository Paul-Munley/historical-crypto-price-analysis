import React, { useState } from "react";
import { Container, Typography, Paper, Box } from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";

import CryptoSelector from "./components/CryptoSelector";
import DateRangeSelector from "./components/DateRangeSelector";
import { DateRangeEntry } from "./components/DateRangeSelector.types";
import RollingDaysInput from "./components/RollingDaysInput";
import SubmitButton from "./components/SubmitButton";
import ResultsTable from "./components/ResultsTable";
import CryptoThresholdInput from "./components/CryptoThresholdInput";

const App: React.FC = () => {
	const [cryptos, setCryptos] = useState<string[]>([
		"BTC",
		"ETH",
		"SOL",
		"XRP",
	]);
	const [dateRanges, setDateRanges] = useState<DateRangeEntry[]>([
		{ id: 1, range: [dayjs("2023-11-01"), dayjs("2024-4-30")] },
		{ id: 2, range: [dayjs("2021-07-01"), dayjs("2021-12-31")] },
		{ id: 3, range: [dayjs("2022-03-01"), dayjs("2022-07-31")] },
		{ id: 4, range: [dayjs("2021-01-01"), dayjs("2021-06-30")] },
	]);
	const [rollingDays, setRollingDays] = useState<number>(8);
	const [thresholds, setThresholds] = useState<Record<string, string>>({
		// BTC: "133.75, 75.31, 51.93, 40.25, 28.56, 22.72, 16.87, 11.03, -12.35, -18.19, -29.88, -41.56, -53.25",
		// ETH: "303.80, 253.32, 202.85, 152.37, 127.14, 76.66, 51.42, 41.33, 31.23, -24.29, -49.53",
		// SOL: "125.43, 87.86, 57.80, 42.77, -17.34, -24.86, -39.89",
		// XRP: "44.93, 28.37, -29.60, -37.89, -58.59",
	});
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
				cryptos,
				dateRanges: dateRanges.map(({ range }) => ({
					start: range[0]?.format("YYYY-MM-DD"),
					end: range[1]?.format("YYYY-MM-DD"),
				})),
				days: rollingDays,
				thresholds,
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
		<Container maxWidth="md">
			<Typography variant="h4" gutterBottom mt={4}>
				Crypto % Change Analyzer
			</Typography>

			<Paper sx={{ p: 3, mb: 4 }} elevation={3}>
				<form onSubmit={handleSubmit}>
					<CryptoSelector selectedCryptos={cryptos} onChange={setCryptos} />
					<DateRangeSelector
						dateRanges={dateRanges}
						setDateRanges={setDateRanges}
						handleRangeChange={handleRangeChange}
						addDateRange={addDateRange}
						removeDateRange={removeDateRange}
					/>
					<RollingDaysInput
						rollingDays={rollingDays}
						setRollingDays={setRollingDays}
					/>
					<CryptoThresholdInput
						selectedCoins={cryptos}
						thresholds={thresholds}
						setThresholds={setThresholds}
					/>
					<Box mt={2}>
						<SubmitButton loading={loading} />
					</Box>
				</form>
			</Paper>

			{results && <ResultsTable results={results} />}
		</Container>
	);
};

export default App;
