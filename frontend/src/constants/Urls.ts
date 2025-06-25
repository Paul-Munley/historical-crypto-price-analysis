export default ({
    EVENTS: (slug: string) => `http://localhost:5001/events?slug=${slug}`
})