// src/components/PolymarketBetTypeSelector.tsx
import React from "react";
import {
	Typography,
	Box,
	Select,
	MenuItem,
	SelectChangeEvent,
} from "@mui/material";
import LabeledInputWrapper from "./LabeledInputWrapper";
import { POLYMARKET_BET_TYPES } from "../constraints/betTypes";

interface Props {
	selectedType: string;
	setSelectedType: (value: string) => void;
}

const PolymarketBetTypeSelector: React.FC<Props> = ({
	selectedType,
	setSelectedType,
}) => {
	const handleChange = (e: SelectChangeEvent<string>) => {
		setSelectedType(e.target.value);
	};

	return (
		<Box mt={2} mb={6}>
			<Typography variant="h6" mb={2}>
				Select Bet Type
			</Typography>
			<Select
				value={selectedType}
				onChange={handleChange}
				fullWidth
				displayEmpty
				sx={{ backgroundColor: "transparent" }}
			>
				{POLYMARKET_BET_TYPES.map(option => (
					<MenuItem key={option.value} value={option.value}>
						{option.label}
					</MenuItem>
				))}
			</Select>
		</Box>
	);
};

export default PolymarketBetTypeSelector;
