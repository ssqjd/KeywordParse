document.getElementById('extract').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractMuUrls,
  }, (results) => {
    if (results && results[0]) {
      displayDomains(results[0].result);
      document.getElementById('copyAll').style.display = 'block';
    }
  });
});

function extractMuUrls() {
  const domains = [];
  const seenDomains = new Set(); // 用于去重但保持顺序
  
  // 按顺序提取所有搜索结果div的mu属性
  document.querySelectorAll('div.result.c-container').forEach(result => {
    const mu = result.getAttribute('mu');
    if (mu) {
      try {
        const url = new URL(mu);
        const domain = url.hostname;
        if (domain && !domain.includes('baidu.com') && !seenDomains.has(domain)) {
          domains.push(domain);
          seenDomains.add(domain);
        }
      } catch (e) {}
    }
  });
  
  return domains; // 直接返回数组，保持原始顺序
}

function displayDomains(domains) {
  const container = document.getElementById('domainList');
  container.innerHTML = '';
  
  if (domains.length === 0) {
    container.innerHTML = '<div class="domain-item">未找到域名</div>';
    return;
  }
  
  container.dataset.domains = JSON.stringify(domains);
  
  domains.forEach((domain, index) => {
    const div = document.createElement('div');
    div.className = 'domain-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'domain-name';
    nameSpan.textContent = `${index + 1}. ${domain}`;
    
    const checkLink = document.createElement('a');
    checkLink.className = 'check-seo';
    checkLink.textContent = '查询SEO';
    checkLink.href = `https://seo.chinaz.com/${domain}`;
    checkLink.target = '_blank';
    checkLink.title = '在站长工具中查看详细SEO信息';
    
    div.appendChild(nameSpan);
    div.appendChild(checkLink);
    container.appendChild(div);
  });
  
  const count = document.createElement('div');
  count.className = 'domain-count';
  count.textContent = `共找到 ${domains.length} 个不同域名`;
  container.appendChild(count);
}

document.getElementById('copyAll').addEventListener('click', async () => {
  const container = document.getElementById('domainList');
  const domains = JSON.parse(container.dataset.domains || '[]');
  
  if (domains.length > 0) {
    try {
      await navigator.clipboard.writeText(domains.join('\n'));
      
      // 显示复制成功提示
      const tooltip = document.getElementById('copyTooltip');
      tooltip.style.display = 'block';
      
      // 隐藏复制按钮
      document.getElementById('copyAll').style.display = 'none';
    } catch (e) {
      console.error('复制失败:', e);
    }
  }
}); 