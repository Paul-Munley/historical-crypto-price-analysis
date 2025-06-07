import React from "react";
import { Box, Grid, Grid2 } from "@mui/material";
import M2Chart from "../components/M2Chart";
import BTCSocialScoreChart from "../components/BTCSocialScoreChart";
import DxyChart from "../components/DxyChart";
import SSRChart from "../components/SSRChart";

interface M2DataPoint {
	date: string;
	yoy_growth: number;
}

interface DxyDataPoint {
	date: string;
	yoy_growth: number;
}

interface State {
	m2Data: M2DataPoint[];
	summary: string;
	dxyData: DxyDataPoint[];
	dxySummary: string;
	ssr: number;
	ssrSummary: string;
}

class Dashboard extends React.Component<{}, State> {
	state: State = {
		m2Data: [],
		summary: "",
		dxyData: [],
		dxySummary: "",
		ssr: 0,
		ssrSummary: "",
	};

	componentDidMount() {
		fetch("http://localhost:5001/api/m2")
			.then(res => res.json())
			.then(({ data, summary }) => {
				this.setState({
					m2Data: data,
					summary: summary,
				});
			})
			.catch(error => {
				console.error("Failed to fetch M2 data:", error);
			});

		fetch("http://localhost:5001/api/dxy")
			.then(res => res.json())
			.then(({ data, summary }) => {
				this.setState({ dxyData: data, dxySummary: summary });
			})
			.catch(error => console.error("Failed to fetch DXY data:", error));

		fetch("http://localhost:5001/api/ssr")
			.then(res => res.json())
			.then(({ value, summary }) => {
				this.setState({ ssr: value, ssrSummary: summary });
			})
			.catch(error => console.error("Failed to fetch SSR:", error));
	}

	render() {
		const { m2Data, summary, dxyData, dxySummary, ssr, ssrSummary } =
			this.state;
		const lastYearDataM2 = m2Data.slice(-12);
		const lastYearDxy = dxyData.slice(-12);

		return (
			<Grid2
				container
				spacing={2.5}
				p={3}
				sx={{
					height: "calc(100vh - 177px)",
				}}
			>
				<Grid2 size={{ xs: 12, lg: 6 }}>
					<M2Chart data={lastYearDataM2} summary={summary} />
				</Grid2>
				<Grid2 size={{ xs: 12, lg: 6 }}>
					<DxyChart data={lastYearDxy} summary={dxySummary} />
				</Grid2>
				<Grid2 size={{ xs: 12, lg: 6 }}>
					<BTCSocialScoreChart />
				</Grid2>
				<Grid2 size={{ xs: 12, lg: 6 }}>
					<SSRChart value={ssr} summary={ssrSummary} />
				</Grid2>
			</Grid2>
		);
	}
}

export default Dashboard;
