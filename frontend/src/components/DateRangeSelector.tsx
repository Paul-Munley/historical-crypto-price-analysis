import React from "react";
import { Box, Typography, IconButton, TextField } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
	DateRangeEntry,
	DateRangeSelectorProps,
} from "./DateRangeSelector.types";

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
	dateRanges,
	handleRangeChange,
	addDateRange,
	removeDateRange,
}) => {
	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<Box mb={4}>
				<Typography variant="h6" mb={2}>
					Market Date Ranges
				</Typography>

				{dateRanges.map(({ id, range }) => (
					<Box key={id} display="flex" alignItems="center" mb={2}>
						<DatePicker
							label="Start Date"
							value={range[0]}
							onChange={date => handleRangeChange(id, [date, range[1]])}
							sx={{ mr: 2 }}
						/>
						<DatePicker
							label="End Date"
							value={range[1]}
							onChange={date => handleRangeChange(id, [range[0], date])}
						/>
						<IconButton
							onClick={() => removeDateRange(id)}
							color="error"
							sx={{ ml: 1 }}
						>
							<DeleteIcon />
						</IconButton>
					</Box>
				))}

				<IconButton onClick={addDateRange} color="primary">
					<AddIcon />
				</IconButton>
			</Box>
		</LocalizationProvider>
	);
};

export default DateRangeSelector;
