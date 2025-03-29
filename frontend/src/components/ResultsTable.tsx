import React from "react";
import {
	Box,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
} from "@mui/material";

interface ThresholdMetrics {
	occurred_percent?: number;
	model_probability?: number;
	// yes_polymarket_odds?: number;
	// no_polymarket_odds?: number;
	// ev_yes?: number;
	// ev_no?: number;
}

interface Props {
	results: Record<string, Record<string, ThresholdMetrics>>;
}

const ResultsTable: React.FC<Props> = ({ results }) => {
	if (!results) return null;

	return (
		<>
			{Object.entries(results).map(([coin, thresholdMap]) => (
				<Box key={coin} mb={4}>
					<Typography variant="h6" gutterBottom>
						{coin}
					</Typography>
					<TableContainer component={Paper}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>% Change</TableCell>
									<TableCell>Occurred (%)</TableCell>
									{/* <TableCell>Polymarket Odds</TableCell>
									<TableCell>EV (%)</TableCell> */}
								</TableRow>
							</TableHead>
							<TableBody>
								{Object.entries(thresholdMap).map(
									([threshold, metrics], idx) => (
										<TableRow key={idx}>
											<TableCell>{threshold}%</TableCell>
											<TableCell>
												{metrics.occurred_percent !== undefined
													? `${metrics.occurred_percent.toFixed(2)}%`
													: "N/A"}
											</TableCell>
											{/* <TableCell>
												{metrics.yes_polymarket_odds !== undefined
													? `${(metrics.yes_polymarket_odds * 100).toFixed(2)}%`
													: "N/A"}
											</TableCell>
											<TableCell>
												{metrics.ev_yes !== undefined
													? `${metrics.ev_yes.toFixed(2)}%`
													: "N/A"}
											</TableCell> */}
										</TableRow>
									)
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			))}
		</>
	);
};

export default ResultsTable;
