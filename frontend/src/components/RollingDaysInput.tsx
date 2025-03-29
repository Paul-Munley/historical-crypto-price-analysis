import { TextField } from "@mui/material";
import React from "react";

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
		<TextField
			label="Rolling Days"
			type="number"
			value={rollingDays.toString()}
			onChange={handleChange}
			fullWidth
		/>
	);
};

export default RollingDaysInput;
