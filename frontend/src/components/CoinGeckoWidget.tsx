import { useEffect } from "react";

const CoinGeckoWidget: React.FC = () => {
	useEffect(() => {
		const existingScript = document.getElementById("coingecko-widget-script");
		if (!existingScript) {
			const script = document.createElement("script");
			script.src =
				"https://widgets.coingecko.com/gecko-coin-price-marquee-widget.js";
			script.id = "coingecko-widget-script";
			script.async = true;
			document.body.appendChild(script);
		}
	}, []);

	return (
		<gecko-coin-price-marquee-widget
			locale="en"
			dark-mode="true"
			transparent-background="true"
			outlined="true"
			coin-ids="bitcoin,ethereum,ripple,solana,stellar,hedera-hashgraph,velo,xdce-crowd-sale,chainlink"
			initial-currency="usd"
		></gecko-coin-price-marquee-widget>
	);
};

export default CoinGeckoWidget;
