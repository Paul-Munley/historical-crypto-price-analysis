import React from "react";
import { Box, TextField, Typography, Divider } from "@mui/material";

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
		<Box>
			<Typography variant="h6" gutterBottom>
				Thresholds by Crypto
			</Typography>
			{selectedCoins.map((coin, index) => (
				<Box key={coin} mb={2}>
					<Typography variant="subtitle1" sx={{ mb: 1 }}>
						{coin.toUpperCase()}
					</Typography>
					<TextField
						label="Thresholds (comma-separated %)"
						value={thresholds[coin] || ""}
						onChange={e => handleChange(coin, e.target.value)}
						fullWidth
					/>
					{index < selectedCoins.length - 1 && <Divider sx={{ mt: 2 }} />}
				</Box>
			))}
		</Box>
	);
};

export default CryptoThresholdInput;
