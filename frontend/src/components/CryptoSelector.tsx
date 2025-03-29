import React from "react";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";

type Props = {
	selectedCryptos: string[];
	onChange: (newCryptos: string[]) => void;
};

const cryptoOptions = [
	{ label: "Bitcoin (BTC)", id: "bitcoin" },
	{ label: "Ethereum (ETH)", id: "ethereum" },
	{ label: "Solana (SOL)", id: "solana" },
	{ label: "XRP", id: "ripple" },
	{ label: "Cardano (ADA)", id: "cardano" },
	{ label: "Dogecoin (DOGE)", id: "dogecoin" },
	{ label: "Avalanche (AVAX)", id: "avalanche-2" },
	{ label: "Polkadot (DOT)", id: "polkadot" },
];

const CryptoSelector: React.FC<Props> = ({ selectedCryptos, onChange }) => {
	const selectedOptions = cryptoOptions.filter(option =>
		selectedCryptos.includes(option.id)
	);

	return (
		<Box mb={4}>
			<Typography variant="h6" mb={2}>
				Cryptocurrencies to Analyze
			</Typography>
			<Autocomplete
				multiple
				options={cryptoOptions}
				getOptionLabel={option => option.label}
				value={selectedOptions}
				onChange={(_, newValue) => onChange(newValue.map(opt => opt.id))}
				renderInput={params => (
					<TextField {...params} label="Select cryptos" variant="outlined" />
				)}
			/>
		</Box>
	);
};

export default CryptoSelector;
