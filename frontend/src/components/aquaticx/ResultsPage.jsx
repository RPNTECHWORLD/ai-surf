import React, { useState, useEffect } from 'react';
import { Loader2, Trophy, Zap, Clock, User, ChevronDown, Download } from 'lucide-react';
import axios from 'axios';
const useAnalyticsTracker = () => {};
const useAdminTheme = () => ({ adminTheme: 'light' });

const API_BASE = 'http://54.84.243.251/api';

const useServerTimeOffset = () => {
    const [offset, setOffset] = useState(0);
    useEffect(() => {
        axios.get(`${API_BASE}/health`).then(res => {
            if (res.data?.timestamp) {
                setOffset(new Date(res.data.timestamp).getTime() - Date.now());
            }
        }).catch(() => { });
    }, []);
    return offset;
};

const SupStopwatchViewer = ({ heat }) => {
    const serverTimeOffset = useServerTimeOffset();
    const [elapsed, setElapsed] = useState(0);

    const dbRunning = heat?.sup_timer_running === 1;
    const dbAccumulated = heat?.sup_timer_accumulated || 0;
    const dbStartTime = heat?.sup_timer_start_time ? new Date(heat.sup_timer_start_time).getTime() : null;

    useEffect(() => {
        let interval = null;
        if (dbRunning && dbStartTime) {
            interval = setInterval(() => {
                const now = Date.now() + serverTimeOffset;
                const timePassed = now - dbStartTime;
                setElapsed(dbAccumulated + timePassed);
            }, 10);
        } else {
            setElapsed(dbAccumulated);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [dbRunning, dbAccumulated, dbStartTime, serverTimeOffset]);

    const formatStopwatchTime = (ms) => {
        const totalMs = Math.max(0, ms);
        const totalSeconds = Math.floor(totalMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((totalMs % 1000) / 10);

        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        const csStr = centiseconds.toString().padStart(2, '0');

        return `${mStr}:${sStr}.${csStr}`;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '700',
            color: '#1e3a8a',
            background: 'rgba(37, 99, 235, 0.05)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(37, 99, 235, 0.1)',
            height: '28px',
            whiteSpace: 'nowrap'
        }}>
            <span>SUP Timer: 🕒 <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{formatStopwatchTime(elapsed)}</span></span>
        </div>
    );
};

// Global cache for instant tab-switching
let globalResultsCache = {
    events: [],
    heats: [],
    hasLoaded: false
};

const formatDivisionName = (name, event = null) => {
    if (!name) return name;
    if (event && event.division_aliases) {
        try {
            const aliases = typeof event.division_aliases === 'string' ? JSON.parse(event.division_aliases) : event.division_aliases;
            if (aliases && aliases[name] && aliases[name].trim() !== '') {
                return aliases[name];
            }
        } catch (e) {
            // Ignore
        }
    }
    return name;
};

const ResultsPage = ({ currentUser }) => {
    const { theme } = useAdminTheme();
    const [events, setEvents] = useState(globalResultsCache.events);
    const [heats, setHeats] = useState(globalResultsCache.heats);
    const [isLoading, setIsLoading] = useState(!globalResultsCache.hasLoaded);
    const [selection, setSelection] = useState({ type: 'heat', id: '' });

    // ─── Cascade filter state ───────────────────────────────────────────
    const [filterEvent, setFilterEvent] = useState('');
    const [filterDivision, setFilterDivision] = useState('');
    const [filterRound, setFilterRound] = useState('');
    const [filterHeat, setFilterHeat] = useState('');
    // ────────────────────────────────────────────────────────────────────

    // Track analytics
    useAnalyticsTracker('viewer_results', selection.id || 'all');

    // ─── Helper: parse any CSS/named color → hex string (no '#') ───
    const colorToArgb = (cssColor, fallback = 'FF94A3B8') => {
        if (!cssColor) return fallback;
        const c = cssColor.trim().toLowerCase();
        const namedMap = {
            'red': 'FFEF4444', 'blue': 'FF3B82F6', 'yellow': 'FFFBBF24',
            'green': 'FF22C55E', 'white': 'FFFFFFFF', 'black': 'FF000000',
            'orange': 'FFF97316', 'purple': 'FF8B5CF6', 'pink': 'FFEC4899',
            'gray': 'FF6B7280', 'grey': 'FF6B7280',
        };
        if (namedMap[c]) return namedMap[c];
        const hex6 = c.match(/^#?([0-9a-f]{6})$/i);
        if (hex6) return 'FF' + hex6[1].toUpperCase();
        const hex3 = c.match(/^#?([0-9a-f]{3})$/i);
        if (hex3) {
            const [r, g, b] = hex3[1].split('').map(x => x + x);
            return 'FF' + (r + g + b).toUpperCase();
        }
        // Parse rgb(r,g,b)
        const rgb = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgb) {
            return 'FF' + [rgb[1], rgb[2], rgb[3]]
                .map(n => parseInt(n).toString(16).padStart(2, '0'))
                .join('').toUpperCase();
        }
        return fallback;
    };

    // ─── Helper: decide whether text on a given bg should be black or white ───
    const textArgbForBg = (bgArgb) => {
        const hex = bgArgb.slice(2); // strip 'FF'
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.55 ? 'FF000000' : 'FFFFFFFF';
    };

    const exportToExcel = async () => {
        if (!currentHeat || !sortedSurfers || sortedSurfers.length === 0) return;

        const isSup = currentHeat?.event_type === 'SUP Event';
        if (isSup) {
            const wb = new ExcelJS.Workbook();
            wb.creator = 'AquaticX Sports';
            wb.created = new Date();

            const ws = wb.addWorksheet('Results', {
                views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
            });

            ws.columns = [
                { key: 'rank', width: 8 },
                { key: 'surfer', width: 25 },
                { key: 'time', width: 25 }
            ];

            // ROW 1 — Branded Title (same as surfing)
            const displayDivName = formatDivisionName(currentHeat.division, events.find(e => e.id === currentHeat.event_id));
            const titleRow = ws.addRow([`${currentHeat.event_name || 'SUP Competition'} — ${displayDivName}`]);
            titleRow.height = 34;
            const titleCell = titleRow.getCell(1);
            titleCell.value = `${currentHeat.event_name || 'SUP Competition'}  |  ${displayDivName}  |  ${currentHeat.round || ''}  —  Heat #${currentHeat.heat_number || ''}`;
            titleCell.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            ws.mergeCells(1, 1, 1, 3);

            // ROW 2 — Sub-title / meta (same as surfing)
            const supCategoryStr = currentHeat.sup_category ? `SUP - ${currentHeat.sup_category}` : 'SUP Event';
            const subRow = ws.addRow([`Exported: ${new Date().toLocaleString('en-IN')}    |    Event Type: ${supCategoryStr}`]);
            subRow.height = 20;
            const subCell = subRow.getCell(1);
            subCell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FFCBD5E1' } };
            subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            ws.mergeCells(2, 1, 2, 3);

            // ROW 3 — Column headers
            const colHeaderValues = ['#', 'SURFER', 'COMPLETED BY SECONDS'];
            const hdrRow = ws.addRow(colHeaderValues);
            hdrRow.height = 22;
            hdrRow.eachCell((cell, colNum) => {
                cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF000000' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'center' };
                cell.border = {
                    bottom: { style: 'medium', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                };
            });

            // DATA ROWS — one per surfer
            sortedSurfers.forEach((surfer, idx) => {
                const rank = idx + 1;
                const jerseyArgb = colorToArgb(surfer.color);
                const timeStr = formatSupTime(surfer.total_score || 0);

                const dataRow = ws.addRow([rank, surfer.name, timeStr]);
                dataRow.height = 28;

                // Rank cell
                const rankCell = dataRow.getCell(1);
                rankCell.font = {
                    name: 'Calibri', bold: true, size: 12,
                    color: { argb: rank === 1 ? 'FFB8860B' : rank === 2 ? 'FF808080' : rank === 3 ? 'FF8B4513' : 'FF94A3B8' }
                };
                rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
                rankCell.alignment = { vertical: 'middle', horizontal: 'center' };
                rankCell.border = { right: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } } };

                // Surfer cell (with colored border like surfing)
                const nameCell = dataRow.getCell(2);
                nameCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF0F172A' } };
                nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
                nameCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                nameCell.border = {
                    left: { style: 'thick', color: { argb: jerseyArgb } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
                };

                // Completed by seconds cell (rendered like a beautiful timer)
                const timeCell = dataRow.getCell(3);
                timeCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: rank === 1 ? 'FF10B981' : 'FF0F172A' } };
                timeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                timeCell.alignment = { vertical: 'middle', horizontal: 'center' };
                timeCell.border = {
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
                };
            });

            const fileNameParts = [
                'SUP Heat Results',
                currentHeat.event_name || '',
                formatDivisionName(currentHeat.division, events.find(e => e.id === currentHeat.event_id)) || '',
                currentHeat.round || '',
                currentHeat.heat_number ? `Heat ${currentHeat.heat_number}` : ''
            ].filter(Boolean);

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileNameParts.join(' - ')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }

        // ── Compute max waves ──
        let maxWaveNum = currentHeat.max_waves || 10;
        sortedSurfers.forEach(s => {
            if (s.wave_details) {
                const keys = Object.keys(s.wave_details).map(Number).filter(n => !isNaN(n));
                if (keys.length > 0) maxWaveNum = Math.max(maxWaveNum, Math.max(...keys));
            }
        });
        maxWaveNum = Math.max(maxWaveNum, currentHeat.best_waves_count || 2);

        const bestCount = currentHeat.best_waves_count || 2;
        const decimals = currentHeat.score_decimals ?? 1;

        const wb = new ExcelJS.Workbook();
        wb.creator = 'AquaticX Sports';
        wb.created = new Date();

        const ws = wb.addWorksheet('Results', {
            views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }]
        });

        // ── Column widths: rank | surfer | wave×N | total ──
        ws.columns = [
            { key: 'rank', width: 8 },
            { key: 'surfer', width: 20 },
            ...Array.from({ length: maxWaveNum }, (_, i) => ({ key: `w${i + 1}`, width: 10 })),
            { key: 'total', width: 16 }
        ];

        // ════════════════════════════════════
        // ROW 1 — Branded Title
        // ════════════════════════════════════
        const displayDivNameSurfing = formatDivisionName(currentHeat.division, events.find(e => e.id === currentHeat.event_id));
        const titleRow = ws.addRow([`${currentHeat.event_name || 'Surf Competition'} — ${displayDivNameSurfing}`]);
        titleRow.height = 34;
        const titleCell = titleRow.getCell(1);
        titleCell.value = `${currentHeat.event_name || 'Surf Competition'}  |  ${displayDivNameSurfing}  |  ${currentHeat.round || ''}  —  Heat #${currentHeat.heat_number || ''}`;
        titleCell.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.mergeCells(1, 1, 1, 2 + maxWaveNum + 1);

        // ════════════════════════════════════
        // ROW 2 — Sub-title / meta
        // ════════════════════════════════════
        const subRow = ws.addRow([`Exported: ${new Date().toLocaleString('en-IN')}    |    Best ${bestCount} Wave(s) Count`]);
        subRow.height = 20;
        const subCell = subRow.getCell(1);
        subCell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FFCBD5E1' } };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.mergeCells(2, 1, 2, 2 + maxWaveNum + 1);

        // ════════════════════════════════════
        // ROW 3 — Column headers
        // ════════════════════════════════════
        const colHeaderValues = ['#', 'SURFER'];
        for (let w = 1; w <= maxWaveNum; w++) colHeaderValues.push(`WAVE ${w}`);
        colHeaderValues.push(`TOTAL (BEST ${bestCount})`);

        const hdrRow = ws.addRow(colHeaderValues);
        hdrRow.height = 22;
        hdrRow.eachCell((cell, colNum) => {
            cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'center' };
            cell.border = {
                bottom: { style: 'medium', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
        });

        // ════════════════════════════════════
        // DATA ROWS — one per surfer
        // ════════════════════════════════════
        sortedSurfers.forEach((surfer, idx) => {
            const rank = idx + 1;
            const jerseyArgb = colorToArgb(surfer.color);
            const jerseyText = textArgbForBg(jerseyArgb);

            // Figure out best-N wave numbers (green highlight)
            const scoresWithWave = Object.entries(surfer.wave_details || {})
                .map(([w, s]) => ({ wn: parseInt(w), sc: s }))
                .filter(x => typeof x.sc === 'number' && x.sc > 0)
                .sort((a, b) => b.sc - a.sc);
            const topWaveNums = new Set(scoresWithWave.slice(0, bestCount).map(x => x.wn));

            const rowValues = [rank, surfer.name];
            for (let w = 1; w <= maxWaveNum; w++) {
                const sc = surfer.wave_details?.[w];
                rowValues.push(sc != null ? parseFloat(sc).toFixed(decimals) : '');
            }
            rowValues.push(surfer.total_score != null ? parseFloat(surfer.total_score).toFixed(decimals) : '0.0');

            const dataRow = ws.addRow(rowValues);
            dataRow.height = 28;

            // ── Rank cell ──
            const rankCell = dataRow.getCell(1);
            rankCell.font = {
                name: 'Calibri', bold: true, size: 12,
                color: { argb: rank === 1 ? 'FFB8860B' : rank === 2 ? 'FF808080' : rank === 3 ? 'FF8B4513' : 'FF94A3B8' }
            };
            rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
            rankCell.alignment = { vertical: 'middle', horizontal: 'center' };
            rankCell.border = { right: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } } };

            // ── Surfer name cell (jersey colored left border accent) ──
            const nameCell = dataRow.getCell(2);
            nameCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF0F172A' } };
            nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
            nameCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            nameCell.border = {
                left: { style: 'thick', color: { argb: jerseyArgb } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
            };

            // ── Wave score cells ──
            for (let w = 1; w <= maxWaveNum; w++) {
                const cell = dataRow.getCell(2 + w);
                const sc = surfer.wave_details?.[w];
                const isIntWave = surfer.interference_1_wave === w || surfer.interference_2_wave === w;
                const isBest = topWaveNums.has(w);
                const isEmpty = sc == null;

                let bgArgb = 'FFFFFFFF';
                let fgArgb = 'FF64748B';
                let bold = false;

                if (!isEmpty) {
                    if (isIntWave) {
                        bgArgb = 'FFFEE2E2'; // light red
                        fgArgb = 'FFEF4444'; // red text
                        bold = true;
                    } else if (isBest) {
                        bgArgb = 'FFDCFCE7'; // light green
                        fgArgb = 'FF16A34A'; // green text
                        bold = true;
                    } else {
                        bgArgb = 'FFFFFFFF';
                        fgArgb = 'FF475569';
                    }
                }

                cell.value = isEmpty ? '' : parseFloat(sc).toFixed(decimals);
                cell.font = { name: 'Calibri', bold, size: 11, color: { argb: fgArgb } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
                };

                // ── Hover note: show all judge scores for this wave cell ──
                if (!isEmpty) {
                    const judgeScores = surfer.wave_judge_scores?.[w] || [];
                    const noteTexts = [];

                    // Header line
                    noteTexts.push({
                        font: { bold: true, size: 10, color: { argb: 'FF0F172A' } },
                        text: `Wave ${w}  —  ${surfer.name}\n`
                    });
                    noteTexts.push({
                        font: { bold: false, size: 9, color: { argb: 'FF64748B' } },
                        text: `─────────────────\n`
                    });

                    // Each judge's score
                    if (judgeScores.length > 0) {
                        judgeScores.forEach((js) => {
                            const scoreStr = js.score != null ? parseFloat(js.score).toFixed(decimals) : '--';
                            const intStr = js.is_interference ? ` (INT ${js.interference_pct}%)` : '';
                            noteTexts.push({
                                font: { bold: false, size: 10, color: js.is_interference ? { argb: 'FFEF4444' } : { argb: 'FF1E293B' } },
                                text: `J${js.judge_number}:  ${scoreStr}${intStr}\n`
                            });
                        });
                    } else {
                        noteTexts.push({
                            font: { italic: true, size: 9, color: { argb: 'FF94A3B8' } },
                            text: `(No judge data)\n`
                        });
                    }

                    // Separator + average
                    noteTexts.push({
                        font: { bold: false, size: 9, color: { argb: 'FF64748B' } },
                        text: `─────────────────\n`
                    });
                    noteTexts.push({
                        font: { bold: true, size: 10, color: isBest ? { argb: 'FF16A34A' } : isIntWave ? { argb: 'FFEF4444' } : { argb: 'FF0F172A' } },
                        text: `Avg:  ${parseFloat(sc).toFixed(decimals)}`
                    });

                    // Best wave badge
                    if (isBest) {
                        noteTexts.push({
                            font: { bold: true, size: 9, color: { argb: 'FF16A34A' } },
                            text: `  ★ Best Wave`
                        });
                    }

                    // Interference badge
                    if (isIntWave) {
                        const pct = surfer.interference_1_wave === w ? surfer.interference_1_pct : surfer.interference_2_pct;
                        noteTexts.push({
                            font: { bold: true, size: 9, color: { argb: 'FFEF4444' } },
                            text: `\nINT ${pct}% penalty applied`
                        });
                    }

                    cell.note = { texts: noteTexts };
                }
            }

            // ── Total score cell — filled with surfer's jersey color ──
            const totalCell = dataRow.getCell(2 + maxWaveNum + 1);
            totalCell.value = surfer.total_score != null ? parseFloat(surfer.total_score).toFixed(decimals) : '0.0';
            totalCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: jerseyText } };
            totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: jerseyArgb } };
            totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
            totalCell.border = {
                left: { style: 'medium', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
            };
        });

        // ════════════════════════════════════
        // INTERFERENCE DETAILS BLOCK
        // ════════════════════════════════════
        let hasInterference = sortedSurfers.some(s => s.interference_1_wave || s.interference_2_wave);
        if (hasInterference) {
            ws.addRow([]);
            const intTitleRow = ws.addRow(['', 'INTERFERENCE LOG']);
            intTitleRow.getCell(2).font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFEF4444' } };
            intTitleRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
            intTitleRow.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'FFFECACA' } } };
            const intHdrRow = ws.addRow(['', 'Surfer', 'Wave', 'Interference %']);
            [2, 3, 4].forEach(c => {
                const cell = intHdrRow.getCell(c);
                cell.font = { bold: true, size: 10, color: { argb: 'FFEF4444' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                cell.alignment = { horizontal: 'center' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFFECACA' } } };
            });
            sortedSurfers.forEach(surfer => {
                const add = (wave, pct) => {
                    if (!wave) return;
                    const r = ws.addRow(['', surfer.name, `Wave ${wave}`, `${pct}%`]);
                    [2, 3, 4].forEach(c => {
                        r.getCell(c).font = { size: 11, color: { argb: 'FF7F1D1D' } };
                        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5F5' } };
                        r.getCell(c).alignment = { horizontal: 'center' };
                    });
                    r.getCell(2).alignment = { horizontal: 'left', indent: 1 };
                };
                add(surfer.interference_1_wave, surfer.interference_1_pct);
                add(surfer.interference_2_wave, surfer.interference_2_pct);
            });
        }

        // ── Filename & Download ──
        const fileNameParts = [
            'Heat Results',
            currentHeat.event_name || '',
            formatDivisionName(currentHeat.division, events.find(e => e.id === currentHeat.event_id)) || '',
            currentHeat.round || '',
            currentHeat.heat_number ? `Heat ${currentHeat.heat_number}` : ''
        ].filter(Boolean);

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileNameParts.join(' - ')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchAllData(globalResultsCache.hasLoaded);
        const interval = setInterval(() => fetchAllData(true), 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const adminInfo = JSON.parse(sessionStorage.getItem('adminInfo') || '{}');
            const judgeInfo = JSON.parse(sessionStorage.getItem('judgeInfo') || '{}');
            const adminId = adminInfo.adminId || judgeInfo.admin_id;

            const params = {};
            if (adminId) {
                params.admin_id = adminId;
            }

            let allEvents = eventsRes.data || [];
            let nonBreakHeats = (heatsRes.data || []).filter(h => h.division !== 'Break' && !(h.round || '').toLowerCase().includes('break'));

            const isStudent = currentUser?.role === 'athlete' || currentUser?.role === 'student';
            if (isStudent && currentUser) {
                const userEmail = (currentUser.email || '').toLowerCase().trim();
                const userName = (currentUser.name || '').toLowerCase().trim();

                const myHeats = nonBreakHeats.filter(h => {
                    const surfers = h.surfers || [];
                    return surfers.some(s => {
                        const sEmail = (s.email || '').toLowerCase().trim();
                        const sName = (s.name || '').toLowerCase().trim();
                        return (userEmail && sEmail === userEmail) || (userName && sName === userName) || (userEmail && sName === userEmail.split('@')[0]) || (userName && userEmail.includes(sName));
                    });
                });

                if (myHeats.length > 0) {
                    nonBreakHeats = myHeats;
                    const myEventIds = new Set(myHeats.map(h => String(h.event_id)));
                    allEvents = allEvents.filter(e => myEventIds.has(String(e.id)));
                }
            }

            setEvents(allEvents);
            setHeats(nonBreakHeats);

            globalResultsCache.events = eventsRes.data;
            globalResultsCache.heats = nonBreakHeats;
            globalResultsCache.hasLoaded = true;
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Find in-progress heat (for live lock)
    const inProgressHeat = heats.find(h => h.status === 'in-progress');

    // Auto-select in-progress heat on initial load if nothing is selected yet
    useEffect(() => {
        if (inProgressHeat && !filterHeat) {
            if (selection.id !== inProgressHeat.id || selection.type !== 'heat') {
                setSelection({ type: 'heat', id: inProgressHeat.id });
            }
            setFilterEvent(String(inProgressHeat.event_id || ''));
            setFilterDivision(inProgressHeat.division || '');
            setFilterRound(inProgressHeat.round || '');
            setFilterHeat(inProgressHeat.id);
        }
    }, [heats.length, inProgressHeat?.id]);

    const handleSelectionChange = (value) => {
        const [type, id] = value.split(':');
        setSelection({ type, id });
    };

    // ─── Cascade filter derived values ──────────────────────────────────
    const canSelectDivision = !!filterEvent;
    const canSelectRound = !!filterEvent && !!filterDivision;
    const canSelectHeat = !!filterEvent && !!filterDivision && !!filterRound;

    // Divisions available only after event is selected
    const filteredDivisions = canSelectDivision
        ? [...new Set(heats.filter(h => String(h.event_id) === String(filterEvent)).map(h => h.division).filter(d => d && d !== 'Break'))].sort()
        : [];

    // Rounds available only after event + division are selected
    const filteredRounds = canSelectRound
        ? [...new Set(
            heats
                .filter(h =>
                    String(h.event_id) === String(filterEvent) &&
                    h.division === filterDivision &&
                    h.round
                )
                .map(h => h.round)
        )].sort((a, b) => {
            const getWeight = (r) => {
                const lower = r.toLowerCase();
                if (lower === 'final') return 10000;
                if (lower === 'semi final' || lower === 'semifinal') return 9000;
                if (lower === 'quarter final' || lower === 'quarterfinal') return 8000;
                const numMatch = lower.match(/\d+/);
                const num = numMatch ? parseInt(numMatch[0], 10) : 0;
                if (lower.includes('qualifier')) return 1000 + num;
                if (lower.includes('round')) return 2000 + num;
                return 5000;
            };
            const wA = getWeight(a), wB = getWeight(b);
            return wA === wB ? a.localeCompare(b) : wA - wB;
        })
        : [];

    // Heats available only after event + division + round are selected
    const filteredHeats = canSelectHeat
        ? heats.filter(h =>
            (h.status === 'completed' || h.status === 'finished' || h.status === 'in-progress') &&
            String(h.event_id) === String(filterEvent) &&
            h.division === filterDivision &&
            h.round === filterRound
        )
        : [];
    // ────────────────────────────────────────────────────────────────────

    // Determine current heat to display — only when filterHeat is explicitly chosen (or live lock)
    const currentHeat = (() => {
        if (filterHeat) {
            const h = heats.find(h => h.id === filterHeat);
            if (h) return h;
        }
        return null;
    })();

    const isSupEvent = currentHeat?.event_type === 'SUP Event';

    const formatSupTime = (ms) => {
        if (!ms || ms === 0) return '—';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        const csStr = centiseconds.toString().padStart(2, '0');
        return `${mStr}:${sStr}.${csStr}`;
    };

    // Sort surfers using backend-computed rank (includes ISA tie-breaker, fixed in heats.js)
    const sortedSurfers = currentHeat?.surfers
        ? [...currentHeat.surfers].sort((a, b) => {
            // Use backend rank if available (most reliable - tie-breaker already applied)
            if (a.rank != null && b.rank != null) {
                return a.rank - b.rank;
            }
            // Fallback: sort by total score with rounded tie-breaker
            const aTotal = Math.round((a.total_score || 0) * 1000) / 1000;
            const bTotal = Math.round((b.total_score || 0) * 1000) / 1000;
            if (bTotal !== aTotal) return bTotal - aTotal;
            const aSorted = [...(a.waves || [])].sort((x, y) => y - x);
            const bSorted = [...(b.waves || [])].sort((x, y) => y - x);
            const maxLen = Math.max(aSorted.length, bSorted.length);
            for (let i = 0; i < maxLen; i++) {
                const scoreA = Math.round((aSorted[i] || 0) * 1000) / 1000;
                const scoreB = Math.round((bSorted[i] || 0) * 1000) / 1000;
                if (scoreB !== scoreA) return scoreB - scoreA;
            }
            return 0;
        })
        : [];

    // Countdown timer — exact same logic as Tabulator/Judge dashboard
    const [remainingTime, setRemainingTime] = useState('00:00');
    useEffect(() => {
        const timerInterval = setInterval(() => {
            if (currentHeat) {
                if (currentHeat.status === 'in-progress' && currentHeat.actual_start_time) {
                    const start = new Date(currentHeat.actual_start_time).getTime();
                    const now = new Date().getTime();
                    const elapsedSecs = Math.floor((now - start) / 1000);
                    const total = (currentHeat.duration || 30) * 60;
                    const remaining = Math.max(0, total - elapsedSecs);
                    const mins = Math.floor(remaining / 60);
                    const secs = remaining % 60;
                    setRemainingTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                } else if (currentHeat.status === 'completed') {
                    setRemainingTime('00:00');
                } else {
                    setRemainingTime(`${(currentHeat.duration || 30).toString().padStart(2, '0')}:00`);
                }
            }
        }, 1000);
        return () => clearInterval(timerInterval);
    }, [currentHeat]);

    if (isLoading) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-blue)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '600' }}>Loading Leaderboard...</p>
            </div>
        );
    }

    const completedEvents = events.filter(e => e.status === 'Finished' || e.status === 'Completed');
    const availableHeats = heats.filter(h => h.status === 'completed' || h.status === 'finished');
    const isLive = currentHeat?.status === 'in-progress';

    // ─── Empty state is handled inline below filters ───

    // Podium: render 1,2,3 in DOM; CSS order rearranges to 2-1-3 on desktop
    const podiumOrder = [sortedSurfers[0], sortedSurfers[1], sortedSurfers[2]];

    // Medal colors for rank badges (solid background)
    const medalBadgeColor = (rank) => {
        if (rank === 1) return '#ffc403ff';  // gold
        if (rank === 2) return '#A8A9AD';  // silver
        if (rank === 3) return 'rgba(110, 68, 26, 1)';  // bronze
        return 'var(--text-muted)';
    };

    // Gold/silver/bronze gradient text style for table rank numbers
    const medalTextGradient = (rank) => {
        if (rank === 1) return {
            display: 'inline-block', minWidth: '24px', textAlign: 'center',
            background: 'linear-gradient(135deg, #FFD700, #B8860B)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', fontSize: '20px', fontWeight: '900',
            color: 'transparent'
        };
        if (rank === 2) return {
            display: 'inline-block', minWidth: '24px', textAlign: 'center',
            background: 'linear-gradient(135deg, #C0C0C0, #808080)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', fontSize: '20px', fontWeight: '900',
            color: 'transparent'
        };
        if (rank === 3) return {
            display: 'inline-block', minWidth: '24px', textAlign: 'center',
            background: 'linear-gradient(135deg, #CD7F32, #8B4513)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', fontSize: '20px', fontWeight: '900',
            color: 'transparent'
        };
        return { display: 'inline-block', minWidth: '24px', textAlign: 'center', fontSize: '18px', fontWeight: '900', color: 'var(--border-hover)' };
    };

    const fmt = (v) =>
        v != null
            ? v.toFixed(2)
            : '0.00';

    const dotColors = ['#D4AF37', '#A8A9AD', '#CD7F32', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div key={currentHeat?.id || 'empty'} className={`animate-fade-in ${theme === 'dark' ? 'admin-dark' : ''}`} style={{
            minHeight: '100vh',
            background: 'var(--bg-main)',
            padding: '28px 16px'
        }}>
            <style>{`
                @keyframes rp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                .rp-live-dot { animation: rp-pulse 1.4s ease-in-out infinite; }
                .rp-podium-card { transition: none; }
                .rp-row:hover { background: var(--bg-light); }
                @media(max-width: 768px) {
                    .rp-podium-grid { grid-template-columns: 1fr !important; }
                    .rp-header-indicators { display: none !important; }
                    .rp-selector-bar { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
                    .rp-col-hide { display: none !important; }
                    .rp-row .rp-int-badge { font-size: 7px !important; padding: 1px 3px !important; min-width: 0 !important; border-radius: 4px !important; }
                    .rp-row .rp-elim-label { font-size: 7px !important; }
                    .rp-filter-grid { grid-template-columns: 1fr !important; }
                }
                @media(min-width: 769px) {
                    .rp-podium-rank-1 { order: 2; }
                    .rp-podium-rank-2 { order: 1; }
                    .rp-podium-rank-3 { order: 3; }
                    .rp-main-container { max-width: 1050px !important; }
                    .rp-desktop-boost-text { font-size: 1.1em !important; }
                    .rp-row span, .rp-row div { font-size: 1.1em !important; }
                    .rp-main-container h1 { font-size: 32px !important; }
                    .rp-main-container h2 { font-size: 24px !important; }
                    .rp-podium-card { margin-bottom: 20px; }
                    .rp-row .rp-int-badge { font-size: 11px !important; padding: 2px 8px !important; min-width: 40px !important; border-radius: 6px !important; }
                    .rp-row .rp-elim-label { font-size: 11px !important; }
                }
            `}</style>

            <div className="rp-main-container" style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* ─── Header ─── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-dark)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                            Live Leaderboard
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                            Real-time competition results
                        </p>
                    </div>
                    <div className="rp-header-indicators" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Live visuals</span>
                        </div>
                        {isLive && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className="rp-live-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700' }}>Live</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Filter Bar ─── */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border-dim)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    marginBottom: '28px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}>
                    {/* Live Heat Banner & Direct View Action */}
                    {inProgressHeat && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
                            background: 'rgba(239,68,68,0.07)', color: '#ef4444',
                            padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.18)',
                            fontSize: '12px', fontWeight: '800', marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Zap size={13} className="rp-live-dot" style={{ color: '#ef4444' }} />
                                LIVE HEAT PROGRESS — Heat #{inProgressHeat.heat_number} · {inProgressHeat.round} · {formatDivisionName(inProgressHeat.division, events.find(e => e.id === inProgressHeat.event_id))}
                            </div>
                            {filterHeat !== inProgressHeat.id && (
                                <button
                                    onClick={() => {
                                        setFilterEvent(String(inProgressHeat.event_id || ''));
                                        setFilterDivision(inProgressHeat.division || '');
                                        setFilterRound(inProgressHeat.round || '');
                                        setFilterHeat(inProgressHeat.id);
                                        setSelection({ type: 'heat', id: inProgressHeat.id });
                                    }}
                                    style={{
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '6px 14px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 8px rgba(239,68,68,0.25)',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                                >
                                    🔴 View Live Heat
                                </button>
                            )}
                        </div>
                    )}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '16px'
                    }} className="rp-filter-grid">

                        {/* 1. Select Event */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
                                Event
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    className="form-control"
                                    value={filterEvent}
                                    onChange={(e) => {
                                        setFilterEvent(e.target.value);
                                        setFilterDivision('');
                                        setFilterRound('');
                                        setFilterHeat('');
                                        setSelection({ type: 'heat', id: '' });
                                    }}
                                    style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'white', cursor: 'pointer' }}
                                >
                                    <option value="">Select Event</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={String(ev.id)}>{ev.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
                        </div>

                        {/* 2. Select Section */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', flexShrink: 0 }} />
                                Section
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    className="form-control"
                                    value={filterDivision}
                                    disabled={!canSelectDivision}
                                    onChange={(e) => {
                                        setFilterDivision(e.target.value);
                                        setFilterRound('');
                                        setFilterHeat('');
                                        setSelection({ type: 'heat', id: '' });
                                    }}
                                    style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'white', cursor: (!canSelectDivision) ? 'default' : (filteredDivisions.length ? 'pointer' : 'default'), opacity: (!canSelectDivision || !filteredDivisions.length) ? 0.5 : 1 }}
                                >
                                    <option value="">Select Section</option>
                                    {filteredDivisions.map(div => (
                                        <option key={div} value={div}>{formatDivisionName(div, events.find(e => String(e.id) === String(filterEvent)))}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
                        </div>

                        {/* 3. Select Round */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
                                Round
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    className="form-control"
                                    value={filterRound}
                                    disabled={!canSelectRound}
                                    onChange={(e) => {
                                        setFilterRound(e.target.value);
                                        setFilterHeat('');
                                        setSelection({ type: 'heat', id: '' });
                                    }}
                                    style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'white', cursor: (!canSelectRound) ? 'default' : (filteredRounds.length ? 'pointer' : 'default'), opacity: (!canSelectRound || !filteredRounds.length) ? 0.5 : 1 }}
                                >
                                    <option value="">Select Round</option>
                                    {filteredRounds.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
                        </div>

                        {/* 4. Select Heat */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
                                Heat
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    className="form-control"
                                    value={filterHeat}
                                    disabled={!canSelectHeat}
                                    onChange={(e) => {
                                        const hid = e.target.value;
                                        setFilterHeat(hid);
                                        setSelection({ type: 'heat', id: hid });
                                    }}
                                    style={{ fontSize: '13px', fontWeight: '600', padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none', width: '100%', borderRadius: '10px', border: '1.5px solid var(--border-dim)', background: 'white', cursor: (!canSelectHeat) ? 'default' : (filteredHeats.length ? 'pointer' : 'default'), opacity: (!canSelectHeat || !filteredHeats.length) ? 0.5 : 1 }}
                                >
                                    <option value="">Select Heat</option>
                                    {filteredHeats.map(h => (
                                        <option key={h.id} value={h.id}>
                                            {h.status === 'in-progress' ? '🔥 LIVE: ' : ''}Heat #{h.heat_number} · {h.round}
                                            {!filterDivision ? ` · ${formatDivisionName(h.division, events.find(e => e.id === h.event_id))}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
                        </div>

                    </div>
                </div>

                {/* ─── Context Info Bar ─── */}
                {currentHeat && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border-dim)',
                        borderRadius: '14px',
                        padding: '14px 20px',
                        marginBottom: '24px',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        {/* Left: breadcrumb chips */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {currentHeat.event_name && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}>
                                    <Trophy size={11} />{currentHeat.event_name}
                                </span>
                            )}
                            {currentHeat.event_name && currentHeat.division && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>›</span>
                            )}
                            {currentHeat.division && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}>
                                    {formatDivisionName(currentHeat.division, events.find(e => e.id === currentHeat.event_id))}
                                </span>
                            )}
                            {currentHeat.division && (currentHeat.round || currentHeat.heat_number) && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>›</span>
                            )}
                            {(currentHeat.round || currentHeat.heat_number) && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}>
                                    {currentHeat.round}{currentHeat.heat_number ? ` · Heat ${currentHeat.heat_number}` : ''}
                                </span>
                            )}
                        </div>
                        {/* Right: status + export */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {isLive && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                                    <div className="rp-live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                                    LIVE
                                </div>
                            )}
                            {!isLive && (
                                <div style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                                    Finished
                                </div>
                            )}
                            {!isLive && (
                                <button
                                    onClick={exportToExcel}
                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#22c55e', color: '#fff', padding: '5px 13px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                                >
                                    <Download size={12} /> Export CSV
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Empty state (shown below filters when no heat selected/found) ─── */}
                {!currentHeat && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--bg-card)', border: '1.5px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trophy size={28} style={{ color: 'var(--border-dim)' }} />
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>No results found</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '280px', lineHeight: 1.5, margin: 0 }}>
                            {filterEvent ? 'No heats found for the selected filters.' : 'Select an event to view results.'}
                        </p>
                    </div>
                )}

                {/* ─── Results Content (only when heat is selected) ─── */}
                {currentHeat && sortedSurfers.length > 0 && (
                    <div className="rp-podium-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.1fr 1fr',
                        gap: '14px',
                        marginBottom: '24px',
                        alignItems: 'end'
                    }}>
                        {podiumOrder.map((surfer, idx) => {
                            const rank = idx + 1;
                            if (!surfer) return <div key={idx} />;
                            const bestScores = [...(surfer.waves || [])].sort((a, b) => b - a).slice(0, 2);
                            const jerseyColor = surfer.color || medalBadgeColor(rank);
                            const badgeColor = medalBadgeColor(rank);
                            const isWhiteJersey = jerseyColor?.toLowerCase() === '#ffffff' || jerseyColor?.toLowerCase() === 'white' || jerseyColor?.toLowerCase() === '#fff';
                            const iconColor = isWhiteJersey ? 'var(--text-dark)' : '#ffffff';
                            return (
                                <div key={surfer.id} className={`rp-podium-card rp-podium-rank-${rank}`} style={{
                                    background: surfer.is_eliminated === 1 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), var(--surface-light))' : 'var(--surface-light)',
                                    border: '1px solid var(--border-dim)',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    position: 'relative'
                                }}>
                                    {/* Rank badge — uses rank color for clarity */}
                                    <div style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        background: badgeColor, color: 'white',
                                        width: '26px', height: '26px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '11px', fontWeight: '900'
                                    }}>
                                        #{rank}
                                    </div>

                                    {/* Avatar + score */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                        <div style={{
                                            width: '56px', height: '56px', borderRadius: '12px',
                                            background: isSupEvent ? '#E5E7EB' : jerseyColor,
                                            border: `3px solid ${isSupEvent ? '#9CA3AF' : jerseyColor}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden',
                                            flexShrink: 0
                                        }}>
                                            {surfer.photo ? (
                                                <img
                                                    src={surfer.photo}
                                                    alt={surfer.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <User size={26} color={isSupEvent ? '#9CA3AF' : iconColor} strokeWidth={2.5} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: isSupEvent ? '18px' : '28px',
                                                fontWeight: '900',
                                                color: (surfer.interference_1_wave || surfer.interference_2_wave) ? '#ef4444' : 'var(--text-dark)',
                                                lineHeight: 1
                                            }}>
                                                {isSupEvent ? formatSupTime(surfer.total_score || 0) : fmt(surfer.total_score)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                                                {isSupEvent ? (
                                                    <span style={{ fontSize: '11px', background: '#E5E7EB', border: '1px solid #9CA3AF', borderRadius: '4px', padding: '1px 6px', fontWeight: '800', color: 'black', marginRight: '4px' }}>
                                                        #{surfer.color}
                                                    </span>
                                                ) : (
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: jerseyColor }} />
                                                )}
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                                    {surfer.name}
                                                    {surfer.is_eliminated === 1 && (
                                                        <span style={{ marginLeft: '6px', color: '#ef4444', fontSize: '10px', fontWeight: '800' }}>ELIMINATED</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Wave scores — all waves, scrollable inside the card */}
                                    {!isSupEvent && (
                                        <div style={{ overflowX: 'auto', borderRadius: '8px', background: 'var(--border-dim)', padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', gap: '10px', minWidth: 'min-content' }}>
                                                {(surfer.waves || []).map((score, i) => {
                                                    const w = i + 1;
                                                    const isInt1 = surfer.interference_1_wave === w;
                                                    const isInt2 = surfer.interference_2_wave === w;
                                                    const isInt = isInt1 || isInt2;
                                                    const pct = isInt1 ? surfer.interference_1_pct : (isInt2 ? surfer.interference_2_pct : 0);

                                                    return (
                                                        <div key={i} style={{ flexShrink: 0 }}>
                                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', whiteSpace: 'nowrap' }}>W{w}</div>
                                                            <div style={{
                                                                fontSize: '15px',
                                                                fontWeight: '800',
                                                                color: isInt ? '#ef4444' : 'var(--text-dark)',
                                                                background: isInt ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                                                padding: isInt ? '2px 4px' : '0',
                                                                borderRadius: '4px'
                                                            }}>
                                                                {fmt(score)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(!surfer.waves || surfer.waves.length === 0) && (
                                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>No waves yet</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Removed the absolute overlay banner as requested */}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ─── Results Table ─── */}
                {currentHeat && <div style={{
                    background: 'var(--surface-light)', borderRadius: '16px',
                    border: '1px solid var(--border-dim)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                }}>
                    {/* Title row */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-dark)', letterSpacing: '-0.3px', margin: 0 }}>
                                Athlete Results
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {isSupEvent && <SupStopwatchViewer heat={currentHeat} />}
                                {isLive && !isSupEvent && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: remainingTime === '00:00' ? '#fef2f2' : '#f0fdf4',
                                        color: remainingTime === '00:00' ? '#ef4444' : '#15803d',
                                        padding: '5px 12px', borderRadius: '20px',
                                    }}>
                                        <Clock size={13} />
                                        <span style={{
                                            fontSize: '15px', fontWeight: '800',
                                            fontFamily: 'monospace',
                                            color: remainingTime === '00:00' ? '#ef4444' : 'inherit'
                                        }}>{remainingTime}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable table wrapper */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '380px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-dim)' }}>
                                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', width: '60px' }}>RANK</th>
                                    <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700' }}>ATHLETE</th>
                                    {!isSupEvent && <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>Best {currentHeat?.best_waves_count || 2} wave(s)</th>}
                                    <th style={{ textAlign: 'right', padding: '10px 20px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700' }}>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSurfers.map((surfer, idx) => {
                                    const bestScores = [...(surfer.waves || [])].sort((a, b) => b - a).slice(0, 2);
                                    const isWinner = idx === 0;
                                    const firstPlaceTotal = sortedSurfers[0]?.total_score || 0;

                                    const subLabel = (() => {
                                        const hs = currentHeat?.status?.toLowerCase();
                                        if (surfer.is_eliminated === 1) {
                                            return <span className="rp-elim-label" style={{ color: '#ef4444', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ELIMINATED</span>;
                                        }
                                        if (isSupEvent) {
                                            if (isWinner) {
                                                return <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '700' }}>Fastest</span>;
                                            } else if (surfer.total_score > 0 && firstPlaceTotal > 0) {
                                                const diffMs = (surfer.total_score || 0) - firstPlaceTotal;
                                                return <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' }}>+{formatSupTime(diffMs)} behind</span>;
                                            }
                                        } else {
                                            if (isWinner) {
                                                if (hs === 'in-progress') return <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '700' }}>Highest Score</span>;
                                                if ((hs === 'finished' || hs === 'completed') && sortedSurfers[1]) {
                                                    const margin = (firstPlaceTotal - sortedSurfers[1].total_score).toFixed(2);
                                                    return <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '700' }}>Won by {margin}</span>;
                                                }
                                            } else {
                                                const maxWave = Math.max(...(surfer.waves || []), 0);
                                                const targetTotal = idx === 1 ? firstPlaceTotal : (sortedSurfers[1]?.total_score || 0);
                                                const rawDiff = targetTotal - maxWave;
                                                const decimals = 2;
                                                const factor = Math.pow(10, decimals);
                                                const diff = Math.round(rawDiff * factor) / factor;
                                                const needed = (Math.floor(diff / 0.5) * 0.5 + 0.5).toFixed(2);
                                                if (needed > 0) return <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' }}>Needs {needed}</span>;
                                            }
                                        }
                                        return null;
                                    })();

                                    return (
                                        <tr key={surfer.id} className="rp-row" style={{ borderBottom: '1px solid var(--bg-light)', position: 'relative' }}>
                                            <td style={{ padding: '14px 8px' }}>
                                                <span key={`${surfer.id}-rank-${idx + 1}`} style={medalTextGradient(idx + 1)}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: isSupEvent ? '#E5E7EB' : (surfer.color || dotColors[idx] || 'var(--text-muted)'),
                                                        border: `2px solid ${isSupEvent ? '#9CA3AF' : (surfer.color || dotColors[idx] || 'var(--text-muted)')}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        flexShrink: 0
                                                    }}>
                                                        {surfer.photo ? (
                                                            <img
                                                                src={surfer.photo}
                                                                alt={surfer.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <User size={16} color={isSupEvent ? '#9CA3AF' : ((surfer.color === '#FFFFFF' || surfer.color === 'white') ? 'black' : 'white')} />
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)' }}>{surfer.name}</span>
                                                </div>
                                            </td>
                                            {!isSupEvent && <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                                                    {(() => {
                                                        const details = surfer.wave_details || {};
                                                        const sortedWaves = Object.entries(details)
                                                            .map(([w, s]) => ({ w: parseInt(w), s }))
                                                            .sort((a, b) => b.s - a.s)
                                                            .slice(0, currentHeat?.best_waves_count || 2);

                                                        return sortedWaves.map((item, i) => {
                                                            const isInt1 = surfer.interference_1_wave === item.w;
                                                            const isInt2 = surfer.interference_2_wave === item.w;
                                                            const isInt = isInt1 || isInt2;
                                                            const pct = isInt1 ? surfer.interference_1_pct : (isInt2 ? surfer.interference_2_pct : 0);

                                                            return (
                                                                <span key={i} className={isInt ? 'rp-int-badge' : ''} style={{
                                                                    display: 'inline-block',
                                                                    background: isInt ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-light)',
                                                                    padding: isInt ? '2px 6px' : '5px 12px',
                                                                    borderRadius: '6px',
                                                                    fontWeight: '700',
                                                                    color: isInt ? '#ef4444' : 'var(--text-gray)',
                                                                    minWidth: isInt ? undefined : '48px',
                                                                    textAlign: 'center',
                                                                    border: isInt ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {fmt(item.s)}{isInt ? ` (INT ${pct}%)` : ''}
                                                                </span>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </td>}
                                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                <div style={{
                                                    fontSize: isSupEvent ? '15px' : '20px',
                                                    fontWeight: '900',
                                                    color: (surfer.interference_1_wave || surfer.interference_2_wave) ? '#ef4444' : (isWinner ? '#10b981' : 'var(--text-dark)'),
                                                    lineHeight: 1
                                                }}>
                                                    {isSupEvent ? formatSupTime(surfer.total_score || 0) : fmt(surfer.total_score)}
                                                </div>
                                                {subLabel}
                                            </td>

                                            {/* Removed the absolute overlay banner as requested */}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>}

                {/* ─── Event Sponsors ─── */}
                {currentHeat && (() => {
                    const heatEvent = events.find(e => e.id === currentHeat.event_id);
                    if (heatEvent && heatEvent.sponsors) {
                        try {
                            const parsedSponsors = JSON.parse(heatEvent.sponsors);
                            if (parsedSponsors.length > 0) {
                                return (
                                    <div style={{ marginTop: '32px', marginBottom: '32px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px' }}>Event Sponsors</h3>
                                        <div style={{
                                            width: '100%',
                                            background: 'var(--surface-light)',
                                            border: '1px solid var(--border-dim)',
                                            borderRadius: '12px',
                                            padding: '24px 0',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                            overflowX: 'clip',
                                            overflowY: 'visible',
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            containerType: 'inline-size'
                                        }}>
                                            <style>{`
                                                @keyframes resultsMarquee {
                                                    0% { transform: translateX(100cqi); }
                                                    100% { transform: translateX(-100%); }
                                                }
                                                .results-sponsor-marquee {
                                                    display: flex;
                                                    align-items: center;
                                                    gap: 60px;
                                                    animation: resultsMarquee 20s linear infinite;
                                                }
                                                .results-sponsor-marquee:hover {
                                                    animation-play-state: paused;
                                                }
                                                .sponsor-item-rp {
                                                    position: relative;
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    cursor: pointer;
                                                }
                                                .sponsor-ttive-rp {
                                                    position: absolute;
                                                    bottom: calc(100% + 12px);
                                                    left: 50%;
                                                    transform: translateX(-50%);
                                                    background: var(--text-dark);
                                                    color: var(--surface-light);
                                                    padding: 6px 12px;
                                                    border-radius: 6px;
                                                    font-size: 13px;
                                                    font-weight: 700;
                                                    white-space: nowrap;
                                                    opacity: 0;
                                                    visibility: hidden;
                                                    transition: opacity 0.2s, visibility 0.2s;
                                                    z-index: 1000;
                                                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                                    pointer-events: none;
                                                }
                                                .sponsor-ttive-rp::after {
                                                    content: '';
                                                    position: absolute;
                                                    top: 100%;
                                                    left: 50%;
                                                    transform: translateX(-50%);
                                                    border: 6px solid transparent;
                                                    border-top-color: var(--text-dark);
                                                }
                                                .sponsor-item-rp:hover .sponsor-ttive-rp {
                                                    opacity: 1;
                                                    visibility: visible;
                                                }
                                            `}</style>

                                            {/* Left fading gradient */}
                                            <div style={{
                                                position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px',
                                                background: 'linear-gradient(to right, var(--surface-light) 0%, transparent 100%)',
                                                zIndex: 2, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', pointerEvents: 'none'
                                            }} />

                                            <div className="results-sponsor-marquee" style={{ width: 'max-content' }}>
                                                {parsedSponsors.map((sponsor, idx) => (
                                                    <div key={idx} className="sponsor-item-rp">
                                                        <img
                                                            src={sponsor.image}
                                                            alt={sponsor.name}
                                                            style={{ height: '60px', width: 'auto', maxWidth: '180px', objectFit: 'contain' }}
                                                        />
                                                        <div className="sponsor-ttive-rp">{sponsor.name}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Right fading gradient */}
                                            <div style={{
                                                position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px',
                                                background: 'linear-gradient(to left, var(--surface-light) 0%, transparent 100%)',
                                                zIndex: 2, borderTopRightRadius: '12px', borderBottomRightRadius: '12px', pointerEvents: 'none'
                                            }} />
                                        </div>
                                    </div>
                                );
                            }
                        } catch (e) {
                            // ignore json parse errors
                        }
                    }
                    return null;
                })()}

            </div>
        </div>
    );
};

export default ResultsPage;
