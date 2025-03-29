import { Button } from "@mui/material";
import React from "react";

interface SubmitButtonProps {
	loading: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ loading }) => {
	return (
		<Button type="submit" variant="contained" disabled={loading}>
			{loading ? "Analyzing..." : "Run Analysis"}
		</Button>
	);
};

export default SubmitButton;
