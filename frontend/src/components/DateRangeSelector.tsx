import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
	DateRangeEntry,
	DateRangeSelectorProps,
} from "./DateRangeSelector.types";
import LabeledInputWrapper from "./LabeledInputWrapper";

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
	dateRanges,
	handleRangeChange,
	addDateRange,
	removeDateRange,
}) => {
	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<Box mb={2}>
				<Typography variant="h6" mb={2}>
					Select Date Ranges
				</Typography>

				{dateRanges.map(({ id, range }) => (
					<Box key={id} display="flex" alignItems="flex-end" gap={2} mb={2}>
						<LabeledInputWrapper label="Start Date">
							<DatePicker
								value={range[0]}
								onChange={date => handleRangeChange(id, [date, range[1]])}
								slotProps={{
									textField: { fullWidth: true },
									popper: {
										modifiers: [
											{
												name: "offset",
												options: {
													offset: [0, 8],
												},
											},
										],
										sx: {
											"& .MuiPaper-root": {
												padding: "0",
											},
										},
									},
								}}
							/>
						</LabeledInputWrapper>

						<LabeledInputWrapper label="End Date">
							<DatePicker
								value={range[1]}
								onChange={date => handleRangeChange(id, [range[0], date])}
								slotProps={{
									textField: { fullWidth: true },
									popper: {
										modifiers: [
											{
												name: "offset",
												options: {
													offset: [0, 8],
												},
											},
										],
										sx: {
											"& .MuiPaper-root": {
												padding: "0",
											},
										},
									},
								}}
							/>
						</LabeledInputWrapper>

						<IconButton
							onClick={() => removeDateRange(id)}
							color="error"
							sx={{ mb: "1rem" }}
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
