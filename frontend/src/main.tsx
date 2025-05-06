import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import ThemeProviderWrapper from "./theme/ThemeProviderWrapper.tsx";
import PageProvider from "./PageProvider";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProviderWrapper>
			<PageProvider>
				<App />
			</PageProvider>
		</ThemeProviderWrapper>
	</StrictMode>
);
