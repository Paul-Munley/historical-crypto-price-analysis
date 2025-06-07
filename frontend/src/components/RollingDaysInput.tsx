import React from "react";
import { Box, TextField, Typography } from "@mui/material";
import LabeledInputWrapper from "./LabeledInputWrapper";

interface RollingDaysInputProps {
	rollingDays: number;
	setRollingDays: (days: number) => void;
}

const RollingDaysInput: React.FC<RollingDaysInputProps> = ({
	rollingDays,
	setRollingDays,
}) => {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = parseInt(e.target.value, 10);
		setRollingDays(isNaN(val) ? 0 : val);
	};

	return (
		<Box mb={4} mt={3}>
			<Typography variant="h6" mb={2}>
				Rolling Days
			</Typography>
			<TextField
				type="number"
				value={rollingDays.toString()}
				onChange={handleChange}
				fullWidth
			/>
		</Box>
	);
};

export default RollingDaysInput;
