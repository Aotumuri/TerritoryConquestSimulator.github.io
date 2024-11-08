const WHITE_COLOR = '#FFFFFF'; // 空白地帯の色

document.addEventListener('DOMContentLoaded', () => {
    // 必須要素の取得
    let cities = [];
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const regenerateButton = document.getElementById('regenerateButton');
    const saveButton = document.getElementById('saveButton');
    const loadButton = document.getElementById('loadButton');
    const singleMergeButton = document.getElementById('singleMergeButton');
    const multiMergeButton = document.getElementById('multiMergeButton');
    const toggleAutoMergeButton = document.getElementById('toggleAutoMergeButton');
    const randomAbsorptionToggle = document.getElementById('randomAbsorptionToggle');
    const capitalToggle = document.getElementById('capitalToggle');
    const cityToggle = document.getElementById('cityToggle');
    const cityRequirementContainer = document.getElementById('cityRequirementContainer');
    const absorptionPatternSelect = document.getElementById('absorptionPattern');
    // プリセット設定を適用する関数
    function applyPreset(preset) {
    switch (preset) {
        case 'default':
            document.getElementById('numCells').value = 500;
            document.getElementById('mergeIterations').value = 50;
            break;
        case 'large':
            document.getElementById('numCells').value = 1000;
            document.getElementById('mergeIterations').value = 100;
            break;
        case 'dense':
            document.getElementById('numCells').value = 2000;
            document.getElementById('mergeIterations').value = 150;
            break;
        case 'random':
            document.getElementById('numCells').value = Math.floor(Math.random() * 3000) + 500;
            document.getElementById('mergeIterations').value = Math.floor(Math.random() * 100) + 50;
            break;
        default:
            console.warn("不明なプリセットが選択されました:", preset);
    }

    // 設定を適用して再生成
    const numCells = parseInt(document.getElementById('numCells').value);
    const mergeIterations = parseInt(document.getElementById('mergeIterations').value);
    generateAndDrawMap(numCells, mergeIterations);
}

    // チェックボックスの変更に応じて表示・非表示を切り替え
    cityToggle.addEventListener('change', () => {
        if (cityToggle.checked) {
            cityRequirementContainer.style.display = 'block';
        } else {
            cityRequirementContainer.style.display = 'none';
        }
    });
    
    //要素チェック
    if (!canvas || !ctx || !regenerateButton || !saveButton || !loadButton || !singleMergeButton || !multiMergeButton || !toggleAutoMergeButton || !randomAbsorptionToggle || !capitalToggle || !absorptionPatternSelect) {
        console.error("必要な要素が見つかりませんでした。HTMLを確認してください。");
        return;
    }

    // プリセット設定
    const presets = {
        default: { numCells: 100, mergeIterations: 0, tickInterval: 1000 },
        large: { numCells: 1000, mergeIterations: 10, tickInterval: 500 },
        dense: { numCells: 5000, mergeIterations: 50, tickInterval: 100 },
        random: { numCells: Math.floor(Math.random() * 5000) + 500, mergeIterations: 20, tickInterval: 800 },
    };

    // プリセットを適用する関数
    window.applyPreset = (presetName) => {
        const preset = presets[presetName];
        document.getElementById('numCells').value = preset.numCells;
        document.getElementById('mergeIterations').value = preset.mergeIterations;
        document.getElementById('tickInterval').value = preset.tickInterval;
        generateAndDrawMap(preset.numCells, preset.mergeIterations);
    };
    
    let cells = [];
    let capitals = new Map(); // 各領地の首都セル
    let autoMergeRunning = false;
    let autoMergeInterval = null;
    let lastTick = 0;

    // 地図再生成ボタン
    regenerateButton.addEventListener('click', () => {
        const numCells = parseInt(document.getElementById('numCells').value);
        const mergeIterations = parseInt(document.getElementById('mergeIterations').value);
        generateAndDrawMap(numCells, mergeIterations);
    });

    // 設定保存ボタン
    saveButton.addEventListener('click', () => {
        const settings = {
            numCells: document.getElementById('numCells').value,
            mergeIterations: document.getElementById('mergeIterations').value,
            tickInterval: document.getElementById('tickInterval').value,
            absorptionPattern: absorptionPatternSelect.value,
            capitalToggle: capitalToggle.checked,
            randomAbsorptionToggle: randomAbsorptionToggle.checked
        };
        localStorage.setItem('mapSettings', JSON.stringify(settings));
        alert('設定が保存されました！');
    });

    // 設定ロードボタン
    loadButton.addEventListener('click', () => {
        const savedSettings = localStorage.getItem('mapSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            document.getElementById('numCells').value = settings.numCells;
            document.getElementById('mergeIterations').value = settings.mergeIterations;
            document.getElementById('tickInterval').value = settings.tickInterval;
            absorptionPatternSelect.value = settings.absorptionPattern;
            capitalToggle.checked = settings.capitalToggle;
            randomAbsorptionToggle.checked = settings.randomAbsorptionToggle;
            generateAndDrawMap(settings.numCells, settings.mergeIterations);
            alert('設定がロードされました！');
        } else {
            alert('保存された設定がありません。');
        }
    });

    // 吸収処理を一回実行するボタン
    singleMergeButton.addEventListener('click', () => {
        mergeAdjacentCells();
        drawCells();
    });

    // 吸収処理を複数回実行するボタン
    multiMergeButton.addEventListener('click', () => {
        const mergeIterations = parseInt(document.getElementById('mergeIterations').value);
        for (let i = 0; i < mergeIterations; i++) {
            mergeAdjacentCells();
        }
        drawCells();
    });

    // 自動吸収開始/停止ボタン
    toggleAutoMergeButton.addEventListener('click', () => {
        autoMergeRunning = !autoMergeRunning;
        if (autoMergeRunning) {
            const tickInterval = parseInt(document.getElementById('tickInterval').value);
            autoMergeLoop(tickInterval);
        } else {
            clearInterval(autoMergeInterval);
            autoMergeInterval = null;
        }
    });

    // 吸収パターン選択時のイベントリスナー
    absorptionPatternSelect.addEventListener('change', () => {
        drawCells();
    });

    // 吸収処理用のループ
    function autoMergeLoop(tickInterval) {
        if (!autoMergeRunning) return;
        requestAnimationFrame((timestamp) => {
            if (timestamp - lastTick >= tickInterval) {
                mergeAdjacentCells();
                drawCells();
                lastTick = timestamp;
            }
            autoMergeLoop(tickInterval);
        });
    }

    // 地図を生成し描画する関数
    function generateAndDrawMap(numCells, mergeIterations) {
        capitals.clear();
        cells = generateVoronoiCells(numCells, canvas.width, canvas.height);
    
        // 首都の設定が有効な場合にのみ首都を設定
        if (capitalToggle.checked && cells.length > 0) {
            setCapitals();
        }
    
        // 都市の設定が有効な場合にのみ都市を生成
        if (document.getElementById('cityToggle').checked) {
            generateCities();
        } else {
            cities = []; // 都市リストをクリア
        }
    
        // 吸収処理を実行
        for (let i = 0; i < mergeIterations; i++) {
            mergeAdjacentCells();
        }
    
        drawCells(); // 生成後に描画
    }

    // 各領地の首都を設定
    function setCapitals() {
        const colors = new Set(cells.map(cell => cell.color));
        colors.forEach(color => {
            const colorCells = cells.filter(cell => cell.color === color);
            const capitalCell = colorCells[Math.floor(Math.random() * colorCells.length)];
            capitals.set(capitalCell, color);
        });
    }

    // Voronoiセルを生成
    function generateVoronoiCells(numCells, width, height) {
        const points = Array.from({ length: numCells }, () => ({
            x: Math.random() * width,
            y: Math.random() * height
        }));
        const delaunay = d3.Delaunay.from(points.map(p => [p.x, p.y]));
        const voronoi = delaunay.voronoi([0, 0, width, height]);

        return points.map((_, i) => {
            const cell = voronoi.cellPolygon(i);
            return cell ? {
                points: closeGaps(cell),
                color: getRandomColor(),
                neighbors: Array.from(delaunay.neighbors(i))
            } : null;
        }).filter(cell => cell);
    }

    // 画面外に出ないようセルの端を調整
    function closeGaps(points) {
        return points.map(([x, y]) => [
            Math.min(Math.max(x, 0), canvas.width),
            Math.min(Math.max(y, 0), canvas.height)
        ]);
    }

    // 吸収処理を行う
    function mergeAdjacentCells() {
        const merged = new Set();
        const absorptionPattern = absorptionPatternSelect.value;
        const randomAbsorptionEnabled = randomAbsorptionToggle.checked;
        const capitalIsEnabled = capitalToggle.checked;
    
        // 白色セルを先に処理し、即座に隣接セルの色を吸収
        cells.forEach((cell, index) => {
            if (cell.color === WHITE_COLOR) {
                const neighborColors = getNeighborColors(cell, merged);
                if (neighborColors.length > 0) {
                    // 隣接色からランダムで吸収
                    cell.color = neighborColors[Math.floor(Math.random() * neighborColors.length)];
                    merged.add(index);
                }
            }
        });
    
        // 通常のセル吸収処理
        cells.forEach((cell, index) => {
            if (cell.color === WHITE_COLOR || merged.has(index)) return;
    
            const neighborColors = getNeighborColors(cell, merged);
            let selectedColor;
    
            // ランダム吸収（10%の確率）
            if (randomAbsorptionEnabled && Math.random() < 0.1) {
                selectedColor = neighborColors[Math.floor(Math.random() * neighborColors.length)];
            } else {
                selectedColor = selectColorByPattern(neighborColors, absorptionPattern, cell.color);
            }
    
            if (selectedColor) {
                // 首都セルが吸収された場合の処理
                if (capitals.has(cell) && capitals.get(cell) !== selectedColor) {
                    capitals.delete(cell);
                    const remainingCities = cities.filter(c => c.color === cell.color);
    
                    if (remainingCities.length > 0) {
                        const newCapitalCell = remainingCities[Math.floor(Math.random() * remainingCities.length)];
                        capitals.set(newCapitalCell, selectedColor);
                    } else if (capitalIsEnabled) {
                        selectedColor = WHITE_COLOR;
                    }
                }
    
                // 吸収後のセル色の設定
                cell.color = selectedColor;
                merged.add(index);
            }
        });
    
        // 首都が有効な場合のみ、首都が存在しない領地を白色化
        if (capitalIsEnabled) {
            cells.forEach(cell => {
                if (cell.color !== WHITE_COLOR && !Array.from(capitals.values()).includes(cell.color)) {
                    cell.color = WHITE_COLOR;
                }
            });
        }
    }    

    // 吸収の対象セルの色を選択
    function selectColorByPattern(neighborColors, pattern, selfColor) {
        if (!neighborColors.length) return null;
        
        const colorCounts = neighborColors.reduce((acc, color) => {
            acc[color] = (acc[color] || 0) + 1;
            return acc;
        }, {});
    
        if (pattern === 'random') {
            return neighborColors[Math.floor(Math.random() * neighborColors.length)];
        }
        
        if (pattern === 'majority') {
            return Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
        }
    
        if (pattern === 'weighted') {
            const totalWeight = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
            
            // 自分の色の割合に基づいて保持
            if (Math.random() < (colorCounts[selfColor] || 0) / totalWeight) {
                return selfColor;
            }
    
            // 他の色に基づいた重み付きランダム
            return neighborColors.find(c => Math.random() < colorCounts[c] / totalWeight);
        }
    
        // デフォルトでランダム
        return neighborColors[Math.floor(Math.random() * neighborColors.length)];
    }
    

    // 隣接セルの色を取得
    function getNeighborColors(cell, merged) {
        return cell.neighbors
            .filter(neighborIndex => !merged.has(neighborIndex) && cells[neighborIndex].color !== WHITE_COLOR)
            .map(neighborIndex => cells[neighborIndex].color);
    }

    // 地図を描画
    function drawCells() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cells.forEach(cell => {
            ctx.fillStyle = cell.color;
            ctx.beginPath();
            ctx.moveTo(cell.points[0][0], cell.points[0][1]);
            for (let i = 1; i < cell.points.length; i++) {
                ctx.lineTo(cell.points[i][0], cell.points[i][1]);
            }
            ctx.closePath();
            ctx.fill();
    
            // 首都セルは赤い枠で囲む
            if (capitals.has(cell) && capitals.get(cell) === cell.color) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'red';
            } 
            // 都市セルは青い枠で囲む
            else if (cities.includes(cell)) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'blue';
            } else {
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
            }
            ctx.stroke();
        });
    }

    // ランダムな色を生成
    function getRandomColor() {
        return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    }
    
    // 都市を生成
    function generateCities() {
        cities = [];
        if (!cityToggle.checked) return;
    
        const cityRequirement = parseInt(document.getElementById('cityRequirement').value, 10);
        const numCities = Math.floor(cells.length / cityRequirement);
    
        for (let i = 0; i < numCities; i++) {
            const randomCell = cells[Math.floor(Math.random() * cells.length)];
            if (!cities.includes(randomCell)) {
                cities.push(randomCell);
            }
        }
    }

    // 初期地図の生成
    generateAndDrawMap(100, 0);
});