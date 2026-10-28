export const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
// Face detection helper to draw boxes
export const drawFaceBox = (ctx, box, color, label) => {
    const x = box.x, y = box.y, w = box.width, h = box.height;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    const cornerLen = 15;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y+cornerLen); ctx.lineTo(x, y); ctx.lineTo(x+cornerLen, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w-cornerLen, y); ctx.lineTo(x+w, y); ctx.lineTo(x+w, y+cornerLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y+h-cornerLen); ctx.lineTo(x, y+h); ctx.lineTo(x+cornerLen, y+h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w-cornerLen, y+h); ctx.lineTo(x+w, y+h); ctx.lineTo(x+w, y+h-cornerLen); ctx.stroke();
    ctx.font = 'bold 13px "Space Grotesk", sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 24, tw + 14, 22);
    ctx.fillStyle = '#060a13';
    ctx.fillText(label, x + 7, y - 8);
};