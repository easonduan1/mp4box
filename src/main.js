import { MP4Clip } from "@webav/av-cliper";

// 传入一个 mp4 文件流即可初始化
const clip = new MP4Clip(
  (await fetch("/test.mp4")).body
);
await clip.ready;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

let time = 0;
// 最快速度渲染视频所有帧
while (true) {
  const { state, video: videoFrame } = await clip.tick(time);
  if (state === "done") break;
  if (videoFrame != null && state === "success") {
    ctx.clearRect(0, 0, ctx.width, ctx.height);
    // 绘制到 Canvas
    ctx.drawImage(
      videoFrame,
      0,
      0,
      videoFrame.codedWidth,
      videoFrame.codedHeight,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );
    // 注意，用完立即 close
    videoFrame.close();
  }
  // 时间单位是 微秒，所以差不多每秒取 30 帧，丢掉多余的帧
  time += 63000;
}
clip.destroy();
