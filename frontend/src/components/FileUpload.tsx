import { Input } from "@mui/material";
import React from "react";

interface FileUploadProps {
	setFile: (file: File | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ setFile }) => {
	return (
		<Input
			type="file"
			inputProps={{ accept: ".csv,.xlsx" }}
			onChange={e => {
				const target = e.target as HTMLInputElement;
				setFile(target.files?.[0] || null);
			}}
		/>
	);
};

export default FileUpload;
