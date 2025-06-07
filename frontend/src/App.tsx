// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Analyze from "./pages/Analyze.tsx";
import Dashboard from "./pages/Dashboard.tsx";

const App: React.FC = () => {
	return (
		<Router>
			<Header />
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/analyze" element={<Analyze />} />
			</Routes>
		</Router>
	);
};

export default App;
