const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create public/icons directory if it doesn't exist
if (!fs.existsSync('./public/icons')) {
    fs.mkdirSync('./public/icons', { recursive: true });
}

sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(0, 0, size, size);

    // Draw a simple checkmark
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.1;
    ctx.beginPath();
    ctx.moveTo(size * 0.3, size * 0.5);
    ctx.lineTo(size * 0.45, size * 0.65);
    ctx.lineTo(size * 0.7, size * 0.35);
    ctx.stroke();

    // Save the icon
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`./public/icons/icon-${size}x${size}.png`, buffer);
}); 