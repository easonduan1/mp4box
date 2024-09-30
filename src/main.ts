// 获取 HTML 元素
const fileInput = document.getElementById('yuv_id') as HTMLInputElement;
const formatSelect = document.getElementById('yuv_format') as HTMLSelectElement;
const canvasSimple = document.querySelector('.simple-canvas') as HTMLCanvasElement;
const canvasY = document.querySelector('.y') as HTMLCanvasElement;
const canvasU = document.querySelector('.u') as HTMLCanvasElement;
const canvasV = document.querySelector('.v') as HTMLCanvasElement;

let width: number = 640;  // 默认宽度
let height: number = 480; // 默认高度
let yuvData: Uint8Array | null = null;
let format: 'yuv420' | 'yuv422' | 'yuv444' = 'yuv420'; // 默认格式

// 监听文件输入
fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const headerInfo = parseYUVHeader(buffer);

    if (!headerInfo) {
        alert('无法解析文件头部信息');
        return;
    }

    // 从文件头部获取宽度、高度和YUV格式
    width = headerInfo.width;
    height = headerInfo.height;
    format = headerInfo.format;

    // 更新选择框和画布的宽高
    updateCanvasDimensions();
    updateFormatSelect();

    // 提取YUV数据（去掉头部）
    yuvData = new Uint8Array(buffer, headerInfo.headerSize);

    // 渲染YUV数据
    renderYUV();
});

// 更新YUV格式选择框
function updateFormatSelect() {
    const formatMap: { [key: string]: string } = {
        'yuv420': 'YUV 4:2:0',
        'yuv422': 'YUV 4:2:2',
        'yuv444': 'YUV 4:4:4'
    };

    formatSelect.value = format;
}

// 更新Canvas的宽高
function updateCanvasDimensions() {
    canvasSimple.width = width;
    canvasSimple.height = height;
    canvasY.width = width;
    canvasY.height = height;

    if (format === 'yuv420' || format === 'yuv422') {
        canvasU.width = width / 2;
        canvasU.height = height / (format === 'yuv420' ? 2 : 1);
        canvasV.width = width / 2;
        canvasV.height = height / (format === 'yuv420' ? 2 : 1);
    } else {
        canvasU.width = width;
        canvasU.height = height;
        canvasV.width = width;
        canvasV.height = height;
    }
}

// 解析 YUV 文件头部
function parseYUVHeader(buffer: ArrayBuffer): { width: number, height: number, format: 'yuv420' | 'yuv422' | 'yuv444', headerSize: number } | null {
    const view = new DataView(buffer);

    try {
        // 解析前 4 个字节为宽度
        const width = view.getUint32(0, true); // Little-endian
        // 解析接下来的 4 个字节为高度
        const height = view.getUint32(4, true); // Little-endian
        // 解析接下来的 4 个字节为格式
        const formatCode = view.getUint32(8, true); // Little-endian

        let format: 'yuv420' | 'yuv422' | 'yuv444';
        switch (formatCode) {
            case 0:
                format = 'yuv420';
                break;
            case 1:
                format = 'yuv422';
                break;
            case 2:
                format = 'yuv444';
                break;
            default:
                throw new Error('未知的YUV格式');
        }

        // 假设头部大小为 12 字节（4 字节宽度 + 4 字节高度 + 4 字节格式）
        const headerSize = 12;

        return { width, height, format, headerSize };
    } catch (error) {
        console.error('解析YUV文件头部失败:', error);
        return null;
    }
}

// 渲染 YUV 数据
function renderYUV() {
    if (!yuvData) return;

    let yData: Uint8Array, uData: Uint8Array, vData: Uint8Array;

    switch (format) {
        case 'yuv420':
            ({ yData, uData, vData } = parseYUV420(yuvData));
            break;
        case 'yuv422':
            ({ yData, uData, vData } = parseYUV422(yuvData));
            break;
        case 'yuv444':
            ({ yData, uData, vData } = parseYUV444(yuvData));
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