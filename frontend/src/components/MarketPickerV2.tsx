import { useState, useEffect, useContext } from "react";

import { Box, Button, TextField } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { ScaleLoader } from "react-spinners";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import PageContext from "../PageContext";
import { ACTIONS as PageActions } from "../PageProvider";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";

const fetchThresholdsForEvent = async (event: any) => {
	const promises: any[] = [];
	event.markets.forEach((market: any) => {
		const url = `http://localhost:5001/extract-threshold?question=${market.question}`;
		promises.push(fetch(url));
	});
	const apiResponses = await Promise.all(promises);

	const unpackedThresholds = apiResponses.map((response: any) =>
		response.json()
	);

	const result: any = {};
	(await Promise.all(unpackedThresholds)).forEach(
		(thresholdResult: any, i: number) => {
			const market = event.markets[i];
			result[market.slug] = thresholdResult.threshold;
		}
	);

	return result;
};

const MarketPickerV2 = ({onAdd}: any) => {
	const { state, dispatch } = useContext(PageContext);

	const [fetchingEvent, setFetchingEvent] = useState();

	const handleThresholdsRequest = async (e: any, event: any) => {
		e.preventDefault();
		e.stopPropagation();

		setFetchingEvent(event.slug);
		const thresholdsByQuestion = await fetchThresholdsForEvent(event);
		dispatch({
			type: PageActions.UPDATE_THRESHOLDS,
			payload: thresholdsByQuestion,
		});
		setFetchingEvent(undefined);
	};

	const handleEventSelection = (e: any, eventSlug: string) => {
		e.preventDefault();
		e.stopPropagation();

		dispatch({ type: PageActions.SET_EVENT_TO_ANALYZE, payload: eventSlug });
	};

	const allEvents = state.allEvents;

	return (
        <Box>
            <SimpleTreeView defaultExpandedItems={allEvents.map(e => `event-${e.slug}`)}>
                {allEvents.map((event: any) => {
                    const selected = event.slug === state.eventToAnalyze;
                    const eventKey = `event-${event.slug}`;

                    const eventLabel = (
                        <Box
                            sx={{ minHeight: "35px" }}
                            display="flex"
                            justifyContent="space-between"
                        >
                            <Box>{`🗓 ${event.title}`}</Box>
                            {fetchingEvent === event.slug ? (
                                <ScaleLoader height={20} color="white" />
                            ) : (
                                <Box display="flex" gap={1}>
                                    <Button
                                        size="small"
                                        sx={{ flexShrink: 1 }}
                                        startIcon={<AutoAwesomeIcon />}
                                        onClick={e => handleThresholdsRequest(e, event)}
                                    ></Button>
                                    <Button
                                        variant={selected ? "contained" : "outlined"}
                                        size="small"
                                        sx={{ flexGrow: 1 }}
                                        onClick={e => handleEventSelection(e, event.slug)}
                                    >
                                        {selected ? "Selected" : "Not Selected"}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    );

                    return (
                        <TreeItem key={eventKey} itemId={eventKey} label={eventLabel}>
                            {event.markets.map((market: any) => {
                                const marketKey = `market-${market.slug}`;
                                const thresholdValue =
                                    state.thresholdsByQuestion[market.slug] || "";

                                const marketLabel = (
                                    <Box display="flex" justifyContent="space-between">
                                        <Box>{`📈 ${market.question}`}</Box>
                                        <input
                                            value={thresholdValue}
                                            onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onChange={e => {
                                                dispatch({
                                                    type: PageActions.UPDATE_THRESHOLDS,
                                                    payload: { [market.slug]: e.target.value },
                                                });
                                            }}
                                        />
                                    </Box>
                                );

                                return (
                                    <TreeItem
                                        key={marketKey}
                                        itemId={marketKey}
                                        label={marketLabel}
                                    />
                                );
                            })}
                        </TreeItem>
                    );
                })}
            </SimpleTreeView>
            <Button size="small" variant="outlined" onClick={onAdd}>
                Add Event
            </Button>
        </Box>
	);
};

export default MarketPickerV2;
