export const SCALE = 10; // Pixels per inch

export function formatMeasurement(inches) {
    return `${Number(inches).toFixed(1)}"`;
}

export function createElement(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

export function cmToInches(cm) {
    return cm / 2.54;
}

export function mmToInches(mm) {
    return mm / 25.4;
}

export const DEFAULT_WALL = {
    width: 80, // inches
    height: 80, // inches
    color: '#f0f0f0'
};
