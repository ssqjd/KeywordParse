document.addEventListener('DOMContentLoaded', () => {
  const domainsInput = document.getElementById('domainsInput');
  const sourceContent = document.getElementById('sourceContent');
  const generateButton = document.getElementById('generateButton');
  const copyButton = document.getElementById('copyButton');
  const resultArea = document.getElementById('resultArea');
  const copyTooltip = document.getElementById('copyTooltip');

  // 生成文本
  generateButton.addEventListener('click', () => {
    const domainsText = domainsInput.value.trim();
    if (!domainsText) {
      alert('请输入域名列表');
      return;
    }

    const content = sourceContent.value.trim() || '来源内容';

    // 分割域名并过滤空行
    const domains = domainsText.split('\n')
      .map(line => line.trim())
      .filter(line => line);

    // 生成格式化文本
    const output = domains.map(domain => {
      // 从域名中提取主域名部分，并去掉顶级域名（.com/.net等）
      const cleanDomain = domain
        .replace(/^(https?:\/\/)?(www\.)?/, '') // 移除 http:// 或 https:// 和 www.
        .split('/')[0] // 移除路径部分
        .split('.')[0]; // 只取第一部分（去掉.com等后缀）
      
      return `[${domain}]\n` +
             `url=200,10~30,${domain}\n` +
             `furl=1,40,${content}\n` +
             `furl=2,30,${content}\n` +
             `furl=3,30,${content}\n` ;
            //  `furl=1,40,${content}\n` +
            //  `furl=2,30,${content}\n` +
            //  `furl=3,30,${content}`;
    }).join('\n\n');

    // 显示结果
    resultArea.value = output;
  });

  // 复制结果
  copyButton.addEventListener('click', async () => {
    if (!resultArea.value) {
      alert('没有可复制的内容');
      return;
    }

    try {
      await navigator.clipboard.writeText(resultArea.value);
      copyTooltip.style.display = 'block';
      setTimeout(() => {
        copyTooltip.style.display = 'none';
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    }
  });
});