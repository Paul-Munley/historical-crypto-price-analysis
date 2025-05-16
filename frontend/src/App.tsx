import React, { useState, useContext } from "react";
import {
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
import MarketPicker from "./components/MarketPicker";

import PageContext from './PageContext';

const App: React.FC = () => {
	const { state } = useContext(PageContext);

	const [dateRanges, setDateRanges] = useState<DateRangeEntry[]>([
		{ id: 1, range: [dayjs("2025-05-01"), dayjs("2025-05-15")] },
	]);
	const [rollingDays, setRollingDays] = useState<number>(8);
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
			};

			const response = await axios.post(
				"http://localhost:5001/analyze",
				payload
			);
			console.log(response);
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
								<SubmitButton loading={loading} />
							</Box>
						</form>
					</Paper>
				</Grid2>
				{/* Restuls Table When Connected to Actual Backend */}
				<Grid2 size={9}>{results && <ResultsTable results={results} />}</Grid2>
			</Grid2>
		</div>
	);
};

export default App;
