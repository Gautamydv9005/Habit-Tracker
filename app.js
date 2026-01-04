
    // --- DEFAULT CONFIG ---
    const defaultHabits = ["","","","","","","","","",""];
    const totalDays = 28; 

    let habitsList = [];
    let state = [];
    let startDateValue = "2026-01-01"; 


    const weekRow = document.getElementById('week-row');
    const dateRow = document.getElementById('date-row');
    const tbody = document.getElementById('tracker-body');
    const startDateInput = document.getElementById('start-date-input');


    function init() {
        loadData();
        
        // Set the date picker to the stored value
        startDateInput.value = startDateValue;
        startDateInput.addEventListener('change', (e) => {
            startDateValue = e.target.value;
            saveData();
            renderHeader(); // Re-render dates when input changes
        });

        renderHeader();
        renderBody();
        updateDashboard();
    }

    // --- SAVE & LOAD ---
    function saveData() {
        const data = {
            habits: habitsList,
            grid: state,
            start: startDateValue
        };
        localStorage.setItem('habitTrackerData_v2', JSON.stringify(data));
    }

    function loadData() {
        const saved = localStorage.getItem('habitTrackerData_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            habitsList = parsed.habits || defaultHabits;
            state = parsed.grid || [];
            startDateValue = parsed.start || "2025-01-01";
        } else {
            // New user or reset
            habitsList = [...defaultHabits];
            state = Array(habitsList.length).fill().map(() => Array(totalDays).fill(false));
        }
    }

    function resetData() {
        if(confirm("Clear all data and return to defaults?")) {
            localStorage.removeItem('habitTrackerData_v2');
            location.reload();
        }
    }

    // --- RENDERING ---

    function renderHeader() {
        // Clear existing generated headers to avoid duplicates
        // Remove old Week headers
        const existingWeeks = weekRow.querySelectorAll('.header-week');
        existingWeeks.forEach(el => el.remove());
        
        // Remove old Date headers
        dateRow.innerHTML = ''; 

        // 1. Re-add Week Headers
        for(let i=0; i<4; i++) {
            const th = document.createElement('th');
            th.className = 'header-week';
            th.colSpan = 7;
            th.innerText = `Week ${i+1}`;
            weekRow.insertBefore(th, weekRow.lastElementChild);
        }

        // 2. Re-add Day Headers based on startDateValue
        const startObj = new Date(startDateValue);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for(let i=0; i<totalDays; i++) {
            let currentDate = new Date(startObj);
            currentDate.setDate(startObj.getDate() + i);
            
            const th = document.createElement('th');
            th.className = 'header-date';
            
            // Handle invalid date logic if user clears input
            if(isNaN(currentDate.getTime())) {
                th.innerHTML = "-<br>-";
            } else {
                let dayName = days[currentDate.getDay()];
                let dayNum = currentDate.getDate();
                th.innerHTML = `${dayName}<br>${dayNum}`;
            }
            dateRow.appendChild(th);
        }
    }

    function renderBody() {
        tbody.innerHTML = '';
        
        habitsList.forEach((habit, hIndex) => {
            const tr = document.createElement('tr');
            
            // --- EDITABLE HABIT NAME ---
            const tdName = document.createElement('td');
            tdName.innerText = habit;
            tdName.className = 'editable-habit';
            tdName.contentEditable = true; // Makes it clickable and typeable
            tdName.style.textAlign = 'left';
            tdName.style.fontWeight = '500';
            
            // Save new name when user clicks away
            tdName.addEventListener('blur', (e) => {
                const newName = e.target.innerText.trim();
                if(newName) {
                    habitsList[hIndex] = newName;
                    saveData();
                    updateDashboard(); // Update best/worst stats
                } else {
                    e.target.innerText = habitsList[hIndex]; // Revert if empty
                }
            });

            tr.appendChild(tdName);

            // Checkboxes
            for(let dIndex=0; dIndex<totalDays; dIndex++) {
                const td = document.createElement('td');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = state[hIndex][dIndex];
                
                checkbox.addEventListener('change', () => {
                    state[hIndex][dIndex] = checkbox.checked;
                    saveData();
                    updateDashboard();
                    checkDailyCompletion(dIndex); // Confetti Check
                });

                td.appendChild(checkbox);
                tr.appendChild(td);
            }

            // Total Bar
            const tdTotal = document.createElement('td');
            const barCont = document.createElement('div');
            barCont.className = 'bar-container';
            const barFill = document.createElement('span');
            barFill.className = 'bar-fill';
            barFill.id = `bar-${hIndex}`;
            barFill.style.width = '0%';
            barCont.appendChild(barFill);
            tdTotal.appendChild(barCont);
            tr.appendChild(tdTotal);

            tbody.appendChild(tr);
        });
    }

    // --- LOGIC ---

    function updateDashboard() {
        // Calculate Totals per row
        habitsList.forEach((_, hIndex) => {
            const completed = state[hIndex].filter(Boolean).length;
            const percent = (completed / totalDays) * 100;
            document.getElementById(`bar-${hIndex}`).style.width = `${percent}%`;
        });

        // Best / Worst Habit
        let max = -1, min = Infinity;
        let best = "", worst = "";
        habitsList.forEach((habit, i) => {
            const count = state[i].filter(Boolean).length;
            if(count > max) { max = count; best = habit; }
            if(count < min) { min = count; worst = habit; }
        });
        document.getElementById('best-habit').innerText = max > 0 ? best : "-";
        document.getElementById('worst-habit').innerText = min < Infinity ? worst : "-";

        // Daily Stats
        let dailyPercentages = [];
        let perfectDays = 0, halfDays = 0, zeroDays = 0;

        for(let d=0; d<totalDays; d++) {
            let habitsDoneToday = 0;
            for(let h=0; h<habitsList.length; h++) {
                if(state[h][d]) habitsDoneToday++;
            }
            let percent = (habitsDoneToday / habitsList.length) * 100;
            dailyPercentages.push(percent);

            if(percent === 100) perfectDays++;
            else if(percent >= 50) halfDays++;
            else zeroDays++;
        }
        document.getElementById('count-100').innerText = `${perfectDays} Days`;
        document.getElementById('count-50').innerText = `${halfDays} Days`;
        document.getElementById('count-0').innerText = `${zeroDays} Days`;

        updateChart(dailyPercentages);
    }

    // --- CHART ---
    let myChart = null;
    function updateChart(dataPoints) {
        const ctx = document.getElementById('progressChart').getContext('2d');
        const labels = Array.from({length: totalDays}, (_, i) => i + 1);

        if(myChart) {
            myChart.data.datasets[0].data = dataPoints;
            myChart.update();
        } else {
            myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Completion %',
                        data: dataPoints,
                        borderColor: '#00b050',
                        backgroundColor: 'rgba(0, 176, 80, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, max: 100 },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // --- CONFETTI LOGIC ---
    function checkDailyCompletion(dayIndex) {
        let allDone = true;
        for(let i=0; i < habitsList.length; i++) {
            if(!state[i][dayIndex]) { allDone = false; break; }
        }
        if (allDone) { triggerConfetti(); }
    }

    function triggerConfetti() {
        var duration = 3 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        function random(min, max) { return Math.random() * (max - min) + min; }
        var interval = setInterval(function() {
            var timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            var particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }

    // START
    init();



