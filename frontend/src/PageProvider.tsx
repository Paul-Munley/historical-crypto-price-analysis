import { useMemo, useReducer } from 'react';

import PageContext from './PageContext';

export enum ACTIONS {
    SET_BITCOIN_EVENTS,
    SET_ETHEREUM_EVENTS,
    SET_SOLANA_EVENTS,
    SET_RIPPLE_EVENTS,

    UPDATE_THRESHOLDS
}

const pageReducer = (state: any, action: any) => {
    switch (action.type) {
        case ACTIONS.SET_BITCOIN_EVENTS:
            return {
                ...state,
                bitcoinEvents: action.payload
            }

        case ACTIONS.SET_ETHEREUM_EVENTS:
            return {
                ...state,
                ethereumEvents: action.payload
            }

        case ACTIONS.SET_SOLANA_EVENTS:
            return {
                ...state,
                solanaEvents: action.payload
            }

        case ACTIONS.SET_RIPPLE_EVENTS:
            return {
                ...state,
                rippleEvents: action.payload
            }

        case ACTIONS.UPDATE_THRESHOLDS:
            return {
                ...state,
                thresholdsByQuestion: {
                    ...state.thresholdsByQuestion,
                    ...action.payload
                }
            }

        default:
            return state
    }
}

const initialState = {
    bitcoinEvents: [],
    ethereumEvents: [],
    solanaEvents: [],
    rippleEvents: [],

    thresholdsByQuestion: {}
}

const PageProvider = ({ children }: any) => {
    const [state, dispatch] = useReducer(pageReducer, initialState);

    const contextValue = useMemo(() => ({state, dispatch}), [state, dispatch])

    return (
        <PageContext.Provider value={contextValue}>
            {children}
        </PageContext.Provider>
    )
}

export default PageProvider;
