// Application state
let appState = {
    currentTab: 'upload',
    parsedData: [],
    filteredData: [],
    currentPage: 1,
    entriesPerPage: 25,
    sortField: 'timestamp', // Default sort field
    sortDirection: 'asc',
    theme: 'light',
    selectedFile: null,
    parserConfig: {
        format: 'auto',
        delimiter: ',',
        timezone: 'UTC', // Note: Timezone conversion is not fully implemented in parsing
        dateFormat: 'YYYY-MM-DD HH:mm:ss', // Note: Custom date format parsing is not fully implemented
        customRegex: ''
    }
};

// Sample data for demonstration
const sampleData = {
    "sampleLogs": {
        "commonLogFormat": [
            "127.0.0.1 - - [10/Oct/2023:13:55:36 +0000] \"GET /index.html HTTP/1.1\" 200 2326",
            "192.168.1.100 - alice [10/Oct/2023:13:56:15 +0000] \"POST /login HTTP/1.1\" 302 0",
            "203.0.113.1 - - [10/Oct/2023:13:57:02 +0000] \"GET /images/logo.png HTTP/1.1\" 200 4523",
            "127.0.0.1 - - [10/Oct/2023:13:58:21 +0000] \"GET /api/users HTTP/1.1\" 500 1024",
            "10.0.0.15 - bob [10/Oct/2023:14:01:45 +0000] \"GET /dashboard HTTP/1.1\" 200 5678",
            "192.168.1.200 - - [10/Oct/2023:14:03:12 +0000] \"DELETE /api/files/123 HTTP/1.1\" 404 0"
        ],
        "jsonLogs": [
            {"timestamp": "2023-10-10T13:55:36Z", "ip": "127.0.0.1", "method": "GET", "url": "/index.html", "status": 200, "size": 2326, "userAgent": "Mozilla/5.0", "message": "Index page accessed"},
            {"timestamp": "2023-10-10T13:56:15Z", "ip": "192.168.1.100", "method": "POST", "url": "/login", "status": 302, "size": 0, "userAgent": "Chrome/91.0", "user": "alice", "message": "Login attempt"},
            {"timestamp": "2023-10-10T13:57:02Z", "ip": "203.0.113.1", "method": "GET", "url": "/images/logo.png", "status": 200, "size": 4523, "userAgent": "Safari/14.1", "message": "Logo requested"},
            {"timestamp": "2023-10-10T13:58:21Z", "ip": "127.0.0.1", "method": "GET", "url": "/api/users", "status": 500, "size": 1024, "userAgent": "PostmanRuntime/7.28", "error": "Internal server error"}
        ],
        "applicationLogs": [
            "[2023-10-10 13:55:36] INFO: User login successful - UserID: 12345",
            "[2023-10-10 13:56:15] ERROR: Database connection failed - Error: timeout after 30s",
            "[2023-10-10 13:57:02] WARN: High memory usage detected - 85% used",
            "[2023-10-10 13:58:21] DEBUG: Cache miss for key: user_session_abc123",
            "[2023-10-10 14:01:45] INFO: File upload completed - Size: 2.5MB",
            "[2023-10-10 14:03:12] ERROR: Invalid authentication token - User: guest"
        ]
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart !== 'undefined') {
        initializeApp();
    } else {
        setTimeout(initializeApp, 500);
    }
});

function initializeApp() {
    setupEventListeners();
    setupTheme();
    loadSampleData('commonLogFormat'); // Load sample data immediately on startup
    updateDataTable();
    updateAnalytics(); // Update analytics with sample data
}

function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    setupFileUpload();
    setupParserConfig();
    setupDataTable();
    setupAnalytics();
    setupExport();
}

function setupTheme() {
    setTheme(appState.theme); // Use initial state or could use localStorage
}

function toggleTheme() {
    const newTheme = appState.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    appState.theme = theme;
    document.documentElement.setAttribute('data-color-scheme', theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
    // If charts exist, update their options for the new theme
    if (window.timelineChart) updateTimelineChart();
    if (window.statusChart) updateStatusChart();
    if (window.urlChart) updateUrlChart();
    if (window.methodChart) updateMethodChart();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetButton) targetButton.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) targetTab.classList.add('active');
    
    appState.currentTab = tabName;
    
    if (tabName === 'analytics') {
        setTimeout(() => {
            updateAnalytics(); // Ensure analytics are updated when tab is shown
        }, 100);
    }
}

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileButton = document.getElementById('fileButton');
    
    if (fileButton && fileInput && uploadArea) {
        fileButton.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('.upload-content')) {
                 fileInput.click();
            }
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }
    
    const parseButton = document.getElementById('parseButton');
    if (parseButton) {
        parseButton.addEventListener('click', parseLogFile);
    }
}

function handleFileSelect(file) {
    appState.selectedFile = file;
    showUploadProgress();
    
    setTimeout(() => {
        hideUploadProgress();
        showFilePreview(file);
    }, 1500); // Simulate upload
}

function showUploadProgress() {
    const uploadProgress = document.getElementById('uploadProgress');
    if (uploadProgress) {
        uploadProgress.classList.remove('hidden');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressText) progressText.textContent = `Uploading... ${Math.round(progress)}%`;
        }, 100);
    }
}

function hideUploadProgress() {
    const uploadProgress = document.getElementById('uploadProgress');
    if (uploadProgress) uploadProgress.classList.add('hidden');
}

function showFilePreview(file) {
    const preview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const formatDetectedEl = document.getElementById('formatDetected'); // Renamed for clarity
    const previewContent = document.getElementById('previewContent');
    
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    
    const detectedFormat = detectFileFormat(file);
    if (formatDetectedEl) {
        formatDetectedEl.textContent = detectedFormat.displayName;
        formatDetectedEl.className = `status status--info`; // Use a generic info status
        // Automatically set the parser config format based on detection
        const logFormatSelect = document.getElementById('logFormat');
        if (logFormatSelect) {
            logFormatSelect.value = detectedFormat.value;
            // Trigger change event to update preview rules
            logFormatSelect.dispatchEvent(new Event('change'));
        }
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const lines = content.split('\n').slice(0, 10); // Show first 10 lines
        if (previewContent) previewContent.textContent = lines.join('\n');
    };
    reader.readAsText(file);
    
    if (preview) preview.classList.remove('hidden');
}

function detectFileFormat(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    switch (extension) {
        case 'json': return { displayName: 'JSON Format', value: 'json' };
        case 'csv': return { displayName: 'CSV Format', value: 'csv' };
        case 'log': return { displayName: 'Generic Log Format', value: 'clf' }; // Default to CLF for .log
        case 'txt': return { displayName: 'Text Format (Try CLF or App)', value: 'auto' };
        default: return { displayName: 'Unknown Format', value: 'auto' };
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function setupParserConfig() {
    const logFormat = document.getElementById('logFormat');
    const customRegexGroup = document.querySelector('.custom-regex-group');
    
    if (logFormat) {
        logFormat.addEventListener('change', (e) => {
            const format = e.target.value;
            appState.parserConfig.format = format;
            
            if (customRegexGroup) {
                customRegexGroup.classList.toggle('hidden', format !== 'custom');
            }
            updateParsingRulesPreview(format);
        });
    }
    
    const applyConfig = document.getElementById('applyConfig');
    if (applyConfig) {
        applyConfig.addEventListener('click', applyParserConfig);
    }
    updateParsingRulesPreview(appState.parserConfig.format); // Initialize with current state
}

function updateParsingRulesPreview(format) {
    const previewRules = document.getElementById('previewRules');
    if (previewRules) {
        previewRules.textContent = getParsingRules(format);
    }
}

function getParsingRules(format) {
    const rules = {
        'auto': 'Automatically detect log format. Tries JSON, then CLF, then falls back.',
        'clf': 'Common Log Format:\nIP IDENT AUTHUSER [TIMESTAMP] "METHOD URL PROTOCOL" STATUS SIZE',
        'combined': 'Combined Log Format (Extends CLF):\n... "REFERER" "USER_AGENT" (Note: Not fully implemented, uses CLF parser)',
        'json': 'Line-delimited JSON. Expects fields like "timestamp", "ip", "message", "status", etc.',
        'csv': 'Comma-separated values. Configure delimiter. Assumes first line might be headers.',
        'app': 'Application logs (Example):\n[TIMESTAMP] LEVEL: MESSAGE',
        'custom': 'User-defined regex pattern. Use named capture groups for best results (e.g., ?<ip>\\S+).'
    };
    return rules[format] || 'Unknown format selected.';
}

function applyParserConfig() {
    const logFormat = document.getElementById('logFormat');
    const delimiter = document.getElementById('delimiter');
    const timezone = document.getElementById('timezone');
    const dateFormat = document.getElementById('dateFormat');
    const customRegex = document.getElementById('customRegex');
    
    if (logFormat) appState.parserConfig.format = logFormat.value;
    if (delimiter) appState.parserConfig.delimiter = delimiter.value;
    if (timezone) appState.parserConfig.timezone = timezone.value;
    if (dateFormat) appState.parserConfig.dateFormat = dateFormat.value;
    if (customRegex) appState.parserConfig.customRegex = customRegex.value;
    
    alert('Parser configuration applied successfully!');
    // If data is already loaded, user might expect re-parsing.
    // Consider adding a button "Re-parse with new config" or doing it automatically.
    if (appState.parsedData.length > 0 && appState.selectedFile) {
        // Optional: Automatically re-parse if a file was already processed.
        // parseLogFile(); 
        alert("Configuration applied. If you've already parsed a file, parse it again to see changes.");
    }
}

// --- PARSING LOGIC ---

function parseCLFTimestampToISO(clfTimestamp) {
    if (!clfTimestamp) return new Date().toISOString();
    // Try to parse directly first, in case it's already a valid format
    let date = new Date(clfTimestamp);
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }

    // CLF specific parsing: e.g., 10/Oct/2023:13:55:36 +0000
    const monthMap = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const clfRegex = /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}:\d{2}:\d{2})\s*([+-]\d{4})/;
    const match = clfTimestamp.match(clfRegex);

    if (match) {
        const day = match[1];
        const monthStr = match[2];
        const year = match[3];
        const time = match[4];
        const offset = match[5];
        const month = monthMap[monthStr];

        if (month) {
            // Construct ISO-like string for Date constructor
            const isoLikeString = `${year}-${month}-${day}T${time}${offset}`;
            date = new Date(isoLikeString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }
    }
    // Fallback if all parsing fails
    console.warn(`Could not parse timestamp: ${clfTimestamp}. Using current time.`);
    return new Date().toISOString();
}

function parseCommonLogFormat(logLine, index) {
    // Regex for CLF, allows for missing protocol in request
    const regex = /^(\S+) (\S+) (\S+) \[([^\]]+)\] "(\S+)\s*(\S*)\s*([^"]*)?" (\d{3}) (\d+|-)/;
    const match = logLine.match(regex);
    
    if (match) {
        return {
            id: index,
            timestamp: parseCLFTimestampToISO(match[4]),
            ip: match[1],
            ident: match[2] === '-' ? null : match[2],
            user: match[3] === '-' ? null : match[3],
            method: match[5],
            url: match[6] || '/',
            protocol: match[7] || 'HTTP/1.0',
            status: parseInt(match[8]),
            size: match[9] === '-' ? 0 : parseInt(match[9]),
            originalLine: logLine
        };
    }
    return { id: index, originalLine: logLine, error: 'CLF regex mismatch', timestamp: new Date().toISOString(), message: logLine };
}

function parseJSONLogLine(logLine, index) {
    try {
        const parsed = JSON.parse(logLine);
        let timestamp = parsed.timestamp || parsed.time || parsed.Timestamp || parsed.Date;
        if (timestamp) {
            const dateObj = new Date(timestamp);
            timestamp = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
        } else {
            timestamp = new Date().toISOString();
        }

        return {
            id: index,
            timestamp: timestamp,
            ip: parsed.ip || parsed.clientIp,
            user: parsed.user || parsed.userId,
            method: parsed.method,
            url: parsed.url || parsed.path,
            status: parsed.status ? parseInt(parsed.status) : (parsed.statusCode ? parseInt(parsed.statusCode) : null),
            size: parsed.size ? parseInt(parsed.size) : (parsed.contentLength ? parseInt(parsed.contentLength) : null),
            level: parsed.level || parsed.severity,
            message: parsed.message || parsed.msg || JSON.stringify(parsed), // Fallback to full stringify
            ...parsed, // Spread other fields
            originalLine: logLine
        };
    } catch (e) {
        return { id: index, originalLine: logLine, error: `JSON parse error: ${e.message}`, timestamp: new Date().toISOString(), message: logLine };
    }
}

function parseApplicationLogLine(logLine, index) {
    // Example: [2023-10-10 13:55:36] INFO: User login successful - UserID: 12345
    // More flexible regex: captures timestamp in brackets, level, and the rest as message.
    const regex = /^\[([^\]]+)\]\s*([A-Z]+)\s*:\s*(.*)/i; // Case-insensitive for level
    const match = logLine.match(regex);
    if (match) {
        let timestamp = match[1];
        const dateObj = new Date(timestamp); // Try to parse timestamp
        timestamp = isNaN(dateObj.getTime()) ? parseCLFTimestampToISO(timestamp) : dateObj.toISOString();


        return {
            id: index,
            timestamp: timestamp,
            level: match[2].toUpperCase(),
            message: match[3].trim(),
            originalLine: logLine
        };
    }
    return { id: index, originalLine: logLine, error: 'App log regex mismatch', timestamp: new Date().toISOString(), message: logLine };
}

function parseCSVLogLine(logLine, index, delimiter = ',', headers = []) {
    try {
        // Basic CSV split, doesn't handle quotes/escaped delimiters well.
        const values = logLine.split(delimiter).map(v => v.trim());
        let entry = { id: index, originalLine: logLine, timestamp: new Date().toISOString() };

        if (headers.length > 0 && headers.length === values.length) {
            headers.forEach((header, i) => {
                entry[header.trim().toLowerCase().replace(/\s+/g, '_')] = values[i]; // Normalize header names
            });
            // Attempt to find common fields after mapping
            let tsField = entry.timestamp || entry.time || entry.date;
            if (tsField) {
                 const dateObj = new Date(tsField);
                 entry.timestamp = isNaN(dateObj.getTime()) ? parseCLFTimestampToISO(tsField) : dateObj.toISOString();
            }
            entry.ip = entry.ip || entry.ip_address || entry.client_ip;
            entry.status = entry.status ? parseInt(entry.status) : (entry.status_code ? parseInt(entry.status_code) : null);
            entry.size = entry.size ? parseInt(entry.size) : (entry.response_size ? parseInt(entry.response_size) : null);
            entry.message = entry.message || entry.description || logLine;
        } else {
            // If no headers or mismatch, store as generic fields or just the message
            entry.message = logLine;
            values.forEach((val, i) => entry[`field_${i+1}`] = val);
        }
        return entry;
    } catch (e) {
        return { id: index, originalLine: logLine, error: `CSV parse error: ${e.message}`, timestamp: new Date().toISOString(), message: logLine };
    }
}

function parseCustomRegexLogLine(logLine, index, customRegexStr) {
    if (!customRegexStr) {
        return { id: index, originalLine: logLine, error: 'Custom regex not provided', timestamp: new Date().toISOString(), message: logLine };
    }
    try {
        const regex = new RegExp(customRegexStr);
        const match = logLine.match(regex);
        if (match) {
            const entry = { id: index, originalLine: logLine, timestamp: new Date().toISOString() };
            if (match.groups) { // Named capture groups
                for (const key in match.groups) {
                    entry[key] = match.groups[key];
                }
                let tsField = entry.timestamp || entry.time || entry.date;
                if (tsField) {
                    const dateObj = new Date(tsField);
                    entry.timestamp = isNaN(dateObj.getTime()) ? parseCLFTimestampToISO(tsField) : dateObj.toISOString();
                }
            } else { // Numbered groups
                match.forEach((val, i) => {
                    if (i > 0) entry[`group${i}`] = val;
                });
                 let tsField = entry.group1; // Default to group1 for timestamp if no named group
                 if (tsField) {
                    const dateObj = new Date(tsField);
                    entry.timestamp = isNaN(dateObj.getTime()) ? parseCLFTimestampToISO(tsField) : dateObj.toISOString();
                 }
            }
            // Ensure some message field exists
            if (!entry.message && !entry.msg) {
                entry.message = logLine;
            }
            return entry;
        }
        return { id: index, originalLine: logLine, error: 'Custom regex mismatch', timestamp: new Date().toISOString(), message: logLine };
    } catch (e) {
        return { id: index, originalLine: logLine, error: `Custom regex error: ${e.message}`, timestamp: new Date().toISOString(), message: logLine };
    }
}


function processFileContent(content, config) {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    let parsedEntries = [];
    let effectiveFormat = config.format;

    if (effectiveFormat === 'auto' && lines.length > 0) {
        // Try JSON first (all lines must be valid JSON)
        if (lines.every(line => { try { JSON.parse(line); return true; } catch { return false; } })) {
            effectiveFormat = 'json';
        } else {
            // Try CLF (first line matches CLF pattern)
            const clfRegex = /^(\S+) (\S+) (\S+) \[([^\]]+)\] "(\S+)\s*(\S*)\s*([^"]*)?" (\d{3}) (\d+|-)/;
            if (clfRegex.test(lines[0])) {
                effectiveFormat = 'clf';
            } else {
                // Try App Log (first line matches app log pattern)
                const appLogRegex = /^\[([^\]]+)\]\s*([A-Z]+)\s*:\s*(.*)/i;
                if (appLogRegex.test(lines[0])) {
                    effectiveFormat = 'app';
                } else {
                     // Fallback: could try CSV or assume simple lines
                    effectiveFormat = 'clf'; // Default fallback if no strong match
                    console.warn("Auto-detection couldn't determine a specific format, falling back to CLF-like parsing or raw lines.");
                }
            }
        }
        console.log(`Auto-detected format as: ${effectiveFormat}`);
    }

    let csvHeaders = [];
    if (effectiveFormat === 'csv' && lines.length > 0) {
        // Rudimentary header detection: if the first line doesn't parse as a typical data line for other formats
        // For now, assume first line IS headers for CSV. This should be a user option.
        csvHeaders = lines[0].split(config.delimiter).map(h => h.trim());
        // A better CSV would allow user to specify if headers exist or not.
        // lines.shift(); // If first line is strictly header and not data.
    }

    parsedEntries = lines.map((line, index) => {
        let entry;
        switch (effectiveFormat) {
            case 'clf':
            case 'combined': // Use CLF parser for combined for now
                entry = parseCommonLogFormat(line, index + 1);
                break;
            case 'json':
                entry = parseJSONLogLine(line, index + 1);
                break;
            case 'app':
                entry = parseApplicationLogLine(line, index + 1);
                break;
            case 'csv':
                entry = parseCSVLogLine(line, index + 1, config.delimiter, csvHeaders);
                break;
            case 'custom':
                entry = parseCustomRegexLogLine(line, index + 1, config.customRegex);
                break;
            default:
                entry = { id: index + 1, originalLine: line, message: line, timestamp: new Date().toISOString(), error: 'Unknown or unhandled format' };
        }
        // Ensure essential fields for display, even if parsing partially failed
        entry.timestamp = entry.timestamp || new Date().toISOString();
        entry.message = entry.message || entry.originalLine;
        return entry;
    });

    appState.parsedData = parsedEntries;
    appState.filteredData = [...appState.parsedData];
    appState.currentPage = 1; // Reset to first page

    updateDataTable();
    updateAnalytics();
    switchTab('data');
    alert(`Log file processed using ${effectiveFormat} format! Displaying data.`);
}


function loadSampleData(sampleType = 'commonLogFormat') {
    let sampleLogsRaw = [];
    let parserFn;
    let tempConfig = { ...appState.parserConfig }; // Use current config for samples

    switch(sampleType) {
        case 'jsonLogs':
            sampleLogsRaw = sampleData.sampleLogs.jsonLogs.map(log => JSON.stringify(log));
            parserFn = (log, index) => parseJSONLogLine(log, index +1);
            tempConfig.format = 'json';
            break;
        case 'applicationLogs':
            sampleLogsRaw = sampleData.sampleLogs.applicationLogs;
            parserFn = (log, index) => parseApplicationLogLine(log, index + 1);
            tempConfig.format = 'app';
            break;
        case 'commonLogFormat':
        default:
            sampleLogsRaw = sampleData.sampleLogs.commonLogFormat;
            parserFn = (log, index) => parseCommonLogFormat(log, index + 1);
            tempConfig.format = 'clf';
            break;
    }
    
    appState.parserConfig.format = tempConfig.format; // Update global config to reflect sample type
    document.getElementById('logFormat').value = tempConfig.format; // Sync dropdown
    updateParsingRulesPreview(tempConfig.format);


    appState.parsedData = sampleLogsRaw.map((log, index) => {
        const entry = parserFn(log, index);
        entry.timestamp = entry.timestamp || new Date().toISOString();
        entry.message = entry.message || entry.originalLine;
        return entry;
    });
    appState.filteredData = [...appState.parsedData];
    appState.currentPage = 1;
    console.log("Sample data loaded:", appState.parsedData);
}

function parseLogFile() {
    if (!appState.selectedFile) {
        loadSampleData(appState.parserConfig.format === 'auto' ? 'commonLogFormat' : appState.parserConfig.format); // Load sample based on current config or default
        updateDataTable();
        updateAnalytics();
        switchTab('data');
        alert('No file selected. Sample log data loaded for demonstration!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const fileContent = event.target.result;
        try {
            processFileContent(fileContent, appState.parserConfig);
        } catch (error) {
            console.error("Error processing file:", error);
            alert(`Error processing file: ${error.message}. Check console for details.`);
            appState.parsedData = [];
            appState.filteredData = [];
            updateDataTable();
            updateAnalytics();
        }
    };
    reader.onerror = function(error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please try again.");
    };
    reader.readAsText(appState.selectedFile);
}


function setupDataTable() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterData(e.target.value);
        });
    }
    
    const entriesPerPageSelect = document.getElementById('entriesPerPage');
    if (entriesPerPageSelect) {
        entriesPerPageSelect.addEventListener('change', (e) => {
            appState.entriesPerPage = parseInt(e.target.value);
            appState.currentPage = 1;
            updateDataTable();
        });
    }
    
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (appState.currentPage > 1) {
                appState.currentPage--;
                updateDataTable();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(appState.filteredData.length / appState.entriesPerPage);
            if (appState.currentPage < totalPages) {
                appState.currentPage++;
                updateDataTable();
            }
        });
    }
    // Column sorting will be handled by dynamically created headers in updateDataTable
}

function filterData(searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
        appState.filteredData = [...appState.parsedData];
    } else {
        appState.filteredData = appState.parsedData.filter(entry => 
            Object.values(entry).some(value => 
                String(value).toLowerCase().includes(lowerSearchTerm)
            )
        );
    }
    appState.currentPage = 1;
    updateDataTable();
}

function sortData() {
    if (!appState.sortField) return; // No field to sort by

    appState.filteredData.sort((a, b) => {
        let aVal = a[appState.sortField];
        let bVal = b[appState.sortField];

        // Handle undefined or null values by pushing them to the end
        if (aVal == null && bVal != null) return 1;
        if (aVal != null && bVal == null) return -1;
        if (aVal == null && bVal == null) return 0;


        // Attempt numeric sort for fields that look like numbers or are numbers
        const numA = parseFloat(aVal);
        const numB = parseFloat(bVal);

        if (!isNaN(numA) && !isNaN(numB) && (typeof aVal !== 'string' || typeof bVal !== 'string' || (aVal.match(/^\d+(\.\d+)?$/) && bVal.match(/^\d+(\.\d+)?$/)) ) ) {
             aVal = numA;
             bVal = numB;
        } else { // String comparison (case-insensitive)
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }
        
        if (aVal < bVal) return appState.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return appState.sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}


function updateDataTable() {
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    const paginationInfo = document.getElementById('paginationInfo');
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');

    if (!tableBody || !tableHeader) {
        console.error("Table body or header not found!");
        return;
    }

    tableBody.innerHTML = '';
    tableHeader.innerHTML = ''; // Clear existing headers

    if (appState.filteredData.length === 0) {
        const colspan = tableHeader.children.length || 6; // Use existing or default
        tableBody.innerHTML = `<tr class="no-data"><td colspan="${colspan}">No data available. Upload a file or load sample data.</td></tr>`;
        // Add default headers if no data and no headers exist
        if (tableHeader.children.length === 0) {
            const defaultHeadersText = ['Timestamp', 'IP Address', 'Method', 'URL', 'Status', 'Size'];
            defaultHeadersText.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                const sortIcon = document.createElement('span');
                sortIcon.className = 'sort-icon';
                sortIcon.textContent = '↕';
                th.appendChild(sortIcon);
                tableHeader.appendChild(th);
            });
        }
        if (paginationInfo) paginationInfo.textContent = 'Showing 0 of 0 entries';
        if (pageNumbersContainer) pageNumbersContainer.innerHTML = '';
        if (prevButton) prevButton.disabled = true;
        if (nextButton) nextButton.disabled = true;
        return;
    }
    
    sortData(); // Apply sorting before rendering

    // Determine headers from the first data entry
    const sampleEntry = appState.filteredData[0];
    let headers = Object.keys(sampleEntry);
    const preferredHeaderOrder = ['id', 'timestamp', 'level', 'ip', 'user', 'method', 'url', 'status', 'size', 'message', 'originalLine', 'error', 'ident', 'protocol'];
    headers.sort((a, b) => {
        let posA = preferredHeaderOrder.indexOf(a);
        let posB = preferredHeaderOrder.indexOf(b);
        if (posA === -1) posA = Infinity;
        if (posB === -1) posB = Infinity;
        if (posA === posB) return a.localeCompare(b);
        return posA - posB;
    });
    headers = headers.filter(header => typeof sampleEntry[header] !== 'object' || sampleEntry[header] === null); // Exclude complex objects for now

    headers.forEach(headerKey => {
        const th = document.createElement('th');
        th.dataset.sort = headerKey;
        th.textContent = headerKey.charAt(0).toUpperCase() + headerKey.slice(1).replace(/_/g, ' '); // Capitalize and replace underscores
        const sortIcon = document.createElement('span');
        sortIcon.className = 'sort-icon';
        th.appendChild(sortIcon);

        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (appState.sortField === field) {
                appState.sortDirection = appState.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                appState.sortField = field;
                appState.sortDirection = 'asc';
            }
            // sortData(); // sortData is now called at the beginning of updateDataTable
            updateDataTable();
        });
        tableHeader.appendChild(th);
    });

    const totalEntries = appState.filteredData.length;
    const totalPages = Math.ceil(totalEntries / appState.entriesPerPage);
    appState.currentPage = Math.max(1, Math.min(appState.currentPage, totalPages)); // Ensure currentPage is valid
    const startIndex = (appState.currentPage - 1) * appState.entriesPerPage;
    const endIndex = Math.min(startIndex + appState.entriesPerPage, totalEntries);
    
    const pageData = appState.filteredData.slice(startIndex, endIndex);
    pageData.forEach(entry => {
        const row = document.createElement('tr');
        headers.forEach(headerKey => {
            const td = document.createElement('td');
            let value = entry[headerKey];
            if (value === null || value === undefined) value = '-';
            
            if (headerKey === 'status' && value !== '-') {
                td.innerHTML = `<span class="status-${value}">${value}</span>`;
            } else if (headerKey === 'method' && value !== '-') {
                td.innerHTML = `<span class="method-${String(value).toUpperCase()}">${String(value).toUpperCase()}</span>`;
            } else if (headerKey === 'size' && typeof value === 'number') {
                td.textContent = formatBytes(value);
            } else if (headerKey === 'timestamp' && value !== '-') {
                try {
                    td.textContent = new Date(value).toLocaleString();
                } catch (e) {
                    td.textContent = value; // Show raw if not parsable
                }
            }
             else {
                td.textContent = value;
            }
            // Truncate long messages/URLs if needed
            if ((headerKey === 'message' || headerKey === 'url' || headerKey === 'originalLine') && String(value).length > 100) {
                td.textContent = String(value).substring(0, 100) + '...';
                td.title = value; // Show full value on hover
            }
            row.appendChild(td);
        });
        tableBody.appendChild(row);
    });

    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${totalEntries > 0 ? startIndex + 1 : 0} to ${endIndex} of ${totalEntries} entries`;
    }
    if (prevButton) prevButton.disabled = appState.currentPage === 1 || totalEntries === 0;
    if (nextButton) nextButton.disabled = appState.currentPage === totalPages || totalEntries === 0;

    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';
        const maxPageButtons = 5;
        let startPage = Math.max(1, appState.currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
        if (totalPages > maxPageButtons && endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            if (i > totalPages) break; // Should not happen with current logic but good check
            const pageBtn = document.createElement('span');
            pageBtn.className = `page-number ${i === appState.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                appState.currentPage = i;
                updateDataTable();
            });
            pageNumbersContainer.appendChild(pageBtn);
        }
    }

    document.querySelectorAll('[data-sort]').forEach(headerCell => {
        headerCell.classList.remove('sorted');
        const icon = headerCell.querySelector('.sort-icon');
        if (icon) {
            if (headerCell.dataset.sort === appState.sortField) {
                headerCell.classList.add('sorted');
                icon.textContent = appState.sortDirection === 'asc' ? '↑' : '↓';
            } else {
                icon.textContent = '↕';
            }
        }
    });
}

function formatBytes(bytes) {
    if (bytes === 0 || !bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function setupAnalytics() {
    // Analytics are updated when tab is switched or data changes
}

function updateAnalytics() {
    if (appState.parsedData.length === 0 && appState.selectedFile === null) {
        // If no file ever selected and parsed data is empty, load sample to show something
        // loadSampleData(); // This might be too aggressive, let user parse first.
    }
    updateStatCards();
    updateCharts();
}

function updateStatCards() {
    const dataForStats = appState.parsedData.filter(entry => entry && entry.timestamp);

    const totalEntriesEl = document.getElementById('totalEntries');
    if (totalEntriesEl) totalEntriesEl.textContent = appState.parsedData.length;

    const dateRangeEl = document.getElementById('dateRange');
    const uniqueIPsEl = document.getElementById('uniqueIPs');
    const errorRateEl = document.getElementById('errorRate');

    if (dataForStats.length === 0) {
        if (dateRangeEl) dateRangeEl.textContent = '-';
        if (uniqueIPsEl) uniqueIPsEl.textContent = '0';
        if (errorRateEl) errorRateEl.textContent = '0%';
        return;
    }
    
    const timestamps = dataForStats.map(entry => new Date(entry.timestamp).getTime()).filter(ts => !isNaN(ts));
    if (timestamps.length > 0) {
        const minDate = new Date(Math.min(...timestamps));
        const maxDate = new Date(Math.max(...timestamps));
        if (dateRangeEl) dateRangeEl.textContent = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
    } else {
        if (dateRangeEl) dateRangeEl.textContent = 'N/A';
    }
    
    const uniqueIPs = new Set(dataForStats.map(entry => entry.ip).filter(ip => ip));
    if (uniqueIPsEl) uniqueIPsEl.textContent = uniqueIPs.size;
    
    const errorCount = dataForStats.filter(entry => entry.status && parseInt(entry.status) >= 400).length;
    const errorRate = dataForStats.length > 0 ? ((errorCount / dataForStats.length) * 100).toFixed(1) : 0;
    if (errorRateEl) errorRateEl.textContent = errorRate + '%';
}

function updateCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    // Ensure data is valid before trying to render charts
    const validData = appState.parsedData.filter(entry => entry && entry.timestamp && !isNaN(new Date(entry.timestamp).getTime()));
    if (validData.length === 0) {
         // Optionally clear charts or show "no data" message
        if (window.timelineChart) window.timelineChart.destroy();
        if (window.statusChart) window.statusChart.destroy();
        if (window.urlChart) window.urlChart.destroy();
        if (window.methodChart) window.methodChart.destroy();
        // Could display a message in canvas containers
        return;
    }
    
    updateTimelineChart(validData);
    updateStatusChart(validData);
    updateUrlChart(validData);
    updateMethodChart(validData);
}

function getChartOptions() {
    const isDarkMode = appState.theme === 'dark';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#f5f5f5' : '#333';

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: textColor }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: textColor }
            },
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor }
            }
        }
    };
}


function updateTimelineChart(dataToChart) {
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.timelineChart) window.timelineChart.destroy();
    
    const hourlyData = {};
    dataToChart.forEach(entry => {
        const hour = new Date(entry.timestamp).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    
    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const data = labels.map(label => hourlyData[parseInt(label.split(':')[0])] || 0);
    
    window.timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Log Entries per Hour',
                data: data,
                borderColor: '#1FB8CD',
                backgroundColor: 'rgba(31, 184, 205, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: getChartOptions()
    });
}

function updateStatusChart(dataToChart) {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.statusChart) window.statusChart.destroy();
    
    const statusCounts = {};
    dataToChart.forEach(entry => {
        if (entry.status) {
            statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
        }
    });
    
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    const chartColors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#A8DADC', '#F19A9B'];

    window.statusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map((_, i) => chartColors[i % chartColors.length])
            }]
        },
        options: getChartOptions()
    });
}

function updateUrlChart(dataToChart) {
    const canvas = document.getElementById('urlChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.urlChart) window.urlChart.destroy();
    
    const urlCounts = {};
    dataToChart.forEach(entry => {
        if (entry.url) {
            urlCounts[entry.url] = (urlCounts[entry.url] || 0) + 1;
        }
    });
    
    const sortedUrls = Object.entries(urlCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 7); // Show top 7
    
    const labels = sortedUrls.map(([url]) => url.length > 30 ? url.substring(0,27) + '...' : url);
    const data = sortedUrls.map(([, count]) => count);
    
    let chartOptions = getChartOptions();
    chartOptions.plugins.legend = { display: false };


    window.urlChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Requests',
                data: data,
                backgroundColor: '#1FB8CD'
            }]
        },
        options: chartOptions
    });
}

function updateMethodChart(dataToChart) {
    const canvas = document.getElementById('methodChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.methodChart) window.methodChart.destroy();
    
    const methodCounts = {};
    dataToChart.forEach(entry => {
        if (entry.method) {
            const method = String(entry.method).toUpperCase();
            methodCounts[method] = (methodCounts[method] || 0) + 1;
        }
    });
    
    const labels = Object.keys(methodCounts);
    const data = Object.values(methodCounts);
    const chartColors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#A8DADC'];
    
    window.methodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map((_, i) => chartColors[i % chartColors.length])
            }]
        },
        options: getChartOptions()
    });
}

function setupExport() {
    const exportButton = document.getElementById('exportButton');
    const previewExportButton = document.getElementById('previewExport'); // Corrected ID
    
    if (exportButton) exportButton.addEventListener('click', exportData);
    if (previewExportButton) previewExportButton.addEventListener('click', previewExportData);
}

function previewExportData() {
    const dataToExport = generateExportData();
    const previewContainer = document.getElementById('exportPreview'); // Corrected ID
    const contentElement = document.getElementById('exportContent');
    
    if (contentElement) contentElement.textContent = JSON.stringify(dataToExport, null, 2);
    if (previewContainer) previewContainer.classList.remove('hidden');
}

function exportData() {
    if (appState.parsedData.length === 0 && appState.selectedFile === null) {
        loadSampleData(); // Ensure we have data to export if nothing else was done
    }
    
    const format = document.getElementById('exportFormat')?.value || 'json';
    const dataToExport = generateExportData(); // This now considers date range
    
    if (dataToExport.length === 0) {
        alert("No data to export. Check filters or date range.");
        return;
    }

    let content, filename, mimeType;
    
    switch (format) {
        case 'json':
            content = JSON.stringify(dataToExport, null, 2);
            filename = 'log_export.json';
            mimeType = 'application/json';
            break;
        case 'csv':
            content = convertToCSV(dataToExport);
            filename = 'log_export.csv';
            mimeType = 'text/csv';
            break;
        case 'txt':
            content = generateTextReport(dataToExport);
            filename = 'log_report.txt';
            mimeType = 'text/plain';
            break;
        default:
            alert("Invalid export format selected.");
            return;
    }
    
    downloadFile(content, filename, mimeType);
}

function generateExportData() {
    const selectedFields = Array.from(document.querySelectorAll('.field-checkboxes input:checked'))
        .map(checkbox => checkbox.value);
    
    let dataToFilter = [...appState.filteredData]; // Start with currently filtered data

    // Date range filtering for export
    const startDateInput = document.getElementById('exportStartDate').value;
    const endDateInput = document.getElementById('exportEndDate').value;

    if (startDateInput) {
        const startDate = new Date(startDateInput);
        startDate.setHours(0,0,0,0); // Start of the day
        dataToFilter = dataToFilter.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= startDate;
        });
    }
    if (endDateInput) {
        const endDate = new Date(endDateInput);
        endDate.setHours(23,59,59,999); // End of the day
        dataToFilter = dataToFilter.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate <= endDate;
        });
    }

    if (selectedFields.length === 0) {
        return dataToFilter; // Export all fields of the (date-filtered) data
    }
    
    return dataToFilter.map(entry => {
        const exportEntry = {};
        selectedFields.forEach(field => {
            if (entry.hasOwnProperty(field)) {
                exportEntry[field] = entry[field];
            } else {
                exportEntry[field] = null; // Add field as null if not present in entry
            }
        });
        return exportEntry;
    });
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
        headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) return '';
            value = String(value);
            // Escape quotes and handle commas within fields
            if (value.includes('"') || value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
}

function generateTextReport(data) {
    const report = [];
    report.push('Log Analysis Report');
    report.push('='.repeat(50));
    report.push(`Generated: ${new Date().toLocaleString()}`);
    report.push(`Total Entries in Report: ${data.length}`);
    report.push('');
    
    data.forEach((entry, index) => {
        report.push(`Entry ${index + 1}:`);
        Object.entries(entry).forEach(([key, value]) => {
            report.push(`  ${String(key).padEnd(15)}: ${value}`);
        });
        report.push('');
    });
    
    return report.join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
