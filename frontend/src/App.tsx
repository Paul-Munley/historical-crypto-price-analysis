import React, { useState, useEffect } from "react";
import {
	Container,
	Typography,
	Paper,
	Box,
	Grid2,
	Divider,
	Select,
	MenuItem,
	InputLabel
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
import MarketPicker from "./components/MarketPicker";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";

const slugsInitialValue = {
	BTC: [],
	ETH: [],
	SOL: [],
	XRP: []
}

const ABBREVIATIONS = {
	BTC: 'bitcoin',
	ETH: 'ethereum',
	SOL: 'solana',
	XRP: 'ripple'
}

const SlugSelector = ({ crypto, value, allSlugs, handleChange }: any) => {
	return (
		<>
			<InputLabel id={`${crypto}-selector-label`}>
				{crypto}
			</InputLabel>
			<Select value={value} labelId={`${crypto}-selector-label`} onChange={(event) => handleChange(event.target.value)}>
				{allSlugs[crypto].map((slugElem: string) => (
					<MenuItem value={slugElem}>{slugElem}</MenuItem>
				))}
			</Select>
		</>
	)
}

const App: React.FC = () => {
	const [loadingSlugs, setLoadingSlugs] = useState<boolean>(true);
	const [slugs, setSlugs] = useState(slugsInitialValue);
	const [selectedBtc, setSelectedBtc] = useState('');
	const [selectedEth, setSelectedEth] = useState('');
	const [selectedSol, setSelectedSol] = useState('');
	const [selectedXrp, setSelectedXrp] = useState('');
	useEffect(() => {
		const fetchSlugs = async () => {
			setLoadingSlugs(true);

			const newSlugsValue: any = {};
			const slugKeys = Object.keys(slugsInitialValue);
			for (let i = 0; i < slugKeys.length; i += 1) {
				const slugKey = slugKeys[i];
				const response = await axios.get(`http://localhost:5001/event-slugs?tag_slug=${ABBREVIATIONS[slugKey]}`)
				newSlugsValue[slugKey] = response.data;	
			}
			
			setSlugs(newSlugsValue);
			setLoadingSlugs(false);
		}

		fetchSlugs();
	}, [])

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
				<Grid2 sx={{ width: '100%', minWidth: { lg: "532px" } }}>
					<Paper elevation={3}>
						<form onSubmit={handleSubmit}>
							<CoinSelector selectedCoins={cryptos} onToggle={toggleCoin} />
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
							{/* Would use only if we dont automated the compairsion between prices changes of the current prices and polymarket offerings */}
							{/* <CryptoThresholdInput
								selectedCoins={cryptos}
								thresholds={thresholds}
								setThresholds={setThresholds}
							/> */}
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
