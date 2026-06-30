export default ({
    EVENTS: (slug: string) => `http://localhost:5001/events?slug=${slug}`,
    APP_STATE: "http://localhost:5001/app-state"
})