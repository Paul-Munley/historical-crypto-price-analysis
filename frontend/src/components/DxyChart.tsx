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
import { Box, Paper, Typography } from "@mui/material";

interface DxyDataPoint {
	date: string;
	yoy_growth: number;
}

interface DxyChartProps {
	data: DxyDataPoint[];
	summary: string;
}

function getQuarterTicks(data: { date: string }[]): string[] {
	return data.filter((_, index) => index % 3 === 0).map(d => d.date);
}

const DxyChart = ({ data, summary }: DxyChartProps) => {
	const theme = useTheme();
	return (
		<Paper
			sx={{
				height: "100%",
				padding: "24px",
				display: "flex",
				gap: "24px",
				flexDirection: "column",
				flex: 0.8,
			}}
		>
			<h2 className="text-xl font-bold">DXY YoY Growth</h2>
			<Box sx={{ height: "100%" }}>
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
						<YAxis
							domain={["auto", "auto"]}
							tickFormatter={val => `${val.toFixed(1)}%`}
						/>
						<Tooltip formatter={(val: number) => `${val.toFixed(2)}%`} />
						<Line
							type="monotone"
							dataKey="yoy_growth"
							stroke={theme.palette.primary.main}
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</Box>
			<Typography variant="body1" color="text.primary">
				{summary}
			</Typography>
		</Paper>
	);
};

export default DxyChart;
