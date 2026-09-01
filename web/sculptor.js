import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Rimor.Core";

// ============================================================
// ПОДПИСКА - ТОЧНО КАК В РЕФЕРЕНСЕ
// ============================================================

const { api } = window.comfyAPI.api;

api.addEventListener("rimor_preview", (e) => {
    const data = e.detail;
    if (!data || data.node_id == null) return;
    
    const nodeId = parseInt(data.node_id, 10);
    const node = app.graph?.getNodeById?.(nodeId);
    
    if (node?._rimorPreviewHandler) {
        node._rimorPreviewHandler(data);
    }
});

api.addEventListener("rimor_cfg_update", (e) => {
    const data = e.detail;
    if (!data || data.cfg_value === undefined || data.node_id === undefined) return;
    
    const nodeId = parseInt(data.node_id, 10);
    
    if (!isNaN(nodeId)) {
        const node = app.graph?.getNodeById?.(nodeId);
        if (node?._cfgGraphHandler) {
            node._cfgGraphHandler(data.cfg_value);
        }
    } else {
        const stringId = String(data.node_id);
        const nodes = app.graph?.nodes || [];
        const node = nodes.find(n => 
            n.type === "Rimor_CFGSculptorAdvanced" && 
            (String(n.id) === stringId || n._rimorNodeId === stringId)
        );
        if (node?._cfgGraphHandler) {
            node._cfgGraphHandler(data.cfg_value);
        }
    }
});

api.addEventListener("rimor_cfg_reset", (e) => {
    const data = e.detail;
    if (!data || data.node_id === undefined) return;
    
    const nodeId = parseInt(data.node_id, 10);
    
    if (!isNaN(nodeId)) {
        const node = app.graph?.getNodeById?.(nodeId);
        if (node?._cfgGraphHandler) {
            node._cfgGraphHandler(null);
        }
    } else {
        const stringId = String(data.node_id);
        const nodes = app.graph?.nodes || [];
        const node = nodes.find(n => 
            n.type === "Rimor_CFGSculptorAdvanced" && 
            (String(n.id) === stringId || n._rimorNodeId === stringId)
        );
        if (node?._cfgGraphHandler) {
            node._cfgGraphHandler(null);
        }
    }
});

// ============================================================
// НАСТРОЙКИ
// ============================================================

const COLORS = {
    accentColor: "#4a90d9",
    backgroundColor: "#1a1a1a",
    textColor: "#999999",
    previewBackground: "#14181e",
    previewBorder: "#1b3d75",
    preset: "#17202e",
    cfg: "#331b41",
    envelope: "#14181e",
    waveform: "#4B001A",
    hysteresis: "#14181e",
    snapshots: "#17202e",
};

const UI_CONFIG = {
    sectionPresetHeight: 80,
    sectionCfgHeight: 75,
    sectionEnvelopeHeight: 75,
    sectionWaveformHeight: 124,
    sectionHysteresisHeight: 75,
    sectionSnapshotsHeight: 170,
    sectionGraphHeight: 120,
    logoHeight: 28,
    sectionPaddingCompact: 8,
    sectionPaddingNormal: 8,
    sectionBorderRadius: 8,
    sectionMargin: 4,
    sectionTitleFontSize: 13,
    sectionTitleMarginBottom: 8,
    sectionTitleHeight: 10,
    fieldFontSize: 13,
    fieldPaddingY: 0,
    fieldPaddingX: 12,
    fieldRowHeight: 22,
    fieldLabelWidth: 55,
    buttonHeight: 20,
    buttonFontSize: 12,
    minWidth: 240,
};

function calculateNodeHeight() {
    const sections = [
        UI_CONFIG.sectionPresetHeight,
        UI_CONFIG.sectionCfgHeight,
        UI_CONFIG.sectionEnvelopeHeight,
        UI_CONFIG.sectionWaveformHeight,
        UI_CONFIG.sectionHysteresisHeight,
        UI_CONFIG.sectionSnapshotsHeight,
        UI_CONFIG.sectionGraphHeight,
        UI_CONFIG.logoHeight
    ];
    
    return sections.reduce((sum, h) => sum + h + 26, 0) + (sections.length - 1) * UI_CONFIG.sectionMargin;
}

const PRESETS = {
    "custom": null,
    "Gentle Breeze": { cfg_start: 3.0, cfg_end: 1.5, envelope_mode: "linear", use_envelope: true, waveform: "sine", wave_amplitude: 0.2, wave_periods: 2.0, wave_decay: "linear", hysteresis_enabled: false, hysteresis_factor: 1.5 },
    "Smooth Operator": { cfg_start: 4.0, cfg_end: 2.0, envelope_mode: "sigmoid", use_envelope: true, waveform: "sine", wave_amplitude: 0.3, wave_periods: 3.0, wave_decay: "exp", hysteresis_enabled: false, hysteresis_factor: 1.5 },
    "Golden Touch": { cfg_start: 5.0, cfg_end: 2.0, envelope_mode: "fibonacci", use_envelope: true, waveform: "fibonacci", wave_amplitude: 0.4, wave_periods: 3.5, wave_decay: "fibonacci", hysteresis_enabled: false, hysteresis_factor: 1.5 },
    "Wave Rider": { cfg_start: 6.0, cfg_end: 2.0, envelope_mode: "gaussian", use_envelope: true, waveform: "sine", wave_amplitude: 0.5, wave_periods: 4.0, wave_decay: "linear", hysteresis_enabled: true, hysteresis_factor: 1.3 },
    "Deep Surge": { cfg_start: 7.0, cfg_end: 2.0, envelope_mode: "mid_peak", use_envelope: true, waveform: "triangle", wave_amplitude: 0.6, wave_periods: 3.0, wave_decay: "exp", hysteresis_enabled: true, hysteresis_factor: 1.5 },
    "Chaos Theory": { cfg_start: 8.0, cfg_end: 1.5, envelope_mode: "fall_rise", use_envelope: true, waveform: "sawtooth", wave_amplitude: 0.7, wave_periods: 5.0, wave_decay: "none", hysteresis_enabled: false, hysteresis_factor: 1.5 },
    "Fibonacci Spiral": { cfg_start: 6.0, cfg_end: 2.0, envelope_mode: "fibonacci", use_envelope: true, waveform: "fibonacci", wave_amplitude: 0.5, wave_periods: 2.618, wave_decay: "fibonacci", hysteresis_enabled: true, hysteresis_factor: 1.4 },
    "Brutal Force": { cfg_start: 9.0, cfg_end: 2.0, envelope_mode: "mid_peak", use_envelope: true, waveform: "square", wave_amplitude: 0.8, wave_periods: 2.0, wave_decay: "linear", hysteresis_enabled: true, hysteresis_factor: 1.2 },
    "Resonance": { cfg_start: 5.0, cfg_end: 2.5, envelope_mode: "sigmoid", use_envelope: true, waveform: "sine", wave_amplitude: 0.4, wave_periods: 6.28, wave_decay: "exp", hysteresis_enabled: true, hysteresis_factor: 1.3 },
    "Total Madness": { cfg_start: 12.0, cfg_end: 1.0, envelope_mode: "fibonacci", use_envelope: true, waveform: "sawtooth", wave_amplitude: 1.0, wave_periods: 8.0, wave_decay: "none", hysteresis_enabled: false, hysteresis_factor: 1.5 },
};

function getWidgetValue(node, name, defaultValue) {
    const w = node.widgets?.find(x => x.name === name);
    return w ? w.value : defaultValue;
}

function setWidgetValue(node, name, value) {
    const w = node.widgets?.find(x => x.name === name);
    if (w) {
        w.value = String(value);
        if (w._state && typeof w._state === 'object') {
            w._state.value = String(value);
        }
    }
}

function setupDynamicInputs(node, { type, prefix, countWidget = "inputcount" } = {}) {
    const rebuild = () => {
        if (!node.inputs) node.inputs = [];
        const countW = node.widgets?.find(w => w.name === countWidget);
        if (!countW) return;
        const target = countW.value;
        const current = node.inputs.filter(i => i.name?.startsWith(prefix)).length;
        if (target === current) return;
        if (target < current) {
            for (let i = 0; i < current - target; i++) node.removeInput(node.inputs.length - 1);
        } else {
            for (let i = current + 1; i <= target; i++) node.addInput(`${prefix}${i}`, type);
        }
    };
    node.addWidget("button", "Update inputs", null, rebuild);
    const countW = node.widgets?.find(w => w.name === countWidget);
    if (countW) {
        const origCb = countW.callback;
        countW.callback = function (value, canvas) {
            const r = origCb ? origCb.apply(this, arguments) : undefined;
            if (!canvas) rebuild();
            return r;
        };
        if (countW.value > 0) {
            rebuild();
        }
    }
    return rebuild;
}

function createCheckbox(node, container, label, widgetName, defaultValue = false) {
    const content = container._content || container;
    const row = document.createElement('div');
    row.style.cssText = `
        display: flex;
        align-items: center;
        margin: 0;
        height: ${UI_CONFIG.fieldRowHeight}px;
        min-height: ${UI_CONFIG.fieldRowHeight}px;
        max-height: ${UI_CONFIG.fieldRowHeight}px;
        flex-shrink: 0;
        flex-grow: 0;
        cursor: pointer;
        font-family: monospace;
    `;
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
        color: ${COLORS.textColor};
        font-size: ${UI_CONFIG.fieldFontSize}px;
        min-width: ${UI_CONFIG.fieldLabelWidth}px;
        flex-shrink: 0;
        pointer-events: none;
        font-family: monospace;
    `;
    
    const box = document.createElement('div');
    const initialValue = getWidgetValue(node, widgetName, defaultValue.toString()) === "true";
    
    function updateCheckbox(value) {
        box.style.background = value ? COLORS.accentColor : "#111111";
        box.style.borderColor = value ? COLORS.accentColor : "#1b3d75";
        box.setAttribute('data-checked', value.toString());
    }
    
    box.style.cssText = `
        width: 16px;
        height: 16px;
        background: ${initialValue ? COLORS.accentColor : "#111111"};
        border: 2px solid ${initialValue ? COLORS.accentColor : "#1b3d75"};
        cursor: pointer;
        flex-shrink: 0;
        pointer-events: none;
        border-radius: 3px;
        transition: all 0.2s;
    `;
    box.setAttribute('data-checked', initialValue.toString());
    
    row.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentValue = box.getAttribute('data-checked') === 'true';
        const newValue = !currentValue;
        updateCheckbox(newValue);
        setWidgetValue(node, widgetName, newValue);
        if (row._onUserChange) {
            row._onUserChange(newValue);
        }
    });
    
    row.appendChild(labelEl);
    row.appendChild(box);
    content.appendChild(row);
    
    updateCheckbox(initialValue);
    
    return { 
        setValue: function(value) {
            updateCheckbox(value);
            setWidgetValue(node, widgetName, value);
        }, 
        getValue: () => box.getAttribute('data-checked') === 'true',
        onUserChange: function(callback) {
            row._onUserChange = callback;
        }
    };
}

function createMainContainer(node) {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: ${UI_CONFIG.sectionMargin}px;
        width: 100%;
        height: 100%;
        overflow: hidden;
        box-sizing: border-box;
        padding: 0;
        margin: 0;
        position: relative;
        font-family: monospace;
    `;
    node.addDOMWidget("rimor_main_container", "main_container", container, { serialize: false });
    return container;
}

function createSection(node, mainContainer, title, bgColor, compact = false, minHeight = 60) {
    const container = document.createElement('div');
    const pad = compact ? UI_CONFIG.sectionPaddingCompact : UI_CONFIG.sectionPaddingNormal;
    
    container.style.cssText = `
        background: ${bgColor};
        border-radius: ${UI_CONFIG.sectionBorderRadius}px;
        padding: ${pad}px;
        margin: 0;
        height: ${minHeight}px;
        min-height: ${minHeight}px;
        max-height: ${minHeight}px;
        flex-shrink: 0;
        flex-grow: 0;
        overflow: hidden;
        box-sizing: border-box;
        position: relative;
        width: 100%;
        font-family: monospace;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        color: ${COLORS.textColor};
        font-size: ${UI_CONFIG.sectionTitleFontSize}px;
        font-weight: bold;
        letter-spacing: 1px;
        margin-bottom: ${UI_CONFIG.sectionTitleMarginBottom}px;
        text-transform: uppercase;
        height: ${UI_CONFIG.sectionTitleHeight}px;
        line-height: ${UI_CONFIG.sectionTitleHeight}px;
        flex-shrink: 0;
        font-family: monospace;
    `;
    container.appendChild(titleEl);
    
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 1px;
        flex-shrink: 0;
        overflow: hidden;
        width: 100%;
    `;
    container.appendChild(contentContainer);
    container._content = contentContainer;
    
    mainContainer.appendChild(container);
    return container;
}

function createField(container, label, value, isNumber = true, min = null, max = null, step = null) {
    const content = container._content || container;
    const row = document.createElement('div');
    row.style.cssText = `
        display: flex;
        align-items: center;
        margin: 0;
        height: ${UI_CONFIG.fieldRowHeight}px;
        min-height: ${UI_CONFIG.fieldRowHeight}px;
        max-height: ${UI_CONFIG.fieldRowHeight}px;
        flex-shrink: 0;
        flex-grow: 0;
        width: 100%;
        font-family: monospace;
    `;
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
        color: ${COLORS.textColor};
        font-size: ${UI_CONFIG.fieldFontSize}px;
        min-width: ${UI_CONFIG.fieldLabelWidth}px;
        flex-shrink: 0;
        font-family: monospace;
    `;
    
    const input = document.createElement('input');
    input.type = isNumber ? 'number' : 'text';
    input.value = value;
    if (min !== null) input.min = min;
    if (max !== null) input.max = max;
    if (step !== null) input.step = step;
    input.style.cssText = `
        background: #111;
        color: ${COLORS.accentColor};
        border: 1px solid #333;
        border-radius: 0;
        padding: ${UI_CONFIG.fieldPaddingY}px ${UI_CONFIG.fieldPaddingX}px;
        font-size: ${UI_CONFIG.fieldFontSize}px;
        outline: none;
        flex: 1;
        height: ${UI_CONFIG.fieldRowHeight - 3}px;
        min-width: 40px;
        box-sizing: border-box;
        font-family: monospace;
        text-align: center;
    `;
    
    row.appendChild(labelEl);
    row.appendChild(input);
    content.appendChild(row);
    return input;
}

function createCombo(container, label, options, value) {
    const content = container._content || container;
    const row = document.createElement('div');
    row.style.cssText = `
        display: flex;
        align-items: center;
        margin: 0;
        height: ${UI_CONFIG.fieldRowHeight}px;
        min-height: ${UI_CONFIG.fieldRowHeight}px;
        max-height: ${UI_CONFIG.fieldRowHeight}px;
        flex-shrink: 0;
        flex-grow: 0;
        width: 100%;
        font-family: monospace;
    `;
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
        color: ${COLORS.textColor};
        font-size: ${UI_CONFIG.fieldFontSize}px;
        min-width: ${UI_CONFIG.fieldLabelWidth}px;
        flex-shrink: 0;
        font-family: monospace;
    `;
    
    const select = document.createElement('select');
    options.forEach(opt => {
        const optEl = document.createElement('option');
        optEl.value = opt;
        optEl.textContent = opt;
        if (opt === value) optEl.selected = true;
        select.appendChild(optEl);
    });
    select.style.cssText = `
        background: #111;
        color: ${COLORS.accentColor};
        border: 1px solid #333;
        border-radius: 0;
        padding: ${UI_CONFIG.fieldPaddingY}px ${UI_CONFIG.fieldPaddingX}px;
        font-size: ${UI_CONFIG.fieldFontSize}px;
        outline: none;
        flex: 1;
        height: ${UI_CONFIG.fieldRowHeight - 2}px;
        min-width: 40px;
        box-sizing: border-box;
        font-family: monospace;
        text-align: center;
        text-align-last: center;
    `;
    
    row.appendChild(labelEl);
    row.appendChild(select);
    content.appendChild(row);
    return select;
}

function createButton(container, text, onClick) {
    const content = container._content || container;
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
        background: ${COLORS.backgroundColor};
        color: ${COLORS.accentColor};
        border: 1px solid ${COLORS.accentColor};
        border-radius: 8;
        padding: 0px 6px;
        font-size: ${UI_CONFIG.buttonFontSize}px;
        cursor: pointer;
        margin-top: 3px;
        margin-left: auto;
        margin-right: 0;
        display: block;
        width: 30%;
        height: ${UI_CONFIG.buttonHeight}px;
        min-height: ${UI_CONFIG.buttonHeight}px;
        max-height: ${UI_CONFIG.buttonHeight}px;
        transition: all 0.2s;
        flex-shrink: 0;
        flex-grow: 0;
        box-sizing: border-box;
        font-family: monospace;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = COLORS.accentColor; btn.style.color = '#000'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = COLORS.backgroundColor; btn.style.color = COLORS.accentColor; });
    btn.addEventListener('click', onClick);
    content.appendChild(btn);
    return btn;
}

function createGraphSection(node, mainContainer) {
    const container = document.createElement('div');
    container.style.cssText = `
        background: ${COLORS.cfg};
        border-radius: ${UI_CONFIG.sectionBorderRadius}px;
        padding: ${UI_CONFIG.sectionPaddingCompact}px;
        margin: 0;
        height: ${UI_CONFIG.sectionGraphHeight}px;
        min-height: ${UI_CONFIG.sectionGraphHeight}px;
        max-height: ${UI_CONFIG.sectionGraphHeight}px;
        flex-shrink: 0;
        flex-grow: 0;
        overflow: hidden;
        box-sizing: border-box;
        position: relative;
        width: 100%;
        font-family: monospace;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = "CFG CURVE";
    titleEl.style.cssText = `
        color: ${COLORS.textColor};
        font-size: ${UI_CONFIG.sectionTitleFontSize}px;
        font-weight: bold;
        letter-spacing: 1px;
        margin-bottom: ${UI_CONFIG.sectionTitleMarginBottom}px;
        text-transform: uppercase;
        height: ${UI_CONFIG.sectionTitleHeight}px;
        line-height: ${UI_CONFIG.sectionTitleHeight}px;
        flex-shrink: 0;
        font-family: monospace;
    `;
    container.appendChild(titleEl);
    
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
        width: 100%;
        height: calc(100% - ${UI_CONFIG.sectionTitleHeight + UI_CONFIG.sectionTitleMarginBottom}px);
        background: #0a0a0a;
        border-radius: 4px;
        box-sizing: border-box;
    `;
    container.appendChild(canvas);
    
    mainContainer.appendChild(container);
    
    const graphData = {
        cfgHistory: [],
        maxPoints: 200,
    };
    
    function drawGraph() {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        
        ctx.clearRect(0, 0, W, H);
        
        if (graphData.cfgHistory.length < 2) {
            ctx.fillStyle = '#666';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CFG curve will appear here', W / 2, H / 2);
            return;
        }
        
        const values = graphData.cfgHistory;
        const minCfg = Math.min(...values);
        const maxCfg = Math.max(...values);
        const range = Math.max(maxCfg - minCfg, 0.1);
        
        const padX = 10;
        const padY = 10;
        const graphW = W - padX * 2;
        const graphH = H - padY * 2;
        
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padY + (i / 4) * graphH;
            ctx.beginPath();
            ctx.moveTo(padX, y);
            ctx.lineTo(W - padX, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = COLORS.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < values.length; i++) {
            const x = padX + (i / Math.max(graphData.maxPoints - 1, 1)) * graphW;
            const y = padY + graphH - ((values[i] - minCfg) / range) * graphH;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        ctx.fillStyle = COLORS.textColor;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Max: ${maxCfg.toFixed(2)}`, padX, padY - 2);
        ctx.fillText(`Min: ${minCfg.toFixed(2)}`, padX, H - 2);
        
        ctx.textAlign = 'right';
        ctx.fillText(`Step: ${values.length}/${graphData.maxPoints}`, W - padX, padY - 2);
    }
    
    const resizeObserver = new ResizeObserver(() => {
        drawGraph();
    });
    resizeObserver.observe(canvas);
    
    return {
        addCFGValue: (value) => {
            graphData.cfgHistory.push(parseFloat(value));
            if (graphData.cfgHistory.length > graphData.maxPoints) {
                graphData.cfgHistory.shift();
            }
            drawGraph();
        },
        clear: () => {
            graphData.cfgHistory = [];
            drawGraph();
        },
        drawGraph: drawGraph,
    };
}

// ============================================================
// РЕГИСТРАЦИЯ РАСШИРЕНИЯ
// ============================================================

app.registerExtension({
    name: EXTENSION_NAME,
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeType.comfyClass === "Rimor_CFGSculptorAdvanced") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                // Отправляем ID в Python
                this._rimorNodeId = String(this.id);
                
                requestAnimationFrame(() => {
                    const widgetIndex = this.widgets?.findIndex(w => w.name === "node_id_hidden");
                    if (widgetIndex !== undefined && widgetIndex >= 0) {
                        if (!this.widgets_values) this.widgets_values = [];
                        this.widgets_values[widgetIndex] = String(this.id);
                        
                        const widget = this.widgets[widgetIndex];
                        widget.value = String(this.id);
                        if (widget._state && typeof widget._state === 'object') {
                            widget._state.value = String(this.id);
                        }
                        console.log(`[Rimor] Set node_id_hidden = ${this.id}`);
                    }
                });
                
                if (this.widgets) {
                    for (const widget of this.widgets) {
                        if (widget.name === "preview") {
                            widget.hidden = true;
                            widget.computeSize = () => [0, -4];
                        }
                        if (["cfg_start", "cfg_end", "envelope_mode", "use_envelope",
                             "waveform", "wave_amplitude", "wave_periods", "wave_decay",
                             "hysteresis_enabled", "hysteresis_factor",
                             "snap1_enabled", "snap1_step", "snap2_enabled", "snap2_step",
                             "snap3_enabled", "snap3_step"].includes(widget.name)) {
                            widget.hidden = true;
                            widget.computeSize = () => [0, -4];
                        }
                    }
                }
                
                const originalComputeSize = this.computeSize?.bind(this);
                const minHeight = calculateNodeHeight();
                
                this.computeSize = function(width) {
                    let size;
                    if (originalComputeSize) {
                        size = originalComputeSize(width);
                    } else {
                        size = [width || this.size[0], minHeight];
                    }
                    if (size[1] < minHeight) size[1] = minHeight;
                    if (size[0] < UI_CONFIG.minWidth) size[0] = UI_CONFIG.minWidth;
                    return size;
                };
                
                if (this.size[1] < minHeight) this.size[1] = minHeight;
                if (this.size[0] < UI_CONFIG.minWidth) this.size[0] = UI_CONFIG.minWidth;
                
                const mainContainer = createMainContainer(this);
                
                // PRESET
                const presetSection = createSection(this, mainContainer, "PRESET", COLORS.preset, true, UI_CONFIG.sectionPresetHeight);
                const presetCombo = createCombo(presetSection, "Preset", Object.keys(PRESETS), getWidgetValue(this, "preset", "custom"));
                presetCombo.addEventListener('change', () => {
                    setWidgetValue(this, "preset", presetCombo.value);
                    saveSettings();
                });
                createButton(presetSection, "APPLY PRESET", () => {
                    const presetName = presetCombo.value;
                    if (presetName === "custom" || !PRESETS[presetName]) return;
                    const p = PRESETS[presetName];
                    setWidgetValue(this, "preset", presetName);
                    setWidgetValue(this, "cfg_start", p.cfg_start);
                    setWidgetValue(this, "cfg_end", p.cfg_end);
                    setWidgetValue(this, "envelope_mode", p.envelope_mode);
                    setWidgetValue(this, "use_envelope", p.use_envelope);
                    setWidgetValue(this, "waveform", p.waveform);
                    setWidgetValue(this, "wave_amplitude", p.wave_amplitude);
                    setWidgetValue(this, "wave_periods", p.wave_periods);
                    setWidgetValue(this, "wave_decay", p.wave_decay);
                    setWidgetValue(this, "hysteresis_enabled", p.hysteresis_enabled);
                    setWidgetValue(this, "hysteresis_factor", p.hysteresis_factor);
                    if (cfgStartInput) cfgStartInput.value = p.cfg_start;
                    if (cfgEndInput) cfgEndInput.value = p.cfg_end;
                    if (envelopeCombo) envelopeCombo.value = p.envelope_mode;
                    if (waveformCombo) waveformCombo.value = p.waveform;
                    if (waveAmplitudeInput) waveAmplitudeInput.value = p.wave_amplitude;
                    if (wavePeriodsInput) wavePeriodsInput.value = p.wave_periods;
                    if (waveDecayCombo) waveDecayCombo.value = p.wave_decay;
                    if (hysteresisFactorInput) hysteresisFactorInput.value = p.hysteresis_factor;
                    envelopeCheckbox?.setValue(p.use_envelope);
                    hysteresisCheckbox?.setValue(p.hysteresis_enabled);
                    saveSettings();
                    console.log(`[Rimor] Preset applied: ${presetName}`);
                });
                
                // CFG RANGE
                const cfgSection = createSection(this, mainContainer, "CFG RANGE", COLORS.cfg, true, UI_CONFIG.sectionCfgHeight);
                let cfgStartInput = createField(cfgSection, "Start", getWidgetValue(this, "cfg_start", "2.0"), true, 0, 100, 0.01);
                cfgStartInput.addEventListener('input', () => {
                    setWidgetValue(this, "cfg_start", cfgStartInput.value);
                    saveSettings();
                });
                let cfgEndInput = createField(cfgSection, "End", getWidgetValue(this, "cfg_end", "1.0"), true, 0, 100, 0.01);
                cfgEndInput.addEventListener('input', () => {
                    setWidgetValue(this, "cfg_end", cfgEndInput.value);
                    saveSettings();
                });
                
                // ENVELOPE
                const envelopeSection = createSection(this, mainContainer, "ENVELOPE", COLORS.envelope, true, UI_CONFIG.sectionEnvelopeHeight);
                let envelopeCombo = createCombo(envelopeSection, "Shape", 
                    ["linear", "sigmoid", "gaussian", "rise_fall", "fall_rise", "mid_peak", "mid_valley", "fibonacci"],
                    getWidgetValue(this, "envelope_mode", "linear"));
                envelopeCombo.addEventListener('change', () => {
                    setWidgetValue(this, "envelope_mode", envelopeCombo.value);
                    saveSettings();
                });
                const envelopeCheckbox = createCheckbox(this, envelopeSection, "Enabled", "use_envelope", true);
                
                // WAVEFORM
                const waveformSection = createSection(this, mainContainer, "WAVEFORM", COLORS.waveform, true, UI_CONFIG.sectionWaveformHeight);
                let waveformCombo = createCombo(waveformSection, "Type", ["none", "sine", "triangle", "square", "sawtooth", "fibonacci"], getWidgetValue(this, "waveform", "sine"));
                waveformCombo.addEventListener('change', () => {
                    setWidgetValue(this, "waveform", waveformCombo.value);
                    saveSettings();
                });
                let waveAmplitudeInput = createField(waveformSection, "Amp%", getWidgetValue(this, "wave_amplitude", "0.3"), true, 0, 1.0, 0.01);
                waveAmplitudeInput.addEventListener('input', () => {
                    setWidgetValue(this, "wave_amplitude", waveAmplitudeInput.value);
                    saveSettings();
                });
                let wavePeriodsInput = createField(waveformSection, "Periods", getWidgetValue(this, "wave_periods", "2.0"), true, 0.1, 20, 0.1);
                wavePeriodsInput.addEventListener('input', () => {
                    setWidgetValue(this, "wave_periods", wavePeriodsInput.value);
                    saveSettings();
                });
                let waveDecayCombo = createCombo(waveformSection, "Decay", ["none", "linear", "exp", "fibonacci"], getWidgetValue(this, "wave_decay", "linear"));
                waveDecayCombo.addEventListener('change', () => {
                    setWidgetValue(this, "wave_decay", waveDecayCombo.value);
                    saveSettings();
                });
                
                // HYSTERESIS
                const hystSection = createSection(this, mainContainer, "HYSTERESIS", COLORS.hysteresis, true, UI_CONFIG.sectionHysteresisHeight);
                const hysteresisCheckbox = createCheckbox(this, hystSection, "Enabled", "hysteresis_enabled", false);
                let hysteresisFactorInput = createField(hystSection, "Factor", getWidgetValue(this, "hysteresis_factor", "1.5"), true, 1.0, 5.0, 0.1);
                hysteresisFactorInput.addEventListener('input', () => {
                    setWidgetValue(this, "hysteresis_factor", hysteresisFactorInput.value);
                    saveSettings();
                });
                
                // SNAPSHOTS
                const snapSection = createSection(this, mainContainer, "SNAPSHOTS", COLORS.snapshots, false, UI_CONFIG.sectionSnapshotsHeight);
                const snap1Field = createField(snapSection, "Step 1", getWidgetValue(this, "snap1_step", "5"), true, 1, 100, 1);
                snap1Field.addEventListener('input', () => {
                    setWidgetValue(this, "snap1_step", snap1Field.value);
                    saveSettings();
                });
                const snap1Checkbox = createCheckbox(this, snapSection, "Enabled", "snap1_enabled", false);
                const snap2Field = createField(snapSection, "Step 2", getWidgetValue(this, "snap2_step", "10"), true, 1, 100, 1);
                snap2Field.addEventListener('input', () => {
                    setWidgetValue(this, "snap2_step", snap2Field.value);
                    saveSettings();
                });
                const snap2Checkbox = createCheckbox(this, snapSection, "Enabled", "snap2_enabled", false);
                const snap3Field = createField(snapSection, "Step 3", getWidgetValue(this, "snap3_step", "15"), true, 1, 100, 1);
                snap3Field.addEventListener('input', () => {
                    setWidgetValue(this, "snap3_step", snap3Field.value);
                    saveSettings();
                });
                const snap3Checkbox = createCheckbox(this, snapSection, "Enabled", "snap3_enabled", false);
                
                // ===== CFG GRAPH =====
                const graphWidget = createGraphSection(this, mainContainer);
                
                this._cfgGraphHandler = (value) => {
                    if (value === null) {
                        graphWidget.clear();
                    } else {
                        graphWidget.addCFGValue(value);
                    }
                };
                
                // ===== ФУНКЦИЯ СОХРАНЕНИЯ С DEBOUNCE =====
                let saveTimeout;
                const saveSettings = () => {
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        this.properties = this.properties || {};
                        this.properties.rimorSettings = {
                            preset: presetCombo.value,
                            cfg_start: cfgStartInput.value,
                            cfg_end: cfgEndInput.value,
                            envelope_mode: envelopeCombo.value,
                            use_envelope: envelopeCheckbox.getValue(),
                            waveform: waveformCombo.value,
                            wave_amplitude: waveAmplitudeInput.value,
                            wave_periods: wavePeriodsInput.value,
                            wave_decay: waveDecayCombo.value,
                            hysteresis_enabled: hysteresisCheckbox.getValue(),
                            hysteresis_factor: hysteresisFactorInput.value,
                            snap1_enabled: snap1Checkbox.getValue(),
                            snap1_step: snap1Field.value,
                            snap2_enabled: snap2Checkbox.getValue(),
                            snap2_step: snap2Field.value,
                            snap3_enabled: snap3Checkbox.getValue(),
                            snap3_step: snap3Field.value,
                        };
                        
                        if (this.graph) {
                            this.graph.change?.();
                        }
                    }, 200);
                };
                
                // ===== ВОССТАНОВЛЕНИЕ ПРИ ЗАГРУЗКЕ =====
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = () => {
                    if (originalOnConfigure) {
                        originalOnConfigure.apply(this, arguments);
                    }
                    
                    const saved = this.properties?.rimorSettings;
                    
                    if (saved) {
                        if (saved.preset) presetCombo.value = saved.preset;
                        if (saved.cfg_start) cfgStartInput.value = saved.cfg_start;
                        if (saved.cfg_end) cfgEndInput.value = saved.cfg_end;
                        if (saved.envelope_mode) envelopeCombo.value = saved.envelope_mode;
                        if (saved.use_envelope !== undefined) envelopeCheckbox.setValue(saved.use_envelope);
                        if (saved.waveform) waveformCombo.value = saved.waveform;
                        if (saved.wave_amplitude) waveAmplitudeInput.value = saved.wave_amplitude;
                        if (saved.wave_periods) wavePeriodsInput.value = saved.wave_periods;
                        if (saved.wave_decay) waveDecayCombo.value = saved.wave_decay;
                        if (saved.hysteresis_enabled !== undefined) hysteresisCheckbox.setValue(saved.hysteresis_enabled);
                        if (saved.hysteresis_factor) hysteresisFactorInput.value = saved.hysteresis_factor;
                        if (saved.snap1_enabled !== undefined) snap1Checkbox.setValue(saved.snap1_enabled);
                        if (saved.snap1_step) snap1Field.value = saved.snap1_step;
                        if (saved.snap2_enabled !== undefined) snap2Checkbox.setValue(saved.snap2_enabled);
                        if (saved.snap2_step) snap2Field.value = saved.snap2_step;
                        if (saved.snap3_enabled !== undefined) snap3Checkbox.setValue(saved.snap3_enabled);
                        if (saved.snap3_step) snap3Field.value = saved.snap3_step;
                        
                        setWidgetValue(this, "preset", saved.preset);
                        setWidgetValue(this, "cfg_start", saved.cfg_start);
                        setWidgetValue(this, "cfg_end", saved.cfg_end);
                        setWidgetValue(this, "envelope_mode", saved.envelope_mode);
                        setWidgetValue(this, "use_envelope", saved.use_envelope);
                        setWidgetValue(this, "waveform", saved.waveform);
                        setWidgetValue(this, "wave_amplitude", saved.wave_amplitude);
                        setWidgetValue(this, "wave_periods", saved.wave_periods);
                        setWidgetValue(this, "wave_decay", saved.wave_decay);
                        setWidgetValue(this, "hysteresis_enabled", saved.hysteresis_enabled);
                        setWidgetValue(this, "hysteresis_factor", saved.hysteresis_factor);
                        setWidgetValue(this, "snap1_enabled", saved.snap1_enabled);
                        setWidgetValue(this, "snap1_step", saved.snap1_step);
                        setWidgetValue(this, "snap2_enabled", saved.snap2_enabled);
                        setWidgetValue(this, "snap2_step", saved.snap2_step);
                        setWidgetValue(this, "snap3_enabled", saved.snap3_enabled);
                        setWidgetValue(this, "snap3_step", saved.snap3_step);
                    }
                };
                
                // ===== ПРИВЯЗКА СОХРАНЕНИЯ К ЧЕКБОКСАМ =====
                envelopeCheckbox.onUserChange(() => {
                    saveSettings();
                });
                
                hysteresisCheckbox.onUserChange(() => {
                    saveSettings();
                });
                
                snap1Checkbox.onUserChange(() => {
                    saveSettings();
                });
                
                snap2Checkbox.onUserChange(() => {
                    saveSettings();
                });
                
                snap3Checkbox.onUserChange(() => {
                    saveSettings();
                });
                
                // LOGO
                const logoContainer = document.createElement('div');
                logoContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 3px 6px;
                    height: ${UI_CONFIG.logoHeight}px;
                    min-height: ${UI_CONFIG.logoHeight}px;
                    max-height: ${UI_CONFIG.logoHeight}px;
                    background: linear-gradient(180deg, ${COLORS.backgroundColor}, #0a0a0a);
                    border-radius: 8px;
                    flex-shrink: 0;
                    flex-grow: 0;
                    box-sizing: border-box;
                    width: 100%;
                    font-family: monospace;
                `;
                logoContainer.innerHTML = `
                    <svg width="140" height="16" viewBox="0 0 140 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="5" stroke="${COLORS.accentColor}" stroke-width="1" opacity="0.5"/>
                        <path d="M3 8 Q5 4 8 8 T13 8" stroke="${COLORS.accentColor}" stroke-width="1.5" fill="none"/>
                        <text x="20" y="12" fill="${COLORS.accentColor}" font-size="9" font-family="monospace" font-weight="bold">CFG SCULPTOR ADV</text>
                    </svg>
                `;
                mainContainer.appendChild(logoContainer);
                
                this.onRemoved = () => {
                    this._cfgGraphHandler = null;
                };
                
                return result;
            };
        }
        
        // ===== ПРЕВЬЮ НОДА =====
        if (nodeType.comfyClass === "Rimor_PreviewNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                const node = this;
                
                const previewContainer = document.createElement('div');
                previewContainer.style.cssText = `
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${COLORS.previewBackground};
                    border-radius: 8px;
                    overflow: hidden;
                    box-sizing: border-box;
                    position: relative;
                    font-family: monospace;
                `;
                
                const previewImg = document.createElement('img');
                previewImg.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: none;
                `;
                previewContainer.appendChild(previewImg);
                
                const placeholder = document.createElement('div');
                placeholder.textContent = "Waiting for sample...";
                placeholder.style.cssText = `
                    position: absolute;
                    color: #666;
                    font-size: 14px;
                    pointer-events: none;
                    font-family: monospace;
                `;
                previewContainer.appendChild(placeholder);
                
                node.addDOMWidget(
                    "rimor_preview_display",
                    "preview_display",
                    previewContainer,
                    { serialize: false, hideOnZoom: false }
                );
                
                const handler = (data) => {
                    if (data && data.image) {
                        previewImg.src = `data:image/jpeg;base64,${data.image}`;
                        previewImg.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                };
                
                node._rimorPreviewHandler = handler;
                
                node.onRemoved = () => {
                    node._rimorPreviewHandler = null;
                };
                
                return result;
            };
        }
        
        // SimKarr Scheduler
        if (nodeType.comfyClass === "Rimor_SimKarrScheduler") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                const logoContainer = document.createElement('div');
                logoContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 3px 6px;
                    height: ${UI_CONFIG.logoHeight}px;
                    min-height: ${UI_CONFIG.logoHeight}px;
                    max-height: ${UI_CONFIG.logoHeight}px;
                    background: linear-gradient(180deg, ${COLORS.backgroundColor}, #0a0a0a);
                    border-radius: 8px;
                    margin: 2px;
                    font-family: monospace;
                `;
                logoContainer.innerHTML = `
                    <svg width="140" height="18" viewBox="0 0 140 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="9" r="6" stroke="${COLORS.accentColor}" stroke-width="1" opacity="0.5"/>
                        <path d="M4 9 Q6 5 9 9 T14 9" stroke="${COLORS.accentColor}" stroke-width="1.5" fill="none"/>
                        <text x="22" y="13" fill="${COLORS.accentColor}" font-size="9" font-family="monospace" font-weight="bold">SIMPLE + KARRAS</text>
                    </svg>
                `;
                this.addDOMWidget("rimor_logo_simkarr", "logo", logoContainer, { serialize: false });
                return result;
            };
        }
        
        // Роутеры
        if (nodeType.comfyClass === "Rimor_ModelRouter") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                setupDynamicInputs(this, { type: "MODEL", prefix: "model_" });
                return result;
            };
        }
        
        if (nodeType.comfyClass === "Rimor_ClipRouter") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                setupDynamicInputs(this, { type: "CLIP", prefix: "clip_" });
                return result;
            };
        }
        
        if (nodeType.comfyClass === "Rimor_VaeRouter") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                setupDynamicInputs(this, { type: "VAE", prefix: "vae_" });
                return result;
            };
        }
    }
});