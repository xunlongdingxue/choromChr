chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    // 获取当前窗口的位置和大小
    chrome.windows.getCurrent((window) => {
      // 计算弹出窗口的位置（居中显示）
      const width = 400;
      const height = 500;
      const left = window.left + (window.width - width) / 2;
      const top = window.top + (window.height - height) / 2;

      // 创建独立窗口
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: width,
        height: height,
        left: Math.round(left),
        top: Math.round(top),
        focused: true
      });
    });
  }
}); 