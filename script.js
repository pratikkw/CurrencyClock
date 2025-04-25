let purchasingPowerChart;
let graphCount = 0;
let isAddGraphMode = false; // track if we're adding a graph
let originalAmount = null; // store the amount from the first calculation
let originalFutureYear = null; // store the years value from the first calculation
let resultsCount = 0; // track result rows
let currentCurrency = '₹'; // track current currency symbol
const colors = ['#52B788', '#3B82F6', '#F97316']; // Green, Blue, Orange for graphs

// Set main content height based on viewport
function setMainContentHeight() {
    const header = document.querySelector('.header');
    const mainContent = document.querySelector('.main-content');
    const viewportHeight = window.innerHeight;
    const headerHeight = header.offsetHeight;
    
    mainContent.style.minHeight = `${viewportHeight - headerHeight}px`;
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Hide reset/add graph button group initially
    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.style.display = 'none';

    // Add click event listeners for logo and app-title
    const logo = document.querySelector('.logo');
    const appTitle = document.querySelector('.app-title');
    
    logo.addEventListener('click', () => {
        window.location.reload();
    });
    
    appTitle.addEventListener('click', () => {
        window.location.reload();
    });

    // Add event listener for toggle switch
    const toggleInput = document.querySelector('.toggle-input');
    toggleInput.addEventListener('change', function() {
        // Check if there's any data to reset
        const presentAmount = document.getElementById('presentAmount').value;
        const years = document.getElementById('years').value;
        const hasGraphData = purchasingPowerChart.data.datasets.length > 0;
        const hasResults = document.getElementById('resultsBody').children.length > 0;

        // If there's any data, reset everything
        if (presentAmount || years || hasGraphData || hasResults) {
            resetCalculator();
        }

        updateCurrencySymbols(this.checked);
    });

    setMainContentHeight();
    window.addEventListener('resize', setMainContentHeight);

    // Initialize chart
    const ctx = document.getElementById('purchasingPowerChart').getContext('2d');
    purchasingPowerChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'point'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: false
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: true,
                        borderColor: '#e2e8f0'
                    },
                    ticks: {
                        callback: function(value) {
                            // Show thousands as K (e.g., 1500 -> 1.5K), others normally
                            if (value >= 1000) {
                                const k = value / 1000;
                                // Trim to at most 2 decimals, remove trailing zeros
                                const formatted = k.toFixed(2).replace(/\.00$|([0-9]+\.[0-9]*[1-9])0+$/, '$1');
                                return `${currentCurrency}${formatted}K`;
                            }
                            // For values below 1000, show full rupee amount
                            return `${currentCurrency}${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
                        }
                    }
                },
                x: {
                    type: 'category', // treat labels as categories to display full years
                    title: {
                        display: true,
                        text: 'Year',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: true,
                        borderColor: '#e2e8f0'
                    },
                    ticks: {
                        callback: function(value) {
                            // value is the index, so use getLabelForValue to fetch the actual year
                            return this.getLabelForValue(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: window.innerWidth <= 500 ? 12 : 14,
                            weight: 'bold'
                        },
                        padding: window.innerWidth <= 500 ? 12 : 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: window.innerWidth <= 500 ? 10 : 12,
                        boxHeight: window.innerWidth <= 500 ? 10 : 12
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyColor: '#fff',
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const idx = context[0].dataIndex;
                            const fullYear = new Date().getFullYear() + idx;
                            return `Year ${fullYear}:`;
                        },
                        label: function(context) {
                            const val = context.parsed.y;
                            let formattedVal;
                            if (val >= 100000) {
                                formattedVal = (val / 100000).toFixed(2) + 'L';
                            } else {
                                formattedVal = val.toLocaleString('en-IN', {
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2
                                });
                            }
                            return `• Currency Value: ${currentCurrency}${formattedVal}`;
                        },
                        afterBody: function(context) {
                            const idx = context[0].dataIndex;
                            const currentVal = context[0].parsed.y;
                            const orig = originalAmount;
                            let formattedOrig = formatCurrency(orig);
                            let loss = orig - currentVal;
                            let formattedLoss;
                            if (loss >= 100000) {
                                formattedLoss = (loss / 100000).toFixed(2) + 'L';
                            } else {
                                formattedLoss = loss.toLocaleString('en-IN', {
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2
                                });
                            }
                            return [
                                `• Original Value: ${currentCurrency}${formattedOrig}`,
                                `• Loss in Value: ${currentCurrency}${formattedLoss}`
                            ];
                        }
                    }
                }
            }
        }
    });

    // Add click event listener to the calculate button
    document.getElementById('calculateBtn').addEventListener('click', calculate);

    // Add click event listener to the add graph button
    document.getElementById('addGraphBtn').addEventListener('click', prepareAddGraph);

    // Add click event listener to the reset button
    document.getElementById('resetBtn').addEventListener('click', resetCalculator);

    // Add Enter key event listener to input fields
    document.querySelectorAll('.input-group input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
});

function prepareAddGraph() {
    // Freeze amount and time fields
    document.getElementById('presentAmount').disabled = true;
    document.getElementById('years').disabled = true;
    
    // Disable the add graph button
    document.getElementById('addGraphBtn').disabled = true;
    
    // Enable add graph mode
    isAddGraphMode = true;
}

function calculate() {
    // Unfreeze all fields and buttons when Calculate is clicked
    document.getElementById('presentAmount').disabled = false;
    document.getElementById('inflationRate').disabled = false;
    document.getElementById('years').disabled = false;
    document.getElementById('addGraphBtn').disabled = false;
    document.getElementById('calculateBtn').disabled = false;

    const presentAmountStr = document.getElementById('presentAmount').value;
    const inflationRate = document.getElementById('inflationRate').value;
    const yearInput = document.getElementById('years').value;

    // Show or hide reset/add group: hide if both amount and year are empty
    const buttonGroup = document.querySelector('.button-group');
    if (presentAmountStr.trim() === '' && yearInput.trim() === '') {
        buttonGroup.style.display = 'none';
    } else {
        buttonGroup.style.display = 'flex';
    }

    // Reset error states
    document.getElementById('presentAmount').classList.remove('error');
    document.getElementById('inflationRate').classList.remove('error');
    document.getElementById('years').classList.remove('error');

    // Validate amount
    const cleanAmount = presentAmountStr.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleanAmount);
    if (isNaN(amount) || amount <= 0) {
        document.getElementById('presentAmount').classList.add('error');
        return;
    }

    // Validate presence of other fields
    let hasError = false;
    if (!inflationRate) {
        document.getElementById('inflationRate').classList.add('error');
        hasError = true;
    }
    if (!yearInput) {
        document.getElementById('years').classList.add('error');
        hasError = true;
    }
    if (hasError) return;

    // Compute years and rate
    const rate = parseFloat(inflationRate) / 100;
    const currentYear = new Date().getFullYear();
    let futureYear, time;
    if (yearInput >= 1 && yearInput <= 1000) {
        time = parseInt(yearInput, 10);
        futureYear = currentYear + time;
    } else {
        futureYear = parseInt(yearInput, 10);
        time = futureYear - currentYear;
    }

    if (isNaN(rate) || rate <= 0) {
        document.getElementById('inflationRate').classList.add('error');
        return;
    }
    if (isNaN(futureYear) || futureYear <= currentYear) {
        document.getElementById('years').classList.add('error');
        return;
    }

    // Reflect computed year and formatted amount in inputs
    document.getElementById('years').value = futureYear;
    document.getElementById('presentAmount').value = amount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    });

    // Build chart data arrays
    const yearLabels = [];
    const purchasingPowerData = [];
    for (let y = 0; y <= time; y++) {
        const year = new Date().getFullYear() + y;
        yearLabels.push(year);
        purchasingPowerData.push(amount / Math.pow(1 + rate, y));
    }

    // Update numeric display
    const finalPower = purchasingPowerData[purchasingPowerData.length - 1];
    const lossValue = amount - finalPower;
    const rateDisplay = parseFloat(inflationRate).toFixed(1);

    // Manage result rows: clear for initial or base-change, append for add-graph
    const resultsBody = document.getElementById('resultsBody');
    const isBaseChanged = isAddGraphMode && (amount !== originalAmount || futureYear !== originalFutureYear);
    if (!isAddGraphMode || isBaseChanged) {
        resultsBody.innerHTML = ''; // clear previous results
        resultsCount = 0;
    }
    // Append new row
    resultsCount++;
    const rowHTML = `<tr>
        <td>${resultsCount}</td>
        <td>${currentCurrency}${formatCurrency(amount)}</td>
        <td>${currentCurrency}${formatCurrency(finalPower)}</td>
        <td>${currentCurrency}${formatCurrency(lossValue)}</td>
        <td>${rateDisplay}%</td>
    </tr>`;
    resultsBody.insertAdjacentHTML('beforeend', rowHTML);

    // Graph logic
    if (!isAddGraphMode) {
        // First calculation or recalc of the first graph
        originalAmount = amount;
        originalFutureYear = futureYear;
        updateChart(yearLabels, purchasingPowerData, amount, rate);
        graphCount = 1;
    } else {
        // User clicked Add Graph
        if (amount !== originalAmount || futureYear !== originalFutureYear) {
            // Amount/time changed -> reset to a new initial graph
            originalAmount = amount;
            originalFutureYear = futureYear;
            updateChart(yearLabels, purchasingPowerData, amount, rate);
            graphCount = 1;
        } else {
            // Same base values -> add another graph line
            addGraphDataset(yearLabels, purchasingPowerData, rate);
            graphCount++;
        }
        isAddGraphMode = false;
    }

    // After third graph, freeze Add Graph and ensure fields are editable
    if (graphCount >= 3) {
        document.getElementById('presentAmount').disabled = false;
        document.getElementById('inflationRate').disabled = false;
        document.getElementById('years').disabled = false;
        document.getElementById('addGraphBtn').disabled = true;
    }
}

function updateChart(labels, data, amount, rate) {
    // Set labels for the chart
    purchasingPowerChart.data.labels = labels;
    // Create a baseline array for the original amount
    const baselineData = labels.map(() => amount);
    // First, show a single Original Value line, then the inflation curve
    purchasingPowerChart.data.datasets = [
        {
            label: window.innerWidth <= 500 ? `Orig Val: ${currentCurrency}${formatCurrency(amount)}` : 'Original Value',
            data: baselineData,
            borderColor: '#4A5568',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            tension: 0
        },
        {
            label: window.innerWidth <= 500 ? `Rate: ${(rate * 100).toFixed(1)}%` : `Inflation Rate: ${(rate * 100).toFixed(1)}%`,
            data: data,
            borderColor: colors[0],
            backgroundColor: `${colors[0]}20`,
            fill: true,
            tension: 0.8,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: colors[0],
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: colors[0],
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
        }
    ];
    purchasingPowerChart.update();
}

function addGraphDataset(labels, data, rate) {
    purchasingPowerChart.data.datasets.push({
        label: window.innerWidth <= 500 ? `Rate: ${(rate * 100).toFixed(1)}%` : `Inflation Rate: ${(rate * 100).toFixed(1)}%`,
        data: data,
        borderColor: colors[graphCount],
        backgroundColor: `${colors[graphCount]}20`,
        fill: true,
        tension: 0.8,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors[graphCount],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: colors[graphCount],
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
    });
    purchasingPowerChart.update();
}

function formatCurrency(value) {
    if (value >= 100000) {
        return (value / 100000).toFixed(2) + 'L';
    }
    return value.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

function resetCalculator() {
    // Hide reset/add buttons when resetting
    document.querySelector('.button-group').style.display = 'none';
    // Reset input fields
    document.getElementById('presentAmount').value = '';
    document.getElementById('inflationRate').value = '5';
    document.getElementById('years').value = '';

    // Enable all inputs
    document.getElementById('presentAmount').disabled = false;
    document.getElementById('inflationRate').disabled = false;
    document.getElementById('years').disabled = false;
    document.getElementById('addGraphBtn').disabled = false;
    document.getElementById('calculateBtn').disabled = false;

    // Clear dynamic results table
    document.getElementById('resultsBody').innerHTML = '';
    resultsCount = 0;

    // Reset chart
    purchasingPowerChart.data.labels = [];
    purchasingPowerChart.data.datasets = [];
    purchasingPowerChart.update();

    // Reset graph count and add graph mode
    graphCount = 0;
    isAddGraphMode = false;
}

// Function to update currency symbols
function updateCurrencySymbols(isDollar) {
    currentCurrency = isDollar ? '$' : '₹';
    
    // Update input field label
    document.querySelector('label[for="presentAmount"]').textContent = `Amount (${currentCurrency})`;
    
    // Update chart y-axis title
    purchasingPowerChart.options.scales.y.title.text = `Value in ${isDollar ? 'Dollars' : 'Rupees'} (${currentCurrency})`;
    
    // Update tooltip callbacks
    purchasingPowerChart.options.plugins.tooltip.callbacks.label = function(context) {
        const val = context.parsed.y;
        let formattedVal;
        if (val >= 100000) {
            formattedVal = (val / 100000).toFixed(2) + 'L';
        } else {
            formattedVal = val.toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
            });
        }
        return `• Currency Value: ${currentCurrency}${formattedVal}`;
    };

    purchasingPowerChart.options.plugins.tooltip.callbacks.afterBody = function(context) {
        const idx = context[0].dataIndex;
        const currentVal = context[0].parsed.y;
        const orig = originalAmount;
        let formattedOrig = formatCurrency(orig);
        let loss = orig - currentVal;
        let formattedLoss;
        if (loss >= 100000) {
            formattedLoss = (loss / 100000).toFixed(2) + 'L';
        } else {
            formattedLoss = loss.toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
            });
        }
        return [
            `• Original Value: ${currentCurrency}${formattedOrig}`,
            `• Loss in Value: ${currentCurrency}${formattedLoss}`
        ];
    };

    // Update results table
    const rows = document.querySelectorAll('#resultsTable tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells[1].textContent = cells[1].textContent.replace(/[₹$]/, currentCurrency);
        cells[2].textContent = cells[2].textContent.replace(/[₹$]/, currentCurrency);
        cells[3].textContent = cells[3].textContent.replace(/[₹$]/, currentCurrency);
    });

    // Update chart
    purchasingPowerChart.update();
}

