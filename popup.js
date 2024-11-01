document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  const bookmarkList = document.getElementById('bookmarkList');
  const openBookmarksButton = document.getElementById('openBookmarksButton');
  let selectedIndex = -1;
  let bookmarks = [];
  let isKeyboardNavigation = false;

  // 添加按钮点击事件
  openBookmarksButton.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://bookmarks/' });
    window.close();
  });

  // 确保搜索框获得焦点
  function focusSearchInput() {
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }
  
  focusSearchInput();
  window.addEventListener('load', () => setTimeout(focusSearchInput, 100));
  window.addEventListener('focus', focusSearchInput);

  // 加载插件的书签点击历史
  async function loadBookmarkHistory() {
    const { bookmarkHistory = [] } = await chrome.storage.local.get('bookmarkHistory');
    bookmarks = bookmarkHistory;
    displayBookmarks(bookmarks);
  }

  // 记录书签点击
  async function recordBookmarkClick(bookmark) {
    const { bookmarkHistory = [] } = await chrome.storage.local.get('bookmarkHistory');
    
    // 查找是否已存在该书签
    const existingIndex = bookmarkHistory.findIndex(item => item.url === bookmark.url);
    const now = new Date().getTime();
    
    if (existingIndex !== -1) {
      // 更新现有记录
      bookmarkHistory[existingIndex] = {
        ...bookmark,
        lastClickTime: now,
        clickCount: (bookmarkHistory[existingIndex].clickCount || 0) + 1
      };
    } else {
      // 添加新记录
      bookmarkHistory.unshift({
        ...bookmark,
        lastClickTime: now,
        clickCount: 1
      });
    }

    // 只保留最近的100条记录
    const updatedHistory = bookmarkHistory
      .sort((a, b) => b.lastClickTime - a.lastClickTime)
      .slice(0, 100);

    // 保存更新后的历史
    await chrome.storage.local.set({ bookmarkHistory: updatedHistory });
  }

  // 统一处理书签打开操作
  async function openBookmark(bookmark) {
    if (!bookmark || !bookmark.url) return;
    
    await recordBookmarkClick(bookmark);
    chrome.tabs.create({ url: bookmark.url });
    window.close();
  }

  // 显示书签列表
  function displayBookmarks(results) {
    bookmarks = results;
    bookmarkList.innerHTML = '';
    
    bookmarks.forEach((bookmark, index) => {
      const bookmarkItem = document.createElement('div');
      bookmarkItem.className = 'bookmark-item';
      
      const lastClickDate = bookmark.lastClickTime ? 
        new Date(bookmark.lastClickTime).toLocaleString() : '';
      
      bookmarkItem.innerHTML = `
        <div class="bookmark-index">${index + 1}.</div>
        <div class="bookmark-content">
          <div class="bookmark-title">${bookmark.title}</div>
          <div class="bookmark-url">${bookmark.url}</div>
          <div class="bookmark-meta">
            上次点击: ${lastClickDate}
            ${bookmark.clickCount ? `· 点击次数: ${bookmark.clickCount}` : ''}
          </div>
        </div>
      `;
      
      bookmarkItem.addEventListener('click', () => openBookmark(bookmark));
      
      bookmarkItem.addEventListener('mouseover', () => {
        if (!isKeyboardNavigation) {
          selectedIndex = index;
          updateSelection();
        }
      });

      bookmarkItem.addEventListener('mouseout', () => {
        isKeyboardNavigation = false;
      });
      
      bookmarkList.appendChild(bookmarkItem);
    });

    if (bookmarks.length > 0) {
      selectedIndex = 0;
      updateSelection();
    }
  }

  // 搜索书签
  function searchBookmarks(query) {
    if (!query.trim()) {
      loadBookmarkHistory();
      return;
    }

    chrome.bookmarks.search(query, function(results) {
      const bookmarkResults = results.filter(bookmark => bookmark.url);
      bookmarks = bookmarkResults;
      displayBookmarks(bookmarks);
    });
  }

  // 更新选中状态
  function updateSelection() {
    const items = bookmarkList.getElementsByClassName('bookmark-item');
    Array.from(items).forEach(item => item.classList.remove('selected'));
    
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].classList.add('selected');
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  // 处理键盘事件
  document.addEventListener('keydown', function(e) {
    // 获取当前实际显示的列表项数量
    const items = bookmarkList.getElementsByClassName('bookmark-item');
    const itemCount = items.length;
    
    if (itemCount === 0) return;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        isKeyboardNavigation = true;
        // 使用实际的列表项数量
        selectedIndex = (selectedIndex + 1) % itemCount;
        updateSelection();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        isKeyboardNavigation = true;
        selectedIndex = selectedIndex < 0 ? itemCount - 1 : 
                       (selectedIndex - 1 + itemCount) % itemCount;
        updateSelection();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < itemCount) {
          openBookmark(bookmarks[selectedIndex]);
        }
        break;
        
      case 'Escape':
        window.close();
        break;
    }
  });

  // 监听搜索输入
  searchInput.addEventListener('input', (e) => {
    searchBookmarks(e.target.value);
  });

  // 初始加载历史记录
  loadBookmarkHistory();
}); 