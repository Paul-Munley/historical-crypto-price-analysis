import { useMemo, useReducer } from 'react';

import PageContext from './PageContext';

export enum ACTIONS {
    ADD_EVENT,

    UPDATE_THRESHOLDS,
    SET_EVENT_TO_ANALYZE
}

const pageReducer = (state: any, action: any) => {
    switch (action.type) {
        case ACTIONS.ADD_EVENT:
            return {
                ...state,
                allEvents: [...state.allEvents, action.payload]
            }

        case ACTIONS.UPDATE_THRESHOLDS:
            return {
                ...state,
                thresholdsByQuestion: {
                    ...state.thresholdsByQuestion,
                    ...action.payload
                }
            }

        case ACTIONS.SET_EVENT_TO_ANALYZE:
            return {
                ...state,
                eventToAnalyze: action.payload
            }

        default:
            return state
    }
}

const initialState = {
    allEvents: [],

    thresholdsByQuestion: {},
    eventToAnalyze: ''
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
