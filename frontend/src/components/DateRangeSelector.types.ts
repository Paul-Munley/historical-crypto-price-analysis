import { Dayjs } from "dayjs";

export interface DateRangeEntry {
	id: number;
	range: [Dayjs | null, Dayjs | null];
}

export interface DateRangeSelectorProps {
	dateRanges: DateRangeEntry[];
	setDateRanges: React.Dispatch<React.SetStateAction<DateRangeEntry[]>>;
	handleRangeChange: (id: number, range: [Dayjs | null, Dayjs | null]) => void;
	addDateRange: () => void;
	removeDateRange: (id: number) => void;
}
