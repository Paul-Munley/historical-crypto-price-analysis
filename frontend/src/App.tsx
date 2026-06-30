// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Analyze from "./pages/Analyze.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Trades from "./pages/Trades.tsx";

const App: React.FC = () => {
	return (
		<Router>
			<Header />
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/analyze" element={<Analyze />} />
				<Route path="/trades" element={<Trades />} />
			</Routes>
		</Router>
	);
};

export default App;
