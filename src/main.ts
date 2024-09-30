// 获取 HTML 元素
const fileInput = document.getElementById('yuv_id') as HTMLInputElement;
const formatSelect = document.getElementById('yuv_format') as HTMLSelectElement;
const canvasSimple = document.querySelector('.simple-canvas') as HTMLCanvasElement;
const canvasY = document.querySelector('.y') as HTMLCanvasElement;
const canvasU = document.querySelector('.u') as HTMLCanvasElement;
const canvasV = document.querySelector('.v') as HTMLCanvasElement;

let width = 650;  // 图像宽度
let height = 487; // 图像高度

canvasSimple.width = width;
canvasSimple.height = height;
canvasY.width = width;
canvasY.height = height;
canvasU.width = width / 2;
canvasU.height = height / 2;
canvasV.width = width / 2;
canvasV.height = height / 2;

// 监听文件输入
fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const yuvData = new Uint8Array(buffer);

    // 根据用户选择的格式解析YUV
    const format = formatSelect.value as 'yuv420' | 'yuv422' | 'yuv444';
    renderYUV(yuvData, format);
});

// 渲染YUV数据
function renderYUV(yuvData: Uint8Array, format: 'yuv420' | 'yuv422' | 'yuv444') {
    let yData: Uint8Array, uData: Uint8Array, vData: Uint8Array;

    switch (format) {
        case 'yuv420':
            ({ yData, uData, vData } = parseYUV420(yuvData));
            canvasU.width = width / 2;
            canvasU.height = height / 2;
            canvasV.width = width / 2;
            canvasV.height = height / 2;
            break;
        case 'yuv422':
            ({ yData, uData, vData } = parseYUV422(yuvData));
            canvasU.width = width / 2;
            canvasU.height = height;
            canvasV.width = width / 2;
            canvasV.height = height;
            break;
        case 'yuv444':
            ({ yData, uData, vData } = parseYUV444(yuvData));
            canvasU.width = width;
            canvasU.height = height;
            canvasV.width = width;
            canvasV.height = height;
            break;
    }

    // 渲染灰度图像（Y、U、V分量）
    renderGrayscale(canvasY, yData, width, height);
    renderGrayscale(canvasU, uData, canvasU.width, canvasU.height);
    renderGrayscale(canvasV, vData, canvasV.width, canvasV.height);

    // 将YUV转换为RGB并渲染到主canvas
    renderRGB(canvasSimple, yData, uData, vData, format);
}

// 解析 YUV420 格式
function parseYUV420(yuvData: Uint8Array) {
    const frameSize = width * height;
    const yData = yuvData.slice(0, frameSize);
    const uData = yuvData.slice(frameSize, frameSize + (frameSize >> 2));
    const vData = yuvData.slice(frameSize + (frameSize >> 2));
    return { yData, uData, vData };
}

// 解析 YUV422 格式
function parseYUV422(yuvData: Uint8Array) {
    const frameSize = width * height;
    const yData = yuvData.slice(0, frameSize);
    const uData = yuvData.slice(frameSize, frameSize + (frameSize >> 1));
    const vData = yuvData.slice(frameSize + (frameSize >> 1));
    return { yData, uData, vData };
}

// 解析 YUV444 格式
function parseYUV444(yuvData: Uint8Array) {
    const frameSize = width * height;
    const yData = yuvData.slice(0, frameSize);
    const uData = yuvData.slice(frameSize, frameSize * 2);
    const vData = yuvData.slice(frameSize * 2);
    return { yData, uData, vData };
}

// 渲染灰度图像 (用于Y、U、V分量显示)
function renderGrayscale(canvas: HTMLCanvasElement, data: Uint8Array, w: number, h: number) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx!.createImageData(w, h);

    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        imageData.data[i * 4 + 0] = value; // R
        imageData.data[i * 4 + 1] = value; // G
        imageData.data[i * 4 + 2] = value; // B
        imageData.data[i * 4 + 3] = 255;   // A
    }

    ctx!.putImageData(imageData, 0, 0);
}

// YUV to RGB conversion and rendering to canvas
function renderRGB(canvas: HTMLCanvasElement, yData: Uint8Array, uData: Uint8Array, vData: Uint8Array, format: 'yuv420' | 'yuv422' | 'yuv444') {
    const ctx = canvas.getContext('2d');
    const w = width;
    const h = height;
    const imageData = ctx!.createImageData(w, h);

    let uIndex = 0, vIndex = 0;

    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            const yIndex = i * w + j;

            if (format === 'yuv420') {
                if (i % 2 === 0 && j % 2 === 0) {
                    uIndex = (i / 2) * (w / 2) + (j / 2);
                    vIndex = (i / 2) * (w / 2) + (j / 2);
                }
            } else if (format === 'yuv422') {
                if (j % 2 === 0) {
                    uIndex = i * (w / 2) + (j / 2);
                    vIndex = i * (w / 2) + (j / 2);
                }
            } else if (format === 'yuv444') {
                uIndex = yIndex;
                vIndex = yIndex;
            }

            const Y = yData[yIndex];
            const U = uData[uIndex] - 128;
            const V = vData[vIndex] - 128;

            // YUV to RGB conversion
            const R = Y + 1.402 * V;
            const G = Y - 0.344136 * U - 0.714136 * V;
            const B = Y + 1.772 * U;

            const index = (i * w + j) * 4;
            imageData.data[index] = clamp(R);     // R
            imageData.data[index + 1] = clamp(G); // G
            imageData.data[index + 2] = clamp(B); // B
            imageData.data[index + 3] = 255;      // A
        }
    }

    ctx!.putImageData(imageData, 0, 0);
}

// 辅助函数：将RGB值限制在[0, 255]之间
function clamp(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}