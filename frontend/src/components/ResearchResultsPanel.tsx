import React, { useMemo } from "react";
import {
	Alert,
	Box,
	Card,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";

type ResearchRow = {
	threshold?: number | string;
	change?: number;
	occurred?: number;
	semantics_mode?: string;
	history_mode?: string;
	yes_label?: string;
	no_label?: string;
	yesOdds?: number;
	noOdds?: number;
	fair_value_yes?: number;
	fair_value_no?: number;
	edge_yes?: number;
	edge_no?: number;
	expected_value_yes?: number;
	expected_value_no?: number;
	effective_sample_size?: number;
	source_group?: string;
};

type ResearchResponse = {
	results: ResearchRow[];
	sampleSize?: number | null;
	warnings?: string[];
	config?: Record<string, unknown>;
};

interface Props {
	response?: ResearchResponse | null;
}

const pct = (value?: number) =>
	typeof value === "number" ? `${(value * 100).toFixed(2)}%` : "-";
const numPct = (value?: number) =>
	typeof value === "number" ? `${value.toFixed(2)}%` : "-";

const toNumeric = (value?: number | string) => {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value.replace(/,/g, ""));
		return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
	}
	return Number.NEGATIVE_INFINITY;
};

const ResearchResultsPanel: React.FC<Props> = ({ response }) => {
	if (!response) {
		return null;
	}

	const sortedResults = useMemo(
		() =>
			[...(response.results || [])].sort(
				(a, b) =>
					toNumeric(b.change) - toNumeric(a.change) ||
					toNumeric(b.threshold) - toNumeric(a.threshold),
			),
		[response.results],
	);

	return (
		<Card sx={{ padding: "1rem 0" }}>
			<Box px={2} pb={1}>
				<Typography variant="h6">Experimental Research Output</Typography>
				<Typography variant="body2" color="text.secondary">
					Confidence-adjusted fair value and EV using the new research engine.
				</Typography>
				{response.sampleSize !== undefined && response.sampleSize !== null && (
					<Typography variant="body2" color="text.secondary" mt={0.5}>
						Based on {response.sampleSize} legacy historical windows.
					</Typography>
				)}
			</Box>

			{(response.warnings || []).map((warning, idx) => (
				<Box px={2} pb={1} key={`${warning}-${idx}`}>
					<Alert severity="warning">{warning}</Alert>
				</Box>
			))}

			<TableContainer sx={{ background: "transparent" }}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Contract</TableCell>
							<TableCell>% Change</TableCell>
							<TableCell>% Occurred</TableCell>
							<TableCell>Semantics</TableCell>
							<TableCell>Yes Side</TableCell>
							<TableCell>Fair Yes</TableCell>
							<TableCell>Edge Yes</TableCell>
							<TableCell>Yes EV %</TableCell>
							<TableCell>No Side</TableCell>
							<TableCell>Fair No</TableCell>
							<TableCell>Edge No</TableCell>
							<TableCell>No EV %</TableCell>
							<TableCell>Eff. Sample</TableCell>
							<TableCell>Source</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{sortedResults.map((row, idx) => (
							<TableRow key={`${row.threshold}-${idx}`}>
								<TableCell>{row.threshold ?? "-"}</TableCell>
								<TableCell>
									{typeof row.change === "number" ? row.change.toFixed(2) : "-"}
									%
								</TableCell>
								<TableCell>
									{typeof row.occurred === "number"
										? row.occurred.toFixed(2)
										: "-"}
									%
								</TableCell>
								<TableCell>
									{row.semantics_mode || row.history_mode || "-"}
								</TableCell>
								<TableCell>
									{row.yes_label || "Yes"} @ {pct(row.yesOdds)}
								</TableCell>
								<TableCell>{pct(row.fair_value_yes)}</TableCell>
								<TableCell
									sx={{ color: (row.edge_yes || 0) > 0 ? "limegreen" : "red" }}
								>
									{pct(row.edge_yes)}
								</TableCell>
								<TableCell
									sx={{
										color:
											(row.expected_value_yes || 0) > 0 ? "limegreen" : "red",
									}}
								>
									{numPct(row.expected_value_yes)}
								</TableCell>
								<TableCell>
									{row.no_label || "No"} @ {pct(row.noOdds)}
								</TableCell>
								<TableCell>{pct(row.fair_value_no)}</TableCell>
								<TableCell
									sx={{ color: (row.edge_no || 0) > 0 ? "limegreen" : "red" }}
								>
									{pct(row.edge_no)}
								</TableCell>
								<TableCell
									sx={{
										color:
											(row.expected_value_no || 0) > 0 ? "limegreen" : "red",
									}}
								>
									{numPct(row.expected_value_no)}
								</TableCell>
								<TableCell>{row.effective_sample_size ?? "-"}</TableCell>
								<TableCell>{row.source_group || "-"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Card>
	);
};

export default ResearchResultsPanel;
