import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";

import { TradeSeed } from "../types";


type ResearchRow = {
    threshold?: number | string;
    threshold_value?: number;
    contract_direction?: string | null;
    change?: number;
    occurred?: number;
    time_to_expiry_label?: string;
    distance_to_strike_pct?: number;
    expected_move_pct?: number;
    vol_normalized_distance?: number;
    semantics_mode?: string;
    history_mode?: string;
    yes_label?: string;
    no_label?: string;
    yesOdds?: number;
    noOdds?: number;
    fair_value_yes?: number;
    fair_value_no?: number;
    edge_yes?: number;
    edge_no?: number;
    expected_value_yes?: number;
    expected_value_no?: number;
    effective_sample_size?: number;
    source_group?: string;
};

type ResearchResponse = {
    results: ResearchRow[];
    sampleSize?: number | null;
    warnings?: string[];
    config?: {
        horizon?: {
            mode?: string;
            rolling_unit?: string | null;
            requested_steps?: number;
            applied_steps?: number;
            end_date?: string | null;
            inferred_display?: string | null;
            label?: string;
            settlement_label?: string | null;
            settlement_source?: string | null;
            window_start?: string | null;
            window_end?: string | null;
            window_label?: string | null;
        };
        [key: string]: unknown;
    };
};

interface Props {
    response?: ResearchResponse | null;
    eventTitle?: string;
    eventSlug?: string;
    onLogTrade?: (seed: TradeSeed) => void;
}


const pct = (value?: number) => (typeof value === "number" ? `${(value * 100).toFixed(2)}%` : "-");
const numPct = (value?: number) => (typeof value === "number" ? `${value.toFixed(2)}%` : "-");
const signedPct = (value?: number) => (typeof value === "number" ? `${value.toFixed(2)}%` : "-");
const num = (value?: number) => (typeof value === "number" ? value.toFixed(2) : "-");


const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const ODDS_TOLERANCE = 0.00005;


const impliedEvPct = (fairProbability?: number, marketProbability?: number) => {
    if (typeof fairProbability !== "number" || typeof marketProbability !== "number") {
        return undefined;
    }
    const fair = clamp(fairProbability, 0, 1);
    const market = clamp(marketProbability, 0.0001, 0.9999);
    const payoutMultiple = (1 - market) / market;
    return (((fair * payoutMultiple) - (1 - fair)) * 100);
};


const recomputeResearchRow = (
    row: ResearchRow,
    nextYesOdds?: number,
    nextNoOdds?: number
): ResearchRow => {
    const yesOdds = typeof nextYesOdds === "number"
        ? clamp(nextYesOdds, 0.0001, 0.9999)
        : row.yesOdds;
    const noOdds = typeof nextNoOdds === "number"
        ? clamp(nextNoOdds, 0.0001, 0.9999)
        : row.noOdds;

    const fairYes = row.fair_value_yes;
    const fairNo = row.fair_value_no;

    return {
        ...row,
        yesOdds,
        noOdds,
        edge_yes:
            typeof fairYes === "number" && typeof yesOdds === "number"
                ? fairYes - yesOdds
                : row.edge_yes,
        edge_no:
            typeof fairNo === "number" && typeof noOdds === "number"
                ? fairNo - noOdds
                : row.edge_no,
        expected_value_yes: impliedEvPct(fairYes, yesOdds),
        expected_value_no: impliedEvPct(fairNo, noOdds),
    };
};


const toNumeric = (value?: number | string) => {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value.replace(/,/g, ""));
        return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
    }
    return Number.NEGATIVE_INFINITY;
};


const directionRank = (row: ResearchRow) => {
    if (row.semantics_mode === "hit_high") return 0;
    if (row.semantics_mode === "hit_low") return 1;
    return 2;
};


const thresholdSortValue = (row: ResearchRow) => {
    const value = toNumeric(row.threshold_value ?? row.threshold);
    if (row.semantics_mode === "hit_low") return value;
    return -value;
};


const oddsDiffer = (current?: number, original?: number) => {
    if (typeof current !== "number" || typeof original !== "number") {
        return false;
    }
    return Math.abs(current - original) > ODDS_TOLERANCE;
};


const ResearchResultsPanel: React.FC<Props> = ({ response, eventTitle = "", eventSlug, onLogTrade }) => {
    const responseResults = response?.results || [];
    const [rows, setRows] = useState<ResearchRow[]>([]);

    useEffect(() => {
        setRows(responseResults.map(row => recomputeResearchRow(row)));
    }, [responseResults]);

    if (!response) {
        return null;
    }

    const sortedResults = useMemo(
        () =>
            rows
                .map((row, originalIndex) => ({ row, originalIndex }))
                .sort(
                    (a, b) =>
                        directionRank(a.row) - directionRank(b.row) ||
                        thresholdSortValue(a.row) - thresholdSortValue(b.row) ||
                        toNumeric(b.row.change) - toNumeric(a.row.change)
                ),
        [rows]
    );

    const horizon = response.config?.horizon;

    const handleOddsChange = (
        originalIndex: number,
        side: "yes" | "no",
        rawPercent: string
    ) => {
        const parsedPercent = Number(rawPercent);
        if (Number.isNaN(parsedPercent)) {
            return;
        }

        const probability = clamp(parsedPercent / 100, 0.0001, 0.9999);
        setRows(prev => {
            const next = [...prev];
            const current = next[originalIndex];
            if (!current) {
                return prev;
            }
            next[originalIndex] = recomputeResearchRow(
                current,
                side === "yes" ? probability : current.yesOdds,
                side === "no" ? probability : current.noOdds
            );
            return next;
        });
    };

    return (
        <Card sx={{ padding: "1rem 0" }}>
            <Box px={2} pb={1}>
                <Typography variant="h6">Experimental Research Output</Typography>
                <Typography variant="body2" color="text.secondary">
                    Confidence-adjusted fair value and EV using the new research engine.
                </Typography>
                {response.sampleSize !== undefined && response.sampleSize !== null && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Based on {response.sampleSize} historical windows.
                    </Typography>
                )}
                {horizon?.label && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {horizon.label}
                    </Typography>
                )}
                {horizon?.settlement_label && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Settlement anchor: {horizon.settlement_label}
                    </Typography>
                )}
                {horizon?.window_label && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Contract window: {horizon.window_label}
                    </Typography>
                )}
            </Box>

            {(response.warnings || []).map((warning, idx) => (
                <Box px={2} pb={1} key={`${warning}-${idx}`}>
                    <Alert severity="warning">{warning}</Alert>
                </Box>
            ))}

            <TableContainer sx={{ background: "transparent" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Contract</TableCell>
                            <TableCell>Direction</TableCell>
                            <TableCell>% Change</TableCell>
                            <TableCell>% Occurred</TableCell>
                            <TableCell>Semantics</TableCell>
                            <TableCell>TTE</TableCell>
                            <TableCell>Dist %</TableCell>
                            <TableCell>Exp Move %</TableCell>
                            <TableCell>Dist / Move</TableCell>
                            <TableCell>Yes Side</TableCell>
                            <TableCell>Fair Yes</TableCell>
                            <TableCell>Edge Yes</TableCell>
                            <TableCell>Yes EV %</TableCell>
                            <TableCell>No Side</TableCell>
                            <TableCell>Fair No</TableCell>
                            <TableCell>Edge No</TableCell>
                            <TableCell>No EV %</TableCell>
                            <TableCell>Eff. Sample</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell>Trade</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedResults.map(({ row, originalIndex }, idx) => {
                            const originalRow = responseResults[originalIndex];
                            const isEdited = oddsDiffer(row.yesOdds, originalRow?.yesOdds) || oddsDiffer(row.noOdds, originalRow?.noOdds);

                            return (
                            <TableRow
                                key={`${row.threshold}-${idx}`}
                                sx={{
                                    backgroundColor: isEdited ? "rgba(255, 193, 7, 0.08)" : "transparent",
                                }}
                            >
                                <TableCell>{row.threshold ?? "-"}</TableCell>
                                <TableCell>{row.contract_direction ?? "-"}</TableCell>
                                <TableCell>{typeof row.change === "number" ? row.change.toFixed(2) : "-"}%</TableCell>
                                <TableCell>{typeof row.occurred === "number" ? row.occurred.toFixed(2) : "-"}%</TableCell>
                                <TableCell>{row.semantics_mode || row.history_mode || "-"}</TableCell>
                                <TableCell>{row.time_to_expiry_label || "-"}</TableCell>
                                <TableCell>{signedPct(row.distance_to_strike_pct)}</TableCell>
                                <TableCell>{num(row.expected_move_pct)}</TableCell>
                                <TableCell>{num(row.vol_normalized_distance)}</TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <span>{row.yes_label || "Yes"} @</span>
                                        <TextField
                                            value={typeof row.yesOdds === "number" ? (row.yesOdds * 100).toFixed(2) : ""}
                                            onChange={e => handleOddsChange(originalIndex, "yes", e.target.value)}
                                            type="number"
                                            inputProps={{ step: "0.01", min: "0.01", max: "99.99" }}
                                            size="small"
                                            variant="outlined"
                                            sx={{ width: 92, "& input": { textAlign: "right", fontVariantNumeric: "tabular-nums" } }}
                                        />
                                        <span>%</span>
                                    </Box>
                                </TableCell>
                                <TableCell>{pct(row.fair_value_yes)}</TableCell>
                                <TableCell sx={{ color: (row.edge_yes || 0) > 0 ? "limegreen" : "red" }}>
                                    {pct(row.edge_yes)}
                                </TableCell>
                                <TableCell sx={{ color: (row.expected_value_yes || 0) > 0 ? "limegreen" : "red" }}>
                                    {numPct(row.expected_value_yes)}
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <span>{row.no_label || "No"} @</span>
                                        <TextField
                                            value={typeof row.noOdds === "number" ? (row.noOdds * 100).toFixed(2) : ""}
                                            onChange={e => handleOddsChange(originalIndex, "no", e.target.value)}
                                            type="number"
                                            inputProps={{ step: "0.01", min: "0.01", max: "99.99" }}
                                            size="small"
                                            variant="outlined"
                                            sx={{ width: 92, "& input": { textAlign: "right", fontVariantNumeric: "tabular-nums" } }}
                                        />
                                        <span>%</span>
                                    </Box>
                                </TableCell>
                                <TableCell>{pct(row.fair_value_no)}</TableCell>
                                <TableCell sx={{ color: (row.edge_no || 0) > 0 ? "limegreen" : "red" }}>
                                    {pct(row.edge_no)}
                                </TableCell>
                                <TableCell sx={{ color: (row.expected_value_no || 0) > 0 ? "limegreen" : "red" }}>
                                    {numPct(row.expected_value_no)}
                                </TableCell>
                                <TableCell>{row.effective_sample_size ?? "-"}</TableCell>
                                <TableCell>{row.source_group || "-"}</TableCell>
                                <TableCell>
                                    {isEdited && (
                                        <Typography variant="caption" sx={{ display: "block", color: "warning.main", mb: 0.5, fontWeight: 600 }}>
                                            Edited
                                        </Typography>
                                    )}
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() =>
                                            onLogTrade?.({
                                                eventTitle,
                                                eventSlug,
                                                contractLabel: String(row.threshold ?? "Contract"),
                                                semanticsMode: row.semantics_mode || row.history_mode,
                                                direction: row.contract_direction || undefined,
                                                sourceTable: "research",
                                                yesOdds: row.yesOdds,
                                                noOdds: row.noOdds,
                                                yesEvPct: row.expected_value_yes,
                                                noEvPct: row.expected_value_no,
                                            })
                                        }
                                    >
                                        Log Trade
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </TableContainer>
        </Card>
    );
};


export default ResearchResultsPanel;