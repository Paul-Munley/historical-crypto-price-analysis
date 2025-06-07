import React, { useState, useEffect } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { Box, Button, Paper, Typography } from "@mui/material";
import axios from "axios";

interface ScoreDataPoint {
	date: string;
	score: number;
}

const RANGE_OPTIONS = [
	{ label: "7D", value: 7 },
	{ label: "30D", value: 30 },
	{ label: "90D", value: 90 },
];

function getQuarterTicks(data: { date: string }[]): string[] {
	if (!Array.isArray(data)) return [];
	return data.filter((_, index) => index % 3 === 0).map(d => d.date);
}

const BTCSocialScoreChart = () => {
	const theme = useTheme();
	const [data, setData] = useState<ScoreDataPoint[]>([]);
	const [selectedDays, setSelectedDays] = useState<number>(30);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const response = await axios.get(
					`/api/btc-social-score?days=${selectedDays}`
				);
				setData(response.data);
			} catch (err) {
				console.error("Error loading social score data", err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [selectedDays]);

	return (
		<Paper
			sx={{
				height: "100%",
				padding: "24px",
				display: "flex",
				gap: "24px",
				flexDirection: "column",
				flex: 0.4,
			}}
		>
			<Box
				display="flex"
				justifyContent="space-between"
				alignItems="start"
				sx={{ height: "100%" }}
			>
				<h2 className="text-xl font-bold">BTC Social Score (LunarCrush)</h2>
				<Box display="flex" gap={1}>
					{RANGE_OPTIONS.map(opt => (
						<Button
							key={opt.value}
							variant={selectedDays === opt.value ? "contained" : "outlined"}
							onClick={() => setSelectedDays(opt.value)}
							size="small"
						>
							{opt.label}
						</Button>
					))}
				</Box>
			</Box>

			<Box>
				{Array.isArray(data) && data.length > 0 ? (
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={data}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis
								dataKey="date"
								tickFormatter={dateStr =>
									new Date(dateStr).toLocaleDateString("en-US", {
										month: "short",
									})
								}
								ticks={getQuarterTicks(data)}
								tick={{ fontSize: 12 }}
							/>
							<YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
							<Tooltip formatter={(val: number) => val.toLocaleString()} />
							<Line
								type="monotone"
								dataKey="score"
								stroke={theme.palette.primary.main}
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<Typography variant="body2" color="text.secondary">
						{loading ? "Loading BTC social score..." : "No data available."}
					</Typography>
				)}
			</Box>

			{loading && (
				<Typography variant="body2" color="text.secondary">
					Loading BTC social score...
				</Typography>
			)}
		</Paper>
	);
};

export default BTCSocialScoreChart;
