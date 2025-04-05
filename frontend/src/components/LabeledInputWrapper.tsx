// src/components/shared/LabeledInputWrapper.tsx
import React from "react";
import { Box, Typography } from "@mui/material";

interface LabeledInputWrapperProps {
	label: string;
	children: React.ReactNode;
}

const LabeledInputWrapper: React.FC<LabeledInputWrapperProps> = ({
	label,
	children,
}) => {
	return (
		<Box mb={0.75}>
			<Typography variant="body1" mb={1} ml={1}>
				{label}
			</Typography>
			{children}
		</Box>
	);
};

export default LabeledInputWrapper;
