document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  const bookmarkList = document.getElementById('bookmarkList');
  let selectedIndex = -1;
  let bookmarks = [];
  
  // 自动聚焦到搜索框
  searchInput.focus();
  
  function searchBookmarks(query) {
    // 如果查询为空，显示所有书签
    if (!query.trim()) {
      chrome.bookmarks.getRecent(100, function(results) {
        displayBookmarks(results);
      });
      return;
    }

    chrome.bookmarks.search(query, function(results) {
      // 过滤和排序结果
      const processedResults = results
        .filter(bookmark => bookmark.url) // 只保留有URL的书签
        .map(bookmark => ({
          ...bookmark,
          score: calculateRelevanceScore(bookmark, query.toLowerCase())
        }))
        .sort((a, b) => b.score - a.score) // 按相关性得分排序
        .slice(0, 100); // 限制结果数量

      displayBookmarks(processedResults);
    });
  }

  // 计算相关性得分
  function calculateRelevanceScore(bookmark, query) {
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    let score = 0;

    // 标题完全匹配
    if (title === query) {
      score += 100;
    }
    // 标题开头匹配
    else if (title.startsWith(query)) {
      score += 50;
    }
    // 标题包含查询词
    else if (title.includes(query)) {
      score += 30;
    }
    
    // URL 相关性评分
    if (url.includes(query)) {
      score += 20;
    }

    // 词组匹配（支持多个关键词搜索）
    const keywords = query.split(/\s+/);
    if (keywords.length > 1) {
      const matchedKeywords = keywords.filter(keyword => 
        title.includes(keyword) || url.includes(keyword)
      );
      score += (matchedKeywords.length / keywords.length) * 25;
    }

    // 根据标题长度调整得分（优先显示较短的标题）
    score = score * (1 - (title.length / 1000));

    return score;
  }

  // 显示书签
  function displayBookmarks(results) {
    bookmarks = results.filter(bookmark => bookmark.url); // 只保留有URL的书签
    bookmarkList.innerHTML = '';
    selectedIndex = -1; // 重置选中索引
    
    bookmarks.forEach((bookmark, index) => {
      const bookmarkItem = document.createElement('div');
      bookmarkItem.className = 'bookmark-item';
      
      // 高亮匹配的文本
      const highlightedTitle = highlightText(bookmark.title, searchInput.value);
      const highlightedUrl = highlightText(bookmark.url, searchInput.value);
      
      bookmarkItem.innerHTML = `
        <div class="bookmark-title">${highlightedTitle}</div>
        <div class="bookmark-url">${highlightedUrl}</div>
      `;
      
      bookmarkItem.addEventListener('click', () => openBookmark(index));
      bookmarkItem.addEventListener('mouseover', () => {
        selectedIndex = index;
        updateSelection();
      });
      
      bookmarkList.appendChild(bookmarkItem);
    });

    // 如果有搜索结果，默认选中第一项
    if (bookmarks.length > 0) {
      selectedIndex = 0;
      updateSelection();
    }
  }

  // 高亮匹配的文本
  function highlightText(text, query) {
    if (!query.trim()) return text;
    
    const keywords = query.toLowerCase().split(/\s+/);
    let highlightedText = text;
    
    keywords.forEach(keyword => {
      if (!keyword) return;
      
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
    });
    
    return highlightedText;
  }
  
  function openBookmark(index) {
    if (bookmarks[index] && bookmarks[index].url) {
      chrome.tabs.create({ url: bookmarks[index].url });
      window.close();
    }
  }
  
  function updateSelection() {
    const items = bookmarkList.getElementsByClassName('bookmark-item');
    
    // 移除所有选中状态
    Array.from(items).forEach(item => {
      item.classList.remove('selected');
    });
    
    // 添加新的选中状态
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].classList.add('selected');
      
      // 确保选中项可见
      items[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }
  
  // 处理键盘事件
  document.addEventListener('keydown', function(e) {
    const items = bookmarkList.getElementsByClassName('bookmark-item');
    const itemCount = items.length;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (itemCount > 0) {
          selectedIndex = (selectedIndex + 1) % itemCount;
          updateSelection();
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (itemCount > 0) {
          selectedIndex = selectedIndex < 0 ? itemCount - 1 : 
                         (selectedIndex - 1 + itemCount) % itemCount;
          updateSelection();
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < bookmarks.length) {
          openBookmark(selectedIndex);
        } else if (bookmarks.length > 0) {
          // 如果没有选中项但有搜索结果，打开第一个
          openBookmark(0);
        }
        break;
        
      case 'Escape':
        window.close();
        break;
    }
  });
  
  searchInput.addEventListener('input', function(e) {
    searchBookmarks(e.target.value);
  });
  
  // 初始加载显示所有书签
  searchBookmarks('');
}); 