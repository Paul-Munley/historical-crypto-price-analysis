import React from "react";
import { Box, TextField, Typography, Divider } from "@mui/material";
import LabeledInputWrapper from "./LabeledInputWrapper";

interface CryptoThresholdInputProps {
	selectedCoins: string[];
	thresholds: Record<string, string>;
	setThresholds: (newThresholds: Record<string, string>) => void;
}

const CryptoThresholdInput: React.FC<CryptoThresholdInputProps> = ({
	selectedCoins,
	thresholds,
	setThresholds,
}) => {
	const handleChange = (coin: string, value: string) => {
		setThresholds({ ...thresholds, [coin]: value });
	};

	return (
		<Box mt={3}>
			<Typography variant="h6" mb={2}>
				{"Enter % Changes (comma seperated)"}
			</Typography>
			{selectedCoins.map((coin, index) => (
				<Box key={coin} mb={3}>
					<LabeledInputWrapper label={coin.toUpperCase()}>
						<TextField
							placeholder="Comma-separated % thresholds"
							value={thresholds[coin] || ""}
							onChange={e => handleChange(coin, e.target.value)}
							fullWidth
						/>
					</LabeledInputWrapper>
				</Box>
			))}
		</Box>
	);
};

export default CryptoThresholdInput;
