import { useState, useEffect, useContext } from 'react';

import { Box, Button, TextField } from '@mui/material'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ScaleLoader } from 'react-spinners';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import PageContext from '../PageContext';
import {ACTIONS as PageActions} from '../PageProvider';

type Coin = 'BTC' | 'ETH' | 'SOL' | 'XRP'

const fetchEventsForCoin = async (coin: Coin) => {
    const url = `http://localhost:5001/events?coin=${coin}`;
    const response = await fetch(url);
    return await response.json();
}

const fetchThresholdsForEvent = async (event: any) => {
    const promises: any[] = []
    event.markets.forEach((market: any) => {    
        const url = `http://localhost:5001/extract-threshold?question=${market.question}`;
        promises.push(fetch(url))
    })
    const apiResponses = await Promise.all(promises);

    const unpackedThresholds = apiResponses.map((response: any) => response.json());
    
    const result: any = {};
    (await Promise.all(unpackedThresholds)).forEach((thresholdResult: any, i: number) => {
        const market = event.markets[i];
        result[market.slug] = thresholdResult.threshold;
    })

    return result;
}


const MarketPicker = () => {
    const {state, dispatch} = useContext(PageContext);

    const [fetchingEvent, setFetchingEvent] = useState();

    useEffect(() => {
        ['BTC', 'ETH', 'SOL', 'XRP'].forEach((coin: any) => {
            fetchEventsForCoin(coin).then(data => {
                let actionType;
                switch (coin) {
                    case 'BTC':
                        actionType = PageActions.SET_BITCOIN_EVENTS;
                        break;
                    case 'ETH':
                        actionType = PageActions.SET_ETHEREUM_EVENTS;
                        break;
                    case 'SOL':
                        actionType = PageActions.SET_SOLANA_EVENTS;
                        break;
                    case 'XRP':
                        actionType = PageActions.SET_RIPPLE_EVENTS;
                        break;
                }
                dispatch({ type: actionType, payload: data})
            })
        })
    }, []);

    const handleThresholdsRequest = async (e: any, event: any) => {
        e.preventDefault();
        e.stopPropagation();

        setFetchingEvent(event.slug)
        const thresholdsByQuestion = await fetchThresholdsForEvent(event);
        dispatch({ type: PageActions.UPDATE_THRESHOLDS, payload: thresholdsByQuestion})
        setFetchingEvent(undefined);
    }

    const handleEventSelection = (e: any, eventSlug: string) => {
        e.preventDefault();
        e.stopPropagation();

        dispatch({ type: PageActions.SET_EVENT_TO_ANALYZE, payload: eventSlug })
    }

    const eventsListForCoin = (eventCoin: string) => { 
        let eventsToDisplay = [];
        switch (eventCoin) {
            case 'BTC':
                eventsToDisplay = state.bitcoinEvents;
                break;
            case 'ETH':
                eventsToDisplay = state.ethereumEvents;
                break;
            case 'SOL':
                eventsToDisplay = state.solanaEvents;
                break;
            case 'XRP':
                eventsToDisplay = state.rippleEvents;
                break;
        }

        return eventsToDisplay.map((event: any) => {
            const eventKey = `${eventCoin}-event-${event.slug}`;

            const selected = event.slug === state.eventToAnalyze;

            const eventLabel = (
                <Box sx={{ minHeight: '35px' }} display='flex' justifyContent='space-between'>
                    <Box>{`🗓 ${event.title}`}</Box>
                    {fetchingEvent === event.slug 
                    ? <ScaleLoader height={20} color='white'/>
                    : (
                        <Box display='flex' gap={1}>
                            <Button 
                                size='small'
                                startIcon={<AutoAwesomeIcon/>}
                                onClick={(e) => handleThresholdsRequest(e, event)}>
                                    Extract Thresholds
                            </Button>
                            <Button
                                variant={selected ? 'contained' : 'outlined'}
                                size='small'
                                onClick={(e) => handleEventSelection(e, event.slug)}>
                                    {selected ? "Selected" : "Not Selected"}
                            </Button>
                        </Box>
                    )}
                </Box>
            )

            return (
                <TreeItem key={eventKey} itemId={eventKey} label={eventLabel}>
                    {event.markets.map((market: any) => {
                        const marketKey = `${eventCoin}-market-${market.slug}`;
                        const thresholdValue = state.thresholdsByQuestion[market.slug] || '';

                        const marketLabel = (
                            <Box display='flex' justifyContent='space-between'>
                                <Box>{`📈 ${market.question}`}</Box>
                                <input
                                    value={thresholdValue}
                                    onClick={(e) => {e.preventDefault(); e.stopPropagation();}}
                                    onChange={(e) => {
                                        dispatch({ 
                                            type: PageActions.UPDATE_THRESHOLDS,
                                            payload: { [market.slug]: e.target.value }
                                        })
                                    }}
                                />
                            </Box>
                        )

                        return (
                            <TreeItem key={marketKey} itemId={marketKey} label={marketLabel} />
                        )
                    })}
                </TreeItem>
            );
        }
    )};

    return (
        <SimpleTreeView>
            <TreeItem itemId='btc-events-list' label='BTC Events'>
                {eventsListForCoin('BTC')}
            </TreeItem>
            <TreeItem itemId='eth-events-list' label='ETH Events'>
                {eventsListForCoin('ETH')}
            </TreeItem>
            <TreeItem itemId='sol-events-list' label='SOL Events'>
                {eventsListForCoin('SOL')}
            </TreeItem>
            <TreeItem itemId='xrp-events-list' label='XRP Events'>
                {eventsListForCoin('XRP')}
            </TreeItem>
        </SimpleTreeView>
    )
};

export default MarketPicker;
