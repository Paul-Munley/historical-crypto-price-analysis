import { Paper, Typography, Box, Chip } from "@mui/material";

interface SSRChartProps {
	value: number;
	summary: string;
}

const getSSRStatus = (value: number) => {
	if (value < 7) return { label: "Low", color: "#00E05A" }; // Red
	if (value > 10) return { label: "High", color: "#FF4C4C" }; // Green
	return { label: "Neutral", color: "#3b82f6" }; // Blue
};

const SSRChart = ({ value, summary }: SSRChartProps) => {
	const status = getSSRStatus(value);

	return (
		<Paper
			sx={{
				minHeight: "150px",
				height: "100%",
				padding: "24px",
				display: "flex",
				flexDirection: "column",
				justifyContent: "start",
				flex: 0.5,
			}}
		>
			{/* Top Title Row */}
			<Box
				display="flex"
				alignItems="center"
				justifyContent="space-between"
				sx={{
					"@media (max-width: 1697px)": {
						flexDirection: "column",
						gap: "10px",
						alignItems: "start",
					},
				}}
			>
				<Box display="flex" alignItems="center" gap={2}>
					<Typography variant="h6" fontWeight="bold">
						Stablecoin Supply Ratio (SSR)
					</Typography>
					<Chip
						label={status.label}
						sx={{
							color: status.color,
							borderColor: status.color,
							borderWidth: 1,
							borderStyle: "solid",
							fontWeight: "medium",
							height: 30,
							minWidth: 54,
							fontSize: "1rem",
							background: "transparent",
						}}
						variant="outlined"
						size="small"
					/>
				</Box>

				{/* Key Legend */}
				<Box display="flex" gap={2}>
					<Box display="flex" alignItems="center" gap={0.5}>
						<Box width={10} height={10} borderRadius="50%" bgcolor="#00E05A" />
						<Typography variant="body1">Low: &lt; 7</Typography>
					</Box>
					<Box display="flex" alignItems="center" gap={0.5}>
						<Box width={10} height={10} borderRadius="50%" bgcolor="#3b82f6" />
						<Typography variant="body1">Neutral: 8–10</Typography>
					</Box>
					<Box display="flex" alignItems="center" gap={0.5}>
						<Box width={10} height={10} borderRadius="50%" bgcolor="#FF4C4C" />
						<Typography variant="body1">High: 10–12+</Typography>
					</Box>
				</Box>
			</Box>

			{/* SSR Value */}
			<Typography
				variant="h4"
				fontWeight="bold"
				sx={{ color: status.color, mt: 1 }}
			>
				{value}
			</Typography>

			{/* Description */}
			<Typography variant="body1" mt={1}>
				{summary}
			</Typography>
		</Paper>
	);
};

export default SSRChart;
