import React, { useState } from "react";
import {
	Container,
	Typography,
	Paper,
	Box,
	Grid2,
	Divider,
} from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";

import Header from "./components/Header";
import CoinSelector from "./components/CoinSelector";
import DateRangeSelector from "./components/DateRangeSelector";
import { DateRangeEntry } from "./components/DateRangeSelector.types";
import RollingDaysInput from "./components/RollingDaysInput";
import SubmitButton from "./components/SubmitButton";
import ResultsTable from "./components/ResultsTable";
import CryptoThresholdInput from "./components/CryptoThresholdInput";
import PolymarketBetTypeSelector from "./components/PolymarketBetTypeSelector";
import { POLYMARKET_BET_TYPES } from "./constraints/betTypes";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";

const App: React.FC = () => {
	const [cryptos, setCryptos] = useState<Coin[]>(["BTC", "ETH", "SOL", "XRP"]);
	const [dateRanges, setDateRanges] = useState<DateRangeEntry[]>([
		{ id: 1, range: [dayjs("2023-11-01"), dayjs("2024-4-30")] },
		{ id: 2, range: [dayjs("2021-07-01"), dayjs("2021-12-31")] },
		{ id: 3, range: [dayjs("2022-03-01"), dayjs("2022-07-31")] },
		{ id: 4, range: [dayjs("2021-01-01"), dayjs("2021-06-30")] },
	]);
	const [rollingDays, setRollingDays] = useState<number>(8);
	const [thresholds, setThresholds] = useState<Record<string, string>>({});
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

	const toggleCoin = (coin: Coin) => {
		setCryptos(prev =>
			prev.includes(coin) ? prev.filter(c => c !== coin) : [...prev, coin]
		);
	};

	const [betType, setBetType] = useState<string>("multi-threshold");

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
				betType,
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
		<div>
			<Header />
			<Grid2 container spacing={2} padding={"0 1.5rem"}>
				<Grid2 size={3} sx={{ minWidth: { lg: "532px" } }}>
					<Paper elevation={3}>
						<form onSubmit={handleSubmit}>
							<CoinSelector selectedCoins={cryptos} onToggle={toggleCoin} />
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
							{/* Would use only if we dont automated the compairsion between prices changes of the current prices and polymarket offerings */}
							{/* <CryptoThresholdInput
								selectedCoins={cryptos}
								thresholds={thresholds}
								setThresholds={setThresholds}
							/> */}
							<PolymarketBetTypeSelector
								selectedType={betType}
								setSelectedType={setBetType}
							/>

							<Box mt={2}>
								<SubmitButton loading={loading} />
							</Box>
						</form>
					</Paper>
				</Grid2>
				{/* Restuls Table When Connected to Actual Backend */}
				<Grid2 size={9}>{results && <ResultsTable results={results} />}</Grid2>
				{/* Dummy Data ResultsTable */}
				{/* <Grid2 size={9}>
					<ResultsTable results={results} />
				</Grid2> */}
			</Grid2>
		</div>
	);
};

export default App;
